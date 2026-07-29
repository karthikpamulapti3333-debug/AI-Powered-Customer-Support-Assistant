package com.resolveai.controller;

import com.resolveai.model.Conversation;
import com.resolveai.model.Message;
import com.resolveai.model.User;
import com.resolveai.exception.ResourceNotFoundException;
import com.resolveai.repository.UserRepository;
import com.resolveai.security.UserDetailsImpl;
import com.resolveai.service.ConversationService;
import jakarta.validation.Valid;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    @Autowired
    private ConversationService conversationService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Conversation> startConversation() {
        User currentUser = getAuthenticatedUser();
        Conversation c = conversationService.startConversation(currentUser);
        return ResponseEntity.ok(c);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<List<Conversation>> getConversations() {
        User currentUser = getAuthenticatedUser();
        List<Conversation> list = conversationService.getConversationsForCustomer(currentUser);
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}/messages")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<List<Message>> getMessages(@PathVariable Long id) {
        // Retrieve conversation first to verify ownership
        Conversation c = conversationService.getConversationById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        
        User currentUser = getAuthenticatedUser();
        boolean isCustomer = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_CUSTOMER"));
        if (isCustomer && !c.getCustomer().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).build();
        }

        List<Message> list = conversationService.getMessages(id);
        return ResponseEntity.ok(list);
    }

    @PostMapping("/{id}/messages")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<Message> postMessage(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String messageText = request.get("messageText");
        if (messageText == null || messageText.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        User currentUser = getAuthenticatedUser();
        
        System.out.println("[CHAT] Controller User message: " + messageText);
        System.out.println("[CHAT] Controller Conversation ID: " + id);
        System.out.println("[CHAT] Controller User ID: " + currentUser.getId());
        
        Message reply = conversationService.postMessage(id, messageText, currentUser);
        
        System.out.println("[CHAT] Controller Final response: " + reply.getMessageText());
        
        return ResponseEntity.ok(reply);
    }

    @PostMapping("/{id}/feedback")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> submitFeedback(@PathVariable Long id, @RequestBody FeedbackRequestDto request) {
        User currentUser = getAuthenticatedUser();
        conversationService.submitConversationFeedback(id, request.getRating(), request.getComment(), currentUser);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> deleteConversation(@PathVariable Long id) {
        Conversation c = conversationService.getConversationById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found"));
        User currentUser = getAuthenticatedUser();
        if (!c.getCustomer().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).build();
        }
        conversationService.deleteConversation(id);
        return ResponseEntity.ok().build();
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Data
    public static class FeedbackRequestDto {
        private int rating;
        private String comment;
    }
}
