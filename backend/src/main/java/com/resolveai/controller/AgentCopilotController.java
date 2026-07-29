package com.resolveai.controller;

import com.resolveai.dto.ChatRequest;
import com.resolveai.dto.CopilotResponse;
import com.resolveai.model.Complaint;
import com.resolveai.model.Conversation;
import com.resolveai.model.Message;
import com.resolveai.exception.ResourceNotFoundException;
import com.resolveai.repository.ComplaintRepository;
import com.resolveai.repository.ConversationRepository;
import com.resolveai.repository.MessageRepository;
import com.resolveai.service.AIServiceClient;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/agent/copilot")
@PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
public class AgentCopilotController {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private AIServiceClient aiServiceClient;

    @GetMapping("/{conversationId}")
    public ResponseEntity<CopilotResponse> getAgentCopilot(@PathVariable Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));

        // Retrieve associated ticket details if any
        Complaint complaint = complaintRepository.findByConversationId(conversationId).orElse(null);
        String title = complaint != null ? complaint.getTitle() : "Support Request";
        String description = complaint != null ? complaint.getDescription() : "AI chat discussion details";

        // Retrieve conversation messages as context
        List<Message> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
        List<ChatRequest.ChatMessageDto> history = messages.stream()
                .map(m -> ChatRequest.ChatMessageDto.builder()
                        .role(m.getSenderRole().toLowerCase().equals("customer") ? "user" : "assistant")
                        .content(m.getMessageText())
                        .build())
                .collect(Collectors.toList());

        CopilotResponse copilot = aiServiceClient.suggestCopilot(title, description, history);
        return ResponseEntity.ok(copilot);
    }
}
