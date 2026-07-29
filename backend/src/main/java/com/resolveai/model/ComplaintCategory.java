package com.resolveai.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "complaint_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "display_name", length = 100)
    private String displayName;

    private String description;
}
