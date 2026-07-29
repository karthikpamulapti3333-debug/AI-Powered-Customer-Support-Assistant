package com.resolveai.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "knowledge_gaps")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgeGap {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "query_text", nullable = false)
    private String queryText;

    private String reason; // LOW_CONFIDENCE, NO_DOC_FOUND, UNHELPFUL_FEEDBACK, HUMAN_INTERVENT

    @Column(name = "checked_at", updatable = false)
    @Builder.Default
    private LocalDateTime checkedAt = LocalDateTime.now();

    @Builder.Default
    private Boolean resolved = false;
}
