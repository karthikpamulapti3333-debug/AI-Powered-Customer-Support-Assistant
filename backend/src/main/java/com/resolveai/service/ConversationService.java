package com.resolveai.service;

import com.resolveai.dto.*;
import com.resolveai.model.*;
import com.resolveai.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ConversationService {
    private static final Logger logger = LoggerFactory.getLogger(ConversationService.class);

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ConversationAnalysisRepository conversationAnalysisRepository;

    @Autowired
    private KnowledgeGapRepository knowledgeGapRepository;

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private AIServiceClient aiServiceClient;

    @Autowired
    private AuditLogService auditLogService;

    @Transactional
    public Conversation startConversation(User customer) {
        Conversation conversation = Conversation.builder()
                .customer(customer)
                .status("ACTIVE")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        conversation = conversationRepository.save(conversation);
        auditLogService.logAction(customer, "START_CONVERSATION", "CONVERSATION", conversation.getId(),
                "Started new AI chatbot conversation.");
        return conversation;
    }

    public List<Conversation> getConversationsForCustomer(User customer) {
        return conversationRepository.findByCustomerIdOrderByUpdatedAtDesc(customer.getId());
    }

    public Optional<Conversation> getConversationById(Long id) {
        return conversationRepository.findById(id);
    }

    public List<Message> getMessages(Long conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    @Transactional
    public Message postMessage(Long conversationId, String messageText, User customer) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        if (!conversation.getCustomer().getId().equals(customer.getId())) {
            throw new RuntimeException("Unauthorized: Conversation belongs to another user");
        }

        // Update status back to ACTIVE if it was resolved but user chats again
        if (conversation.getStatus().equals("RESOLVED") || conversation.getStatus().equals("CLOSED")) {
            conversation.setStatus("ACTIVE");
        }

        // 1. Save customer's message
        Message customerMessage = Message.builder()
                .conversation(conversation)
                .senderRole("CUSTOMER")
                .messageText(messageText)
                .isAi(false)
                .createdAt(LocalDateTime.now())
                .build();
        messageRepository.save(customerMessage);

        // 2. Fetch history (limit context window to last 5 messages to optimize prompt size)
        List<Message> fullHistory = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        List<ChatRequest.ChatMessageDto> historyDto = fullHistory.stream()
                .skip(Math.max(0, fullHistory.size() - 6)) // Get last 5 messages + current one
                .filter(m -> !m.getId().equals(customerMessage.getId())) // Skip current message from history list
                .map(m -> ChatRequest.ChatMessageDto.builder()
                        .role(m.getSenderRole().toLowerCase().equals("customer") ? "user" : "assistant")
                        .content(m.getMessageText())
                        .build())
                .collect(Collectors.toList());

        // 3. Call AI Service for chatbot reply
        ChatResponse aiResult = aiServiceClient.chatWithAI(conversationId, messageText, historyDto);

        // 4. Determine if Escalation is required
        boolean shouldEscalate = messageText.equals("Please escalate this issue to a human agent and create a ticket immediately.");
        if (!shouldEscalate && (messageText.equalsIgnoreCase("yes") || messageText.toLowerCase().contains("create a ticket") || messageText.toLowerCase().contains("open a ticket")) && !historyDto.isEmpty()) {
            String lastAiMsg = historyDto.get(historyDto.size() - 1).getContent();
            if (lastAiMsg.contains("create a support ticket") || lastAiMsg.contains("open a support ticket") || lastAiMsg.contains("Talk to Agent")) {
                shouldEscalate = true;
            }
        }

        // Check if a ticket has already been opened for this conversation
        List<Complaint> existing = complaintRepository.findAll().stream()
                .filter(c -> c.getConversation() != null && c.getConversation().getId().equals(conversationId))
                .collect(Collectors.toList());

        if (shouldEscalate && !existing.isEmpty()) {
            // Already escalated previously, allow normal AI conversation to proceed
            shouldEscalate = false;
        }

        Message aiMessage;
        if (shouldEscalate) {
            logger.warn("Escalating conversation {} due to risk score {} or explicit request", 
                    conversationId, aiResult.getEscalationRisk());

            Complaint ticket;
            // Create ticket using the customer's query
            String ticketTitle = "AI Escalated: " + (messageText.length() > 50 ? messageText.substring(0, 47) + "..." : messageText);
            ticket = complaintService.createComplaint(ticketTitle, "This ticket was auto-escalated from a chatbot conversation. Last customer query: " + messageText, customer);
            ticket.setConversation(conversation);
            complaintRepository.save(ticket);

            conversation.setStatus("COMPLAINT_CREATED");
            
            String responseText = aiResult.getAnswer() + "\n\n[System Note: I have automatically created a support ticket (Ticket ID: CMP-" 
                    + ticket.getId() + ") for deeper assistance. You can keep chatting with me here, or wait for our human agent to contact you shortly.]";

            aiMessage = Message.builder()
                    .conversation(conversation)
                    .senderRole("AI")
                    .messageText(responseText)
                    .isAi(true)
                    .intent(aiResult.getIntent())
                    .confidence(aiResult.getConfidence())
                    .sentiment(aiResult.getSentiment())
                    .priority(aiResult.getPriority())
                    .escalationRisk(aiResult.getEscalationRisk())
                    .requiresHuman(true)
                    .sources(aiResult.getSources() != null ? String.join(", ", aiResult.getSources()) : null)
                    .createdAt(LocalDateTime.now())
                    .build();

            // Save conversation analysis
            saveConversationAnalysis(conversation, aiResult, "Auto-escalated customer conversation due to complex request.");

            // Log Knowledge Gap if AI was unable to solve due to document gap
            if (aiResult.getSources() == null || aiResult.getSources().isEmpty() || aiResult.getConfidence() < 0.6) {
                KnowledgeGap gap = KnowledgeGap.builder()
                        .queryText(messageText)
                        .reason("LOW_CONFIDENCE")
                        .checkedAt(LocalDateTime.now())
                        .resolved(false)
                        .build();
                knowledgeGapRepository.save(gap);
            }
        } else {
            // Standard AI Response
            aiMessage = Message.builder()
                    .conversation(conversation)
                    .senderRole("AI")
                    .messageText(aiResult.getAnswer())
                    .isAi(true)
                    .intent(aiResult.getIntent())
                    .confidence(aiResult.getConfidence())
                    .sentiment(aiResult.getSentiment())
                    .priority(aiResult.getPriority())
                    .escalationRisk(aiResult.getEscalationRisk())
                    .requiresHuman(false)
                    .sources(aiResult.getSources() != null ? String.join(", ", aiResult.getSources()) : null)
                    .createdAt(LocalDateTime.now())
                    .build();
        }

        messageRepository.save(aiMessage);

        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        return aiMessage;
    }

    @Transactional
    public void submitConversationFeedback(Long conversationId, int rating, String comment, User customer) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        conversation.setStatus("RESOLVED");
        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        // If feedback is unhelpful (rating < 3), log a Knowledge Gap
        if (rating < 3) {
            List<Message> msgs = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
            String lastCustomerQuery = "";
            for (int i = msgs.size() - 1; i >= 0; i--) {
                if (msgs.get(i).getSenderRole().equals("CUSTOMER")) {
                    lastCustomerQuery = msgs.get(i).getMessageText();
                    break;
                }
            }
            KnowledgeGap gap = KnowledgeGap.builder()
                    .queryText(lastCustomerQuery)
                    .reason("UNHELPFUL_FEEDBACK")
                    .checkedAt(LocalDateTime.now())
                    .resolved(false)
                    .build();
            knowledgeGapRepository.save(gap);
        }

        auditLogService.logAction(customer, "SUBMIT_CHAT_FEEDBACK", "CONVERSATION", conversationId,
                "Rated chatbot helpfulness: " + rating + "/5 stars. Comment: " + comment);
    }

    private void saveConversationAnalysis(Conversation conversation, ChatResponse aiResult, String summaryText) {
        ConversationAnalysis analysis = conversationAnalysisRepository.findByConversationId(conversation.getId())
                .orElse(ConversationAnalysis.builder().conversation(conversation).build());

        analysis.setSummary(summaryText);
        analysis.setIntent(aiResult.getIntent());
        analysis.setSentiment(aiResult.getSentiment());
        analysis.setPriority(aiResult.getPriority());
        analysis.setEscalationRisk(aiResult.getEscalationRisk());
        analysis.setRecommendedActions("Address duplicate/failed charges or security breaches immediately. Check transactions.");
        analysis.setAnalyzedAt(LocalDateTime.now());

        conversationAnalysisRepository.save(analysis);
    }

    @Transactional
    public void deleteConversation(Long conversationId) {
        logger.info("Deleting conversation ID: {}", conversationId);
        
        // 1. Delete all messages associated with this conversation
        messageRepository.deleteByConversationId(conversationId);
        
        // 2. Disassociate complaints
        List<Complaint> complaints = complaintRepository.findAll().stream()
                .filter(c -> c.getConversation() != null && c.getConversation().getId().equals(conversationId))
                .collect(Collectors.toList());
        for (Complaint c : complaints) {
            c.setConversation(null);
            complaintRepository.save(c);
        }
        
        // 3. Delete conversation analysis if it exists
        conversationAnalysisRepository.findByConversationId(conversationId).ifPresent(analysis -> {
            conversationAnalysisRepository.delete(analysis);
        });
        
        // 4. Delete the conversation itself
        conversationRepository.deleteById(conversationId);
    }
}
