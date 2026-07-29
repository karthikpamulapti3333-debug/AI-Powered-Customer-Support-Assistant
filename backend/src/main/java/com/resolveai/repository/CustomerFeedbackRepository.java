package com.resolveai.repository;

import com.resolveai.model.CustomerFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CustomerFeedbackRepository extends JpaRepository<CustomerFeedback, Long> {
    Optional<CustomerFeedback> findByComplaintId(Long complaintId);
}
