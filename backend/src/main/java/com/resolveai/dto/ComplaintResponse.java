package com.resolveai.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class ComplaintResponse {
    private Long id;
    private String title;
    private String description;
    private String status;
    private String priority;
    private Long conversationId;
    
    // Customer info
    private Long customerId;
    private String customerUsername;
    private String customerEmail;
    private String customerFullName;

    // Category info
    private Long categoryId;
    private String categoryName;
    private String categoryDisplayName;

    // Agent assignee info
    private Long assignedAgentId;
    private String assignedAgentName;

    // Department assignee info
    private Long assignedDepartmentId;
    private String assignedDepartmentName;

    // SLA & Dates
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;
    private LocalDateTime slaDeadline;
    private String escalationStatus;

    // Derived SLA statuses
    private Long slaRemainingMinutes;
    private Boolean slaBreached;

    // AI Analysis result
    private AnalysisDto analysis;

    @Getter
    @Setter
    @Builder
    public static class AnalysisDto {
        private String category;
        private String intent;
        private String sentiment;
        private String priority;
        private Double escalationRisk;
        private String rootCause;
        private Double confidenceScore;
        private List<String> recommendedActions;
        private LocalDateTime analyzedAt;
    }
}
