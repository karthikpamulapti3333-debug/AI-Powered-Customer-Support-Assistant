package com.resolveai.repository;

import com.resolveai.model.SLARule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SLARuleRepository extends JpaRepository<SLARule, Long> {
    Optional<SLARule> findByPriority(String priority);
}
