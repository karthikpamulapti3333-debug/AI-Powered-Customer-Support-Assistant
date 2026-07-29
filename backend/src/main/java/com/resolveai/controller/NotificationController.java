package com.resolveai.controller;

import com.resolveai.dto.MessageResponse;
import com.resolveai.model.Notification;
import com.resolveai.model.User;
import com.resolveai.repository.UserRepository;
import com.resolveai.security.UserDetailsImpl;
import com.resolveai.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications() {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(notificationService.getNotificationsForUser(user.getId()));
    }

    @GetMapping("/unread")
    public ResponseEntity<List<Notification>> getMyUnreadNotifications() {
        User user = getAuthenticatedUser();
        return ResponseEntity.ok(notificationService.getUnreadNotificationsForUser(user.getId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(new MessageResponse(true, "Notification marked as read"));
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllRead() {
        User user = getAuthenticatedUser();
        notificationService.markAllAsRead(user.getId());
        return ResponseEntity.ok(new MessageResponse(true, "All notifications marked as read"));
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }
}
