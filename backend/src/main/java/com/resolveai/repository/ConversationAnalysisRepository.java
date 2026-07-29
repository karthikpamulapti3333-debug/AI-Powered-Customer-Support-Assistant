package com.resolveai.repository;

import com.resolveai.model.ConversationAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConversationAnalysisRepository extends JpaRepository<ConversationAnalysis, Long> {
    Optional<ConversationAnalysis> findByConversationId(Long conversationId);
}
