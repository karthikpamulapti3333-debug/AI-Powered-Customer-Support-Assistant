package com.resolveai.repository;

import com.resolveai.model.Complaint;
import org.springframework.data.jpa.domain.Specification;

public class ComplaintSpecifications {
    
    public static Specification<Complaint> hasStatus(String status) {
        return (root, query, cb) -> (status == null || status.trim().isEmpty()) 
                ? cb.conjunction() 
                : cb.equal(cb.upper(root.get("status")), status.toUpperCase());
    }

    public static Specification<Complaint> hasPriority(String priority) {
        return (root, query, cb) -> (priority == null || priority.trim().isEmpty()) 
                ? cb.conjunction() 
                : cb.equal(cb.upper(root.get("priority")), priority.toUpperCase());
    }

    public static Specification<Complaint> hasCategory(Long categoryId) {
        return (root, query, cb) -> categoryId == null 
                ? cb.conjunction() 
                : cb.equal(root.get("category").get("id"), categoryId);
    }

    public static Specification<Complaint> hasDepartment(Long departmentId) {
        return (root, query, cb) -> departmentId == null 
                ? cb.conjunction() 
                : cb.equal(root.get("assignedDepartment").get("id"), departmentId);
    }

    public static Specification<Complaint> hasAgent(Long agentId) {
        return (root, query, cb) -> agentId == null 
                ? cb.conjunction() 
                : cb.equal(root.get("assignedAgent").get("id"), agentId);
    }

    public static Specification<Complaint> hasEscalationStatus(String escalationStatus) {
        return (root, query, cb) -> (escalationStatus == null || escalationStatus.trim().isEmpty()) 
                ? cb.conjunction() 
                : cb.equal(cb.upper(root.get("escalationStatus")), escalationStatus.toUpperCase());
    }

    public static Specification<Complaint> searchKeyword(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return cb.conjunction();
            }
            String likePattern = "%" + search.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("title")), likePattern),
                    cb.like(cb.lower(root.get("description")), likePattern)
            );
        };
    }
}
