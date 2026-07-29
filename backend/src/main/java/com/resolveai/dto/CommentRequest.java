package com.resolveai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CommentRequest {
    @NotBlank(message = "Comment text cannot be empty")
    private String commentText;

    private Boolean isInternal = false;
}
