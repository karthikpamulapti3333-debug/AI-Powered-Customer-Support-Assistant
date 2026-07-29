package com.resolveai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaint_analysis")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "complaint_id", nullable = false, unique = true)
    private Complaint complaint;

    private String category;
    private String intent;
    private String sentiment;
    private String priority;

    @Column(name = "escalation_risk")
    private Double escalationRisk;

    @Column(name = "root_cause")
    private String rootCause;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Column(name = "recommended_actions", columnDefinition = "TEXT")
    private String recommendedActions; // Stored as comma-separated or JSON string

    @Column(name = "analyzed_at")
    @Builder.Default
    private LocalDateTime analyzedAt = LocalDateTime.now();
}
