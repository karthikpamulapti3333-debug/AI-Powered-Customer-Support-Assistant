package com.resolveai.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "agents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Agent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "department_id")
    private Department department;

    @Column(length = 50)
    @Builder.Default
    private String status = "AVAILABLE"; // AVAILABLE, BUSY, OFFLINE

    @Column(name = "max_concurrent_complaints")
    @Builder.Default
    private Integer maxConcurrentComplaints = 5;

    @Column(name = "current_complaints_count")
    @Builder.Default
    private Integer currentComplaintsCount = 0;
}
