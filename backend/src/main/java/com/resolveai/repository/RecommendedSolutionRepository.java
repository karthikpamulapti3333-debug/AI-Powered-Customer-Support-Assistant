package com.resolveai.repository;

import com.resolveai.model.RecommendedSolution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RecommendedSolutionRepository extends JpaRepository<RecommendedSolution, Long> {
    List<RecommendedSolution> findByCategory(String category);
    List<RecommendedSolution> findByCategoryAndIntent(String category, String intent);
    List<RecommendedSolution> findByCategoryAndIntentAndRootCause(String category, String intent, String rootCause);
}
