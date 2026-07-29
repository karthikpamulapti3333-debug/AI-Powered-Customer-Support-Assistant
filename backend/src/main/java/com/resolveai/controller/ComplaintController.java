package com.resolveai.controller;

import com.resolveai.dto.*;
import com.resolveai.exception.BadRequestException;
import com.resolveai.exception.ResourceNotFoundException;
import com.resolveai.model.*;
import com.resolveai.repository.*;
import com.resolveai.security.UserDetailsImpl;
import com.resolveai.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private ComplaintCommentRepository commentRepository;

    @Autowired
    private ComplaintHistoryRepository historyRepository;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ComplaintResponse> createComplaint(@Valid @RequestBody ComplaintRequest request) {
        User customer = getAuthenticatedUser();
        Complaint c = complaintService.createComplaint(request.getTitle(), request.getDescription(), customer);
        return ResponseEntity.ok(complaintService.convertToResponse(c));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> getComplaints(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Long agentId,
            @RequestParam(required = false) String escalationStatus,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        User currentUser = getAuthenticatedUser();
        boolean isCustomer = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_CUSTOMER"));
        boolean isAgent = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_AGENT"));

        Specification<Complaint> spec = Specification.where(null);

        // Scope queries based on role
        if (isCustomer) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("customer").get("id"), currentUser.getId()));
        } else if (isAgent) {
            Agent agent = agentRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Agent details not found"));
            spec = spec.and(ComplaintSpecifications.hasAgent(agent.getId()));
        } else {
            // Manager/Admin can filter by agentId if provided
            if (agentId != null) {
                spec = spec.and(ComplaintSpecifications.hasAgent(agentId));
            }
        }

        // Apply shared filters
        if (status != null && !status.trim().isEmpty()) {
            spec = spec.and(ComplaintSpecifications.hasStatus(status));
        }
        if (priority != null && !priority.trim().isEmpty()) {
            spec = spec.and(ComplaintSpecifications.hasPriority(priority));
        }
        if (categoryId != null) {
            spec = spec.and(ComplaintSpecifications.hasCategory(categoryId));
        }
        if (departmentId != null) {
            spec = spec.and(ComplaintSpecifications.hasDepartment(departmentId));
        }
        if (escalationStatus != null && !escalationStatus.trim().isEmpty()) {
            spec = spec.and(ComplaintSpecifications.hasEscalationStatus(escalationStatus));
        }
        if (search != null && !search.trim().isEmpty()) {
            spec = spec.and(ComplaintSpecifications.searchKeyword(search));
        }

        Sort sort = sortDir.equalsIgnoreCase("asc") ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Complaint> complaintPage = complaintRepository.findAll(spec, pageable);
        
        List<ComplaintResponse> responses = complaintPage.getContent().stream()
                .map(complaintService::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses); // Simple array response matches client needs, or include page metadata
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ComplaintResponse> getComplaintById(@PathVariable Long id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));

        User currentUser = getAuthenticatedUser();
        boolean isCustomer = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_CUSTOMER"));
        boolean isAgent = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_AGENT"));

        if (isCustomer && !complaint.getCustomer().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Unauthorized access to this complaint");
        }

        if (isAgent) {
            Agent agent = agentRepository.findByUserId(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Agent details not found"));
            if (complaint.getAssignedAgent() == null || !complaint.getAssignedAgent().getId().equals(agent.getId())) {
                throw new BadRequestException("Unauthorized access: Ticket is not assigned to you");
            }
        }

        return ResponseEntity.ok(complaintService.convertToResponse(complaint));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ComplaintResponse> updateStatus(
            @PathVariable Long id, 
            @RequestParam String status) {
        User currentUser = getAuthenticatedUser();
        Complaint updated = complaintService.updateComplaintStatus(id, status, currentUser);
        return ResponseEntity.ok(complaintService.convertToResponse(updated));
    }

    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<?> addComment(
            @PathVariable Long id,
            @Valid @RequestBody CommentRequest request) {
        User currentUser = getAuthenticatedUser();
        ComplaintComment comment = complaintService.addComment(id, request.getCommentText(), request.getIsInternal(), currentUser);
        return ResponseEntity.ok(comment);
    }

    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<List<ComplaintComment>> getComments(@PathVariable Long id) {
        User currentUser = getAuthenticatedUser();
        boolean isCustomer = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_CUSTOMER"));
        
        List<ComplaintComment> comments;
        if (isCustomer) {
            comments = commentRepository.findByComplaintIdAndIsInternalFalseOrderByCreatedAtAsc(id);
        } else {
            comments = commentRepository.findByComplaintIdOrderByCreatedAtAsc(id);
        }
        return ResponseEntity.ok(comments);
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('CUSTOMER', 'AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<List<ComplaintHistory>> getHistory(@PathVariable Long id) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found"));

        User currentUser = getAuthenticatedUser();
        boolean isCustomer = currentUser.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_CUSTOMER"));
        if (isCustomer && !complaint.getCustomer().getId().equals(currentUser.getId())) {
            throw new BadRequestException("Unauthorized access to this history");
        }

        return ResponseEntity.ok(historyRepository.findByComplaintIdOrderByCreatedAtDesc(id));
    }

    @PostMapping("/{id}/feedback")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> submitFeedback(
            @PathVariable Long id,
            @Valid @RequestBody FeedbackRequest request) {
        User currentUser = getAuthenticatedUser();
        CustomerFeedback fb = complaintService.submitFeedback(id, request, currentUser);
        return ResponseEntity.ok(fb);
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    public ResponseEntity<ComplaintResponse> assignComplaint(
            @PathVariable Long id,
            @RequestParam Long agentId) {
        User currentUser = getAuthenticatedUser();
        Complaint updated = complaintService.assignComplaint(id, agentId, currentUser);
        return ResponseEntity.ok(complaintService.convertToResponse(updated));
    }

    @PostMapping("/{id}/escalate")
    @PreAuthorize("hasAnyRole('AGENT', 'MANAGER', 'ADMIN')")
    public ResponseEntity<ComplaintResponse> escalateComplaint(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "Manual escalation request.") String comments) {
        User currentUser = getAuthenticatedUser();
        Complaint updated = complaintService.escalateComplaint(id, comments, currentUser);
        return ResponseEntity.ok(complaintService.convertToResponse(updated));
    }

    private User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
