package com.resolveai.service;

import com.resolveai.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AIServiceClient {
    private static final Logger logger = LoggerFactory.getLogger(AIServiceClient.class);

    @Value("${app.ai-service.url}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public AIAnalysisResponse analyzeComplaint(Long complaintId, String title, String description) {
        String endpoint = aiServiceUrl + "/api/ai/analyze";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("complaintId", "CMP-" + complaintId);
        requestBody.put("title", title);
        requestBody.put("description", description);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            logger.info("Sending complaint id {} to AI Service for analysis at {}", complaintId, endpoint);
            return restTemplate.postForObject(endpoint, entity, AIAnalysisResponse.class);
        } catch (Exception e) {
            logger.error("Failed to connect to AI Service at {}. Error: {}", endpoint, e.getMessage());
            throw new RuntimeException("AI Service is currently offline. Please ensure Python FastAPI is running at " + aiServiceUrl, e);
        }
    }

    public ChatResponse chatWithAI(Long conversationId, String query, List<ChatRequest.ChatMessageDto> history) {
        String endpoint = aiServiceUrl + "/api/ai/chat";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Forward current authorization header to downstream FastAPI service
        try {
            org.springframework.web.context.request.ServletRequestAttributes attributes = 
                (org.springframework.web.context.request.ServletRequestAttributes) org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                jakarta.servlet.http.HttpServletRequest currentRequest = attributes.getRequest();
                String authHeader = currentRequest.getHeader("Authorization");
                if (authHeader != null) {
                    headers.set("Authorization", authHeader);
                }
            }
        } catch (Exception e) {
            logger.warn("Could not forward Authorization header: {}", e.getMessage());
        }

        ChatRequest request = ChatRequest.builder()
                .query(query)
                .history(history)
                .conversationId(conversationId)
                .build();

        HttpEntity<ChatRequest> entity = new HttpEntity<>(request, headers);

        try {
            logger.info("Sending query to AI Chat service at {}", endpoint);
            return restTemplate.postForObject(endpoint, entity, ChatResponse.class);
        } catch (Exception e) {
            logger.error("Failed to connect to AI Chat Service: {}", e.getMessage());
            return ChatResponse.builder()
                    .answer("I'm unable to connect to the AI service at the moment. Would you like to try again or click 'Talk to Agent' to create a support ticket?")
                    .intent("OTHER")
                    .confidence(0.0)
                    .requiresHuman(false)
                    .sentiment("NEUTRAL")
                    .priority("MEDIUM")
                    .escalationRisk(0.5)
                    .build();
        }
    }

    public void indexDocument(String fileName, String category, List<String> chunks) {
        String endpoint = aiServiceUrl + "/api/ai/index-document";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        IndexDocumentRequest request = IndexDocumentRequest.builder()
                .fileName(fileName)
                .category(category)
                .chunks(chunks)
                .build();

        HttpEntity<IndexDocumentRequest> entity = new HttpEntity<>(request, headers);

        try {
            logger.info("Sending document '{}' with {} chunks to AI Service for indexing", fileName, chunks.size());
            restTemplate.postForLocation(endpoint, entity);
        } catch (Exception e) {
            logger.error("Failed to index document in AI Service: {}", e.getMessage());
            throw new RuntimeException("Could not index document in vector database. AI Service connection failed.", e);
        }
    }

    public void deleteDocument(String fileName) {
        String endpoint = aiServiceUrl + "/api/ai/delete-document?fileName=" + fileName;

        try {
            logger.info("Requesting deletion of document '{}' from AI vector DB", fileName);
            restTemplate.delete(endpoint);
        } catch (Exception e) {
            logger.error("Failed to delete document in AI Service: {}", e.getMessage());
            // Log warning but don't crash to ensure SQL DB status remains clean
        }
    }

    public CopilotResponse suggestCopilot(String complaintTitle, String complaintDescription, List<ChatRequest.ChatMessageDto> history) {
        String endpoint = aiServiceUrl + "/api/ai/copilot-suggest";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("title", complaintTitle);
        requestBody.put("description", complaintDescription);
        requestBody.put("history", history);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            logger.info("Requesting Copilot suggestions from AI service");
            return restTemplate.postForObject(endpoint, entity, CopilotResponse.class);
        } catch (Exception e) {
            logger.error("Failed to retrieve Agent Copilot suggestion: {}", e.getMessage());
            return CopilotResponse.builder()
                    .summary("No summary available: AI Service offline.")
                    .intent("OTHER")
                    .sentiment("NEUTRAL")
                    .priority("MEDIUM")
                    .escalationRisk(0.0)
                    .rootCause("UNKNOWN")
                    .suggestedResponse("Dear Customer,\n\nWe apologize for the inconvenience. Our AI Copilot assistant is temporarily offline. A support representative will review your message shortly.")
                    .build();
        }
    }
}
