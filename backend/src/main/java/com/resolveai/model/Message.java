package com.resolveai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @Column(name = "sender_role", nullable = false, length = 50)
    private String senderRole; // CUSTOMER, AI, AGENT

    @Column(name = "message_text", nullable = false, columnDefinition = "TEXT")
    private String messageText;

    @Column(name = "is_ai")
    @Builder.Default
    private Boolean isAi = false;

    private String sentiment;
    private Double confidence;
    private String intent;
    private String priority;

    @Column(name = "escalation_risk")
    private Double escalationRisk;

    @Column(name = "requires_human")
    @Builder.Default
    private Boolean requiresHuman = false;

    @Column(columnDefinition = "TEXT")
    private String sources; // Citations or links to knowledge chunks

    @Column(name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
