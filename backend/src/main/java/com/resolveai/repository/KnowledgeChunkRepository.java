package com.resolveai.repository;

import com.resolveai.model.KnowledgeChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeChunkRepository extends JpaRepository<KnowledgeChunk, Long> {
    List<KnowledgeChunk> findByDocumentIdOrderByChunkIndexAsc(Long documentId);
    void deleteByDocumentId(Long documentId);
}
