package com.resolveai.service;

import com.resolveai.dto.AIAnalysisResponse;
import com.resolveai.dto.ComplaintResponse;
import com.resolveai.dto.FeedbackRequest;
import com.resolveai.exception.BadRequestException;
import com.resolveai.exception.ResourceNotFoundException;
import com.resolveai.model.*;
import com.resolveai.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private ComplaintCategoryRepository categoryRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private ComplaintAnalysisRepository analysisRepository;

    @Autowired
    private ComplaintHistoryRepository historyRepository;

    @Autowired
    private ComplaintCommentRepository commentRepository;

    @Autowired
    private CustomerFeedbackRepository feedbackRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SLARuleRepository slaRuleRepository;

    @Autowired
    private AIServiceClient aiServiceClient;

    @Autowired
    private NotificationService notificationService;

    @Transactional
    public Complaint createComplaint(String title, String description, User customer) {
        // 1. Save complaint in database with status NEW
        Complaint complaint = Complaint.builder()
                .title(title)
                .description(description)
                .status("NEW")
                .priority("MEDIUM")
                .customer(customer)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .escalationStatus("NONE")
                .build();

        complaint = complaintRepository.save(complaint);
        logHistory(complaint, customer, "SUBMITTED", null, "NEW", "Complaint submitted by customer");

        // 2. Set status to ANALYZING
        complaint.setStatus("ANALYZING");
        complaint = complaintRepository.save(complaint);
        logHistory(complaint, customer, "AI_ANALYSIS_START", "NEW", "ANALYZING", "Initiating AI classification and sentiment analysis");

        try {
            // 3. Send complaint text to Python AI Service
            AIAnalysisResponse aiResult = aiServiceClient.analyzeComplaint(complaint.getId(), title, description);

            // 4. Save AI Analysis in database
            ComplaintAnalysis analysis = ComplaintAnalysis.builder()
                    .complaint(complaint)
                    .category(aiResult.getCategory())
                    .intent(aiResult.getIntent())
                    .sentiment(aiResult.getSentiment())
                    .priority(aiResult.getPriority())
                    .escalationRisk(aiResult.getEscalationRisk())
                    .rootCause(aiResult.getRootCause())
                    .confidenceScore(aiResult.getConfidenceScore())
                    .recommendedActions(String.join("\n", aiResult.getRecommendedActions()))
                    .analyzedAt(LocalDateTime.now())
                    .build();
            analysisRepository.save(analysis);

            // 5. Update complaint properties based on AI insights
            complaint.setPriority(aiResult.getPriority() != null ? aiResult.getPriority() : "MEDIUM");

            // Category assignment
            Optional<ComplaintCategory> catOpt = categoryRepository.findByName(aiResult.getCategory());
            if (catOpt.isPresent()) {
                complaint.setCategory(catOpt.get());
            } else {
                // Fallback to OTHER category
                categoryRepository.findByName("OTHER").ifPresent(complaint::setCategory);
            }

            // SLA Deadline calculation
            SLARule slaRule = slaRuleRepository.findByPriority(complaint.getPriority())
                    .orElse(null);
            int hours = slaRule != null ? slaRule.getResolutionTimeHours() : 48;
            complaint.setSlaDeadline(LocalDateTime.now().plusHours(hours));

            // Escalation Risk check (escalationRisk >= 0.80 -> HIGH_RISK)
            if (aiResult.getEscalationRisk() != null && aiResult.getEscalationRisk() >= 0.80) {
                complaint.setEscalationStatus("HIGH_RISK");
                // Notify managers
                notifyManagers("High-Risk Complaint Alert", 
                        "Complaint CMP-" + complaint.getId() + " is flagged as HIGH RISK (" + 
                                Math.round(aiResult.getEscalationRisk() * 100) + "% risk score).", 
                        complaint.getId());
            }

            // Department Assignment mapping
            String deptName = mapCategoryToDepartment(aiResult.getCategory());
            Department dept = departmentRepository.findByName(deptName)
                    .orElseGet(() -> departmentRepository.findByName("General Support").orElse(null));
            complaint.setAssignedDepartment(dept);

            // 6. Auto-route Load Balancing assignment to agent
            Agent assignedAgent = null;
            if (dept != null) {
                List<Agent> availableAgents = agentRepository.findByDepartmentIdAndStatus(dept.getId(), "AVAILABLE");
                if (!availableAgents.isEmpty()) {
                    // Sort by load (current_complaints_count) ascending
                    availableAgents.sort(Comparator.comparingInt(Agent::getCurrentComplaintsCount));
                    assignedAgent = availableAgents.get(0);
                }
            }

            // Fallback: If no agent is available in the specific department, assign to ANY available agent in the system
            if (assignedAgent == null) {
                List<Agent> anyAvailableAgents = agentRepository.findByStatus("AVAILABLE");
                if (!anyAvailableAgents.isEmpty()) {
                    anyAvailableAgents.sort(Comparator.comparingInt(Agent::getCurrentComplaintsCount));
                    assignedAgent = anyAvailableAgents.get(0);
                    // Update department to match the fallback agent's department
                    if (assignedAgent.getDepartment() != null) {
                        dept = assignedAgent.getDepartment();
                        complaint.setAssignedDepartment(dept);
                    }
                }
            }

            if (assignedAgent != null) {
                complaint.setAssignedAgent(assignedAgent);
                complaint.setStatus("ASSIGNED");

                // Increment agent load count
                assignedAgent.setCurrentComplaintsCount(assignedAgent.getCurrentComplaintsCount() + 1);
                agentRepository.save(assignedAgent);

                logHistory(complaint, customer, "AUTO_ASSIGNED", "ANALYZING", "ASSIGNED", 
                        "Ticket auto-assigned to agent " + assignedAgent.getUser().getFirstName() + " " + assignedAgent.getUser().getLastName() + " in " + (dept != null ? dept.getName() : "Support"));
                
                // Notify Agent
                notificationService.createNotification(assignedAgent.getUser(), "New Ticket Assigned", 
                        "Complaint CMP-" + complaint.getId() + " has been assigned to you.", 
                        "ASSIGNED", complaint.getId());
            } else {
                complaint.setStatus("NEW"); // Stays NEW under department if no agent is active in the entire system
                logHistory(complaint, customer, "PENDING_ASSIGNMENT", "ANALYZING", "NEW", 
                        "AI analysis complete. Awaiting manual assignment in department: " + (dept != null ? dept.getName() : "General Support"));
            }

            complaint.setUpdatedAt(LocalDateTime.now());
            complaint = complaintRepository.save(complaint);

            // Notify Customer
            notificationService.createNotification(customer, "Complaint Submitted", 
                    "Your complaint CMP-" + complaint.getId() + " has been successfully submitted and analyzed by AI.", 
                    "COMPLAINT_CREATED", complaint.getId());

        } catch (Exception e) {
            // Rollback status to NEW so a human agent can handle it if AI fails
            complaint.setStatus("NEW");
            complaint = complaintRepository.save(complaint);
            logHistory(complaint, customer, "AI_ANALYSIS_FAILED", "ANALYZING", "NEW", 
                    "AI Analysis failed: " + e.getMessage() + ". Defaulting to manual triage.");
            
            // Notify managers of integration failure
            notifyManagers("AI Service Offline Alert", 
                    "AI Analysis failed for ticket CMP-" + complaint.getId() + ". Triage has reverted to manual.", 
                    complaint.getId());
        }

        return complaint;
    }

    @Transactional
    public Complaint assignComplaint(Long complaintId, Long agentId, User manager) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));
        Agent newAgent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found"));

        Agent oldAgent = complaint.getAssignedAgent();
        String prevStatus = complaint.getStatus();

        // Workload update for old agent
        if (oldAgent != null && (prevStatus.equals("ASSIGNED") || prevStatus.equals("IN_PROGRESS") || prevStatus.equals("ESCALATED"))) {
            oldAgent.setCurrentComplaintsCount(Math.max(0, oldAgent.getCurrentComplaintsCount() - 1));
            agentRepository.save(oldAgent);
        }

        // Assign new agent
        complaint.setAssignedAgent(newAgent);
        complaint.setAssignedDepartment(newAgent.getDepartment());
        complaint.setStatus("ASSIGNED");
        complaint.setUpdatedAt(LocalDateTime.now());

        // Workload update for new agent
        newAgent.setCurrentComplaintsCount(newAgent.getCurrentComplaintsCount() + 1);
        agentRepository.save(newAgent);

        complaint = complaintRepository.save(complaint);

        logHistory(complaint, manager, "REASSIGNED", prevStatus, "ASSIGNED", 
                "Ticket manually assigned to agent " + newAgent.getUser().getFirstName() + " " + newAgent.getUser().getLastName() + " by manager " + manager.getUsername());

        // Notify new agent
        notificationService.createNotification(newAgent.getUser(), "New Ticket Assigned", 
                "Complaint CMP-" + complaint.getId() + " has been assigned to you.", 
                "ASSIGNED", complaint.getId());

        // Notify customer
        notificationService.createNotification(complaint.getCustomer(), "Ticket Assigned", 
                "Your complaint CMP-" + complaint.getId() + " is assigned to agent " + newAgent.getUser().getFirstName() + ".", 
                "COMPLAINT_ASSIGNED", complaint.getId());

        return complaint;
    }

    @Transactional
    public Complaint updateComplaintStatus(Long complaintId, String newStatus, User actor) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));
        String oldStatus = complaint.getStatus();

        if (oldStatus.equals(newStatus)) {
            return complaint;
        }

        complaint.setStatus(newStatus.toUpperCase());
        complaint.setUpdatedAt(LocalDateTime.now());

        // Log times based on status
        if (newStatus.equalsIgnoreCase("RESOLVED")) {
            complaint.setResolvedAt(LocalDateTime.now());
            // Decrement agent load
            Agent agent = complaint.getAssignedAgent();
            if (agent != null) {
                agent.setCurrentComplaintsCount(Math.max(0, agent.getCurrentComplaintsCount() - 1));
                agentRepository.save(agent);
            }
            // Notify customer
            notificationService.createNotification(complaint.getCustomer(), "Complaint Resolved", 
                    "Your complaint CMP-" + complaint.getId() + " has been resolved. Please review and provide feedback.", 
                    "COMPLAINT_RESOLVED", complaint.getId());
        } else if (newStatus.equalsIgnoreCase("CLOSED")) {
            complaint.setClosedAt(LocalDateTime.now());
            // If closed directly and load wasn't decremented (e.g. from ASSIGNED/IN_PROGRESS)
            if (!oldStatus.equalsIgnoreCase("RESOLVED")) {
                Agent agent = complaint.getAssignedAgent();
                if (agent != null) {
                    agent.setCurrentComplaintsCount(Math.max(0, agent.getCurrentComplaintsCount() - 1));
                    agentRepository.save(agent);
                }
            }
            // Notify customer
            notificationService.createNotification(complaint.getCustomer(), "Complaint Closed", 
                    "Your complaint CMP-" + complaint.getId() + " has been officially closed.", 
                    "COMPLAINT_CLOSED", complaint.getId());
        }

        complaint = complaintRepository.save(complaint);
        logHistory(complaint, actor, "STATUS_CHANGE", oldStatus, newStatus, "Status updated by " + actor.getUsername());

        return complaint;
    }

    @Transactional
    public ComplaintComment addComment(Long complaintId, String commentText, Boolean isInternal, User author) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));

        ComplaintComment comment = ComplaintComment.builder()
                .complaint(complaint)
                .user(author)
                .commentText(commentText)
                .isInternal(isInternal)
                .createdAt(LocalDateTime.now())
                .build();

        comment = commentRepository.save(comment);

        // Ticket state transitions based on comments
        String oldStatus = complaint.getStatus();
        // If customer comments and ticket was waiting for them, toggle to IN_PROGRESS
        boolean isCustomer = author.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_CUSTOMER"));
        if (isCustomer && oldStatus.equalsIgnoreCase("WAITING_FOR_CUSTOMER")) {
            complaint.setStatus("IN_PROGRESS");
            complaint.setUpdatedAt(LocalDateTime.now());
            complaintRepository.save(complaint);
            logHistory(complaint, author, "STATUS_CHANGE", "WAITING_FOR_CUSTOMER", "IN_PROGRESS", "Customer replied. Reverting status to In Progress.");
            
            // Notify Agent
            Agent agent = complaint.getAssignedAgent();
            if (agent != null) {
                notificationService.createNotification(agent.getUser(), "Customer Replied", 
                        "Customer has commented on ticket CMP-" + complaint.getId() + ".", 
                        "CUSTOMER_REPLY", complaint.getId());
            }
        }

        return comment;
    }

    @Transactional
    public CustomerFeedback submitFeedback(Long complaintId, FeedbackRequest request, User customer) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));

        if (!complaint.getCustomer().getId().equals(customer.getId())) {
            throw new BadRequestException("You can only submit feedback for your own complaints.");
        }

        CustomerFeedback feedback = CustomerFeedback.builder()
                .complaint(complaint)
                .customer(customer)
                .rating(request.getRating())
                .comments(request.getComments())
                .createdAt(LocalDateTime.now())
                .build();

        feedback = feedbackRepository.save(feedback);

        // Update complaint state to CLOSED after feedback
        String oldStatus = complaint.getStatus();
        complaint.setStatus("CLOSED");
        complaint.setClosedAt(LocalDateTime.now());
        complaint.setUpdatedAt(LocalDateTime.now());
        complaintRepository.save(complaint);

        logHistory(complaint, customer, "FEEDBACK_SUBMITTED", oldStatus, "CLOSED", 
                "Feedback submitted (Rating: " + request.getRating() + "/5). Ticket closed.");

        return feedback;
    }

    @Transactional
    public Complaint escalateComplaint(Long complaintId, String comments, User actor) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));
        
        String oldStatus = complaint.getStatus();
        complaint.setStatus("ESCALATED");
        complaint.setEscalationStatus("ESCALATED");
        complaint.setUpdatedAt(LocalDateTime.now());
        complaint = complaintRepository.save(complaint);

        logHistory(complaint, actor, "ESCALATED", oldStatus, "ESCALATED", "Complaint escalated. Note: " + comments);

        // Notify managers
        notifyManagers("Ticket Escalated", 
                "Complaint CMP-" + complaint.getId() + " has been manually escalated by " + actor.getUsername() + ".", 
                complaint.getId());

        return complaint;
    }

    // Helper: Category to Department Mapper
    private String mapCategoryToDepartment(String category) {
        return switch (category.toUpperCase()) {
            case "PAYMENT", "REFUND" -> "Billing & Payments";
            case "DELIVERY" -> "Logistics & Delivery";
            case "PRODUCT" -> "Product Quality & Support";
            case "ACCOUNT" -> "Account Management";
            case "TECHNICAL" -> "Technical Operations";
            case "SECURITY" -> "Account Security";
            default -> "General Support";
        };
    }

    // Helper: Log audit history
    private void logHistory(Complaint complaint, User changedBy, String action, String prevStatus, String newStatus, String comment) {
        ComplaintHistory history = ComplaintHistory.builder()
                .complaint(complaint)
                .changedBy(changedBy)
                .action(action)
                .previousStatus(prevStatus)
                .newStatus(newStatus)
                .comment(comment)
                .createdAt(LocalDateTime.now())
                .build();
        historyRepository.save(history);
    }

    // Helper: Notify all Managers
    private void notifyManagers(String title, String message, Long complaintId) {
        List<User> managers = userRepository.findAll().stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_MANAGER") || r.getName().equals("ROLE_ADMIN")))
                .collect(Collectors.toList());
        for (User m : managers) {
            notificationService.createNotification(m, title, message, "ESCALATED", complaintId);
        }
    }

    // DTO Conversion mapper
    public ComplaintResponse convertToResponse(Complaint c) {
        ComplaintAnalysis analysis = analysisRepository.findByComplaintId(c.getId()).orElse(null);
        ComplaintResponse.AnalysisDto analysisDto = null;
        
        if (analysis != null) {
            List<String> actions = analysis.getRecommendedActions() != null 
                    ? Arrays.asList(analysis.getRecommendedActions().split("\n")) 
                    : Collections.emptyList();
            
            analysisDto = ComplaintResponse.AnalysisDto.builder()
                    .category(analysis.getCategory())
                    .intent(analysis.getIntent())
                    .sentiment(analysis.getSentiment())
                    .priority(analysis.getPriority())
                    .escalationRisk(analysis.getEscalationRisk())
                    .rootCause(analysis.getRootCause())
                    .confidenceScore(analysis.getConfidenceScore())
                    .recommendedActions(actions)
                    .analyzedAt(analysis.getAnalyzedAt())
                    .build();
        }

        Long remainingMin = null;
        Boolean isBreached = false;
        if (c.getSlaDeadline() != null) {
            if (c.getResolvedAt() != null) {
                isBreached = c.getResolvedAt().isAfter(c.getSlaDeadline());
            } else if (c.getClosedAt() != null) {
                isBreached = c.getClosedAt().isAfter(c.getSlaDeadline());
            } else {
                Duration duration = Duration.between(LocalDateTime.now(), c.getSlaDeadline());
                remainingMin = duration.toMinutes();
                isBreached = LocalDateTime.now().isAfter(c.getSlaDeadline());
            }
        }

        return ComplaintResponse.builder()
                .id(c.getId())
                .title(c.getTitle())
                .description(c.getDescription())
                .status(c.getStatus())
                .priority(c.getPriority())
                .conversationId(c.getConversation() != null ? c.getConversation().getId() : null)
                .customerId(c.getCustomer().getId())
                .customerUsername(c.getCustomer().getUsername())
                .customerEmail(c.getCustomer().getEmail())
                .customerFullName((c.getCustomer().getFirstName() != null ? c.getCustomer().getFirstName() : "") + " " + 
                                   (c.getCustomer().getLastName() != null ? c.getCustomer().getLastName() : ""))
                .categoryId(c.getCategory() != null ? c.getCategory().getId() : null)
                .categoryName(c.getCategory() != null ? c.getCategory().getName() : null)
                .categoryDisplayName(c.getCategory() != null ? c.getCategory().getDisplayName() : null)
                .assignedAgentId(c.getAssignedAgent() != null ? c.getAssignedAgent().getId() : null)
                .assignedAgentName(c.getAssignedAgent() != null 
                        ? c.getAssignedAgent().getUser().getFirstName() + " " + c.getAssignedAgent().getUser().getLastName() 
                        : null)
                .assignedDepartmentId(c.getAssignedDepartment() != null ? c.getAssignedDepartment().getId() : null)
                .assignedDepartmentName(c.getAssignedDepartment() != null ? c.getAssignedDepartment().getName() : null)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .resolvedAt(c.getResolvedAt())
                .closedAt(c.getClosedAt())
                .slaDeadline(c.getSlaDeadline())
                .escalationStatus(c.getEscalationStatus())
                .slaRemainingMinutes(remainingMin)
                .slaBreached(isBreached)
                .analysis(analysisDto)
                .build();
    }
}
