package com.resolveai.repository;

import com.resolveai.model.KnowledgeGap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeGapRepository extends JpaRepository<KnowledgeGap, Long> {
    List<KnowledgeGap> findByResolvedFalseOrderByCheckedAtDesc();
    List<KnowledgeGap> findAllByOrderByCheckedAtDesc();
}
