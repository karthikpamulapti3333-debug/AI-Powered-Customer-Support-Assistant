package com.resolveai.repository;

import com.resolveai.model.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AgentRepository extends JpaRepository<Agent, Long> {
    Optional<Agent> findByUserId(Long userId);
    Optional<Agent> findByUserUsername(String username);
    List<Agent> findByDepartmentIdAndStatus(Long departmentId, String status);
    List<Agent> findByStatus(String status);
}
