package com.resolveai.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "sla_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SLARule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String priority; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "resolution_time_hours", nullable = false)
    private Integer resolutionTimeHours;

    @Column(name = "warning_time_hours", nullable = false)
    private Integer warningTimeHours;
}
