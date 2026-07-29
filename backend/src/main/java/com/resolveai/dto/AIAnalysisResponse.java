package com.resolveai.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class AIAnalysisResponse {
    private String category;
    private String intent;
    private String sentiment;
    private String priority;
    private Double escalationRisk;
    private String rootCause;
    private Double confidenceScore;
    private List<String> recommendedActions;
}
