package com.resolveai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatResponse {
    private String answer;
    private String intent;
    private Double confidence;
    private List<String> sources;
    private Boolean requiresHuman;
    private String sentiment;
    private String priority;
    private Double escalationRisk;
}
