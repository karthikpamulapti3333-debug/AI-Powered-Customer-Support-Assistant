package com.resolveai.controller;

import com.resolveai.model.KnowledgeDocument;
import com.resolveai.model.User;
import com.resolveai.exception.ResourceNotFoundException;
import com.resolveai.repository.KnowledgeDocumentRepository;
import com.resolveai.repository.UserRepository;
import com.resolveai.security.UserDetailsImpl;
import com.resolveai.service.KnowledgeBaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/knowledge")
public class KnowledgeBaseController {

    @Autowired
    private KnowledgeBaseService knowledgeBaseService;

    @Autowired
    private KnowledgeDocumentRepository documentRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping(value = "/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<KnowledgeDocument> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", required = false, defaultValue = "GENERAL") String category) {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        User currentUser = getAuthenticatedUser();
        try {
            KnowledgeDocument doc = knowledgeBaseService.saveAndIndexDocument(file, category, currentUser);
            return ResponseEntity.ok(doc);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/documents")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    public ResponseEntity<List<KnowledgeDocument>> getDocuments() {
        return ResponseEntity.ok(documentRepository.findAllByOrderByCreatedAtDesc());
    }

    @DeleteMapping("/documents/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        User currentUser = getAuthenticatedUser();
        try {
            knowledgeBaseService.deleteDocument(id, currentUser);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/reindex")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> triggerReindex() {
        User currentUser = getAuthenticatedUser();
        try {
            knowledgeBaseService.reindexAll(currentUser);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
