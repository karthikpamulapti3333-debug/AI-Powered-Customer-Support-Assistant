package com.resolveai.repository;

import com.resolveai.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, Long>, JpaSpecificationExecutor<Complaint> {
    List<Complaint> findByCustomerId(Long customerId);
    List<Complaint> findByAssignedAgentId(Long agentId);
    List<Complaint> findByAssignedDepartmentId(Long departmentId);
    List<Complaint> findByEscalationStatus(String escalationStatus);
    Optional<Complaint> findByConversationId(Long conversationId);
}
