package com.resolveai.controller;

import com.resolveai.dto.MessageResponse;
import com.resolveai.exception.ResourceNotFoundException;
import com.resolveai.model.*;
import com.resolveai.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminManagementController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private ComplaintCategoryRepository categoryRepository;

    @Autowired
    private RecommendedSolutionRepository solutionRepository;

    @Autowired
    private SLARuleRepository slaRuleRepository;

    // --- Users ---
    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userRepository.findById(id).ifPresent(userRepository::delete);
        return ResponseEntity.ok(new MessageResponse(true, "User deleted successfully"));
    }

    // --- Agents ---
    @GetMapping("/agents")
    public ResponseEntity<List<Agent>> getAllAgents() {
        return ResponseEntity.ok(agentRepository.findAll());
    }

    // --- Departments ---
    @GetMapping("/departments")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<Department>> getAllDepartments() {
        return ResponseEntity.ok(departmentRepository.findAll());
    }

    @PostMapping("/departments")
    public ResponseEntity<Department> createDepartment(@RequestBody Department dept) {
        dept.setCreatedAt(LocalDateTime.now());
        dept.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(departmentRepository.save(dept));
    }

    @DeleteMapping("/departments/{id}")
    public ResponseEntity<?> deleteDepartment(@PathVariable Long id) {
        departmentRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse(true, "Department deleted successfully"));
    }

    // --- Categories ---
    @GetMapping("/categories")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'CUSTOMER', 'AGENT')")
    public ResponseEntity<List<ComplaintCategory>> getAllCategories() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }

    @PostMapping("/categories")
    public ResponseEntity<ComplaintCategory> createCategory(@RequestBody ComplaintCategory cat) {
        return ResponseEntity.ok(categoryRepository.save(cat));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<?> deleteCategory(@PathVariable Long id) {
        categoryRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse(true, "Category deleted successfully"));
    }

    // --- Recommended Solutions ---
    @GetMapping("/solutions")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'AGENT')")
    public ResponseEntity<List<RecommendedSolution>> getAllSolutions() {
        return ResponseEntity.ok(solutionRepository.findAll());
    }

    @PostMapping("/solutions")
    public ResponseEntity<RecommendedSolution> createSolution(@RequestBody RecommendedSolution solution) {
        solution.setCreatedAt(LocalDateTime.now());
        solution.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(solutionRepository.save(solution));
    }

    @PutMapping("/solutions/{id}")
    public ResponseEntity<RecommendedSolution> updateSolution(@PathVariable Long id, @RequestBody RecommendedSolution details) {
        RecommendedSolution sol = solutionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Solution not found"));
        sol.setTitle(details.getTitle());
        sol.setDescription(details.getDescription());
        sol.setCategory(details.getCategory());
        sol.setIntent(details.getIntent());
        sol.setRootCause(details.getRootCause());
        sol.setResolutionSteps(details.getResolutionSteps());
        sol.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.ok(solutionRepository.save(sol));
    }

    @DeleteMapping("/solutions/{id}")
    public ResponseEntity<?> deleteSolution(@PathVariable Long id) {
        solutionRepository.deleteById(id);
        return ResponseEntity.ok(new MessageResponse(true, "Solution deleted successfully"));
    }

    // --- SLA Rules ---
    @GetMapping("/sla-rules")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<SLARule>> getAllSlaRules() {
        return ResponseEntity.ok(slaRuleRepository.findAll());
    }

    @PutMapping("/sla-rules/{id}")
    public ResponseEntity<SLARule> updateSlaRule(@PathVariable Long id, @RequestBody SLARule details) {
        SLARule rule = slaRuleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SLA Rule not found"));
        rule.setResolutionTimeHours(details.getResolutionTimeHours());
        rule.setWarningTimeHours(details.getWarningTimeHours());
        return ResponseEntity.ok(slaRuleRepository.save(rule));
    }
}
