package com.resolveai.service;

import com.resolveai.model.AuditLog;
import com.resolveai.model.KnowledgeChunk;
import com.resolveai.model.KnowledgeDocument;
import com.resolveai.model.User;
import com.resolveai.repository.KnowledgeChunkRepository;
import com.resolveai.repository.KnowledgeDocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class KnowledgeBaseService {
    private static final Logger logger = LoggerFactory.getLogger(KnowledgeBaseService.class);

    @Autowired
    private KnowledgeDocumentRepository documentRepository;

    @Autowired
    private KnowledgeChunkRepository chunkRepository;

    @Autowired
    private AIServiceClient aiServiceClient;

    @Autowired
    private AuditLogService auditLogService;

    @Value("${app.ai-service.url}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    private final Path uploadLocation = Paths.get("uploads");

    public KnowledgeBaseService() {
        try {
            Files.createDirectories(uploadLocation);
        } catch (IOException e) {
            logger.error("Could not create upload directory", e);
        }
    }

    @Transactional
    public KnowledgeDocument saveAndIndexDocument(MultipartFile file, String category, User admin) throws IOException {
        String originalFileName = file.getOriginalFilename();
        String fileExtension = "";
        if (originalFileName != null && originalFileName.contains(".")) {
            fileExtension = originalFileName.substring(originalFileName.lastIndexOf("."));
        }

        // Generate safe unique local file name
        String uniqueFileName = UUID.randomUUID().toString() + fileExtension;
        Path targetPath = this.uploadLocation.resolve(uniqueFileName);
        Files.copy(file.getInputStream(), targetPath);

        // 1. Save Document record in MySQL
        KnowledgeDocument doc = KnowledgeDocument.builder()
                .fileName(originalFileName)
                .fileType(file.getContentType())
                .filePath(targetPath.toAbsolutePath().toString())
                .fileSize(file.getSize())
                .category(category != null ? category.toUpperCase() : "GENERAL")
                .createdAt(LocalDateTime.now())
                .build();

        doc = documentRepository.save(doc);

        // 2. Upload file to AI Service for parsing, chunking, and vector database storage
        List<String> chunks = uploadFileToAIService(targetPath.toFile(), category);

        // 3. Save chunks in MySQL
        int index = 0;
        for (String chunkText : chunks) {
            KnowledgeChunk chunk = KnowledgeChunk.builder()
                    .document(doc)
                    .chunkIndex(index++)
                    .chunkText(chunkText)
                    .createdAt(LocalDateTime.now())
                    .build();
            chunkRepository.save(chunk);
        }

        auditLogService.logAction(admin, "UPLOAD_KB_DOCUMENT", "KNOWLEDGE_DOCUMENT", doc.getId(),
                "Uploaded knowledge article: " + originalFileName + " (" + chunks.size() + " chunks indexed)");

        return doc;
    }

    @Transactional
    public void deleteDocument(Long id, User admin) {
        KnowledgeDocument doc = documentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        // 1. Delete in MySQL (chunks deleted first via cascade or service delete)
        chunkRepository.deleteByDocumentId(doc.getId());
        documentRepository.delete(doc);

        // 2. Delete file locally
        try {
            Files.deleteIfExists(Paths.get(doc.getFilePath()));
        } catch (IOException e) {
            logger.warn("Failed to delete physical file: {}", doc.getFilePath());
        }

        // 3. Delete in AI Service vector store
        aiServiceClient.deleteDocument(doc.getFileName());

        auditLogService.logAction(admin, "DELETE_KB_DOCUMENT", "KNOWLEDGE_DOCUMENT", doc.getId(),
                "Deleted knowledge article: " + doc.getFileName());
    }

    @Transactional
    public void reindexAll(User admin) {
        List<KnowledgeDocument> docs = documentRepository.findAll();
        for (KnowledgeDocument doc : docs) {
            try {
                // Delete previous chunks
                chunkRepository.deleteByDocumentId(doc.getId());
                File file = new File(doc.getFilePath());
                if (file.exists()) {
                    List<String> chunks = uploadFileToAIService(file, doc.getCategory());
                    int index = 0;
                    for (String chunkText : chunks) {
                        KnowledgeChunk chunk = KnowledgeChunk.builder()
                                .document(doc)
                                .chunkIndex(index++)
                                .chunkText(chunkText)
                                .createdAt(LocalDateTime.now())
                                .build();
                        chunkRepository.save(chunk);
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to reindex document ID {}: {}", doc.getId(), e.getMessage());
            }
        }
        auditLogService.logAction(admin, "REINDEX_KB", "KNOWLEDGE_BASE", null,
                "Triggered full reindexing of all knowledge documents.");
    }

    private List<String> uploadFileToAIService(File file, String category) {
        String endpoint = aiServiceUrl + "/api/ai/upload-document";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new FileSystemResource(file));
        body.add("category", category);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            logger.info("Uploading file {} to AI service at {} for extraction...", file.getName(), endpoint);
            ResponseEntity<String[]> response = restTemplate.postForEntity(endpoint, requestEntity, String[].class);
            if (response.getBody() != null) {
                return Arrays.asList(response.getBody());
            }
        } catch (Exception e) {
            logger.error("Failed to upload file to AI service: {}", e.getMessage());
            throw new RuntimeException("AI Document Extractor failed: " + e.getMessage(), e);
        }

        return Collections.emptyList();
    }
}
