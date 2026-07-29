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
public class CopilotResponse {
    private String summary;
    private String intent;
    private String sentiment;
    private String priority;
    private Double escalationRisk;
    private String rootCause;
    private List<String> recommendedActions;
    private String suggestedResponse;
    private List<String> sources;
}
