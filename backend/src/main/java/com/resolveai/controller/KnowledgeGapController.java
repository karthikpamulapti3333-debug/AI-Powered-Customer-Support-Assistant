package com.resolveai.controller;

import com.resolveai.model.KnowledgeGap;
import com.resolveai.exception.ResourceNotFoundException;
import com.resolveai.repository.KnowledgeGapRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/knowledge-gaps")
public class KnowledgeGapController {

    @Autowired
    private KnowledgeGapRepository knowledgeGapRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    public ResponseEntity<List<KnowledgeGap>> getKnowledgeGaps() {
        return ResponseEntity.ok(knowledgeGapRepository.findAllByOrderByCheckedAtDesc());
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<KnowledgeGap> resolveGap(@PathVariable Long id) {
        KnowledgeGap gap = knowledgeGapRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Knowledge Gap not found"));
        gap.setResolved(true);
        return ResponseEntity.ok(knowledgeGapRepository.save(gap));
    }
}
