package com.resolveai.repository;

import com.resolveai.model.ComplaintComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ComplaintCommentRepository extends JpaRepository<ComplaintComment, Long> {
    List<ComplaintComment> findByComplaintIdOrderByCreatedAtAsc(Long complaintId);
    List<ComplaintComment> findByComplaintIdAndIsInternalFalseOrderByCreatedAtAsc(Long complaintId);
}
