package com.resolveai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversation_analysis")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false, unique = true)
    private Conversation conversation;

    @Column(columnDefinition = "TEXT")
    private String summary;

    private String intent;
    private String sentiment;
    private String priority;

    @Column(name = "escalation_risk")
    private Double escalationRisk;

    @Column(name = "root_cause")
    private String rootCause;

    @Column(name = "recommended_actions", columnDefinition = "TEXT")
    private String recommendedActions;

    @Column(name = "analyzed_at")
    @Builder.Default
    private LocalDateTime analyzedAt = LocalDateTime.now();
}
