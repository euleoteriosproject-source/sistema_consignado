package com.consignado.api.domain.support.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateSupportTicketRequest(
    @NotBlank(message = "Assunto é obrigatório")
    @Size(max = 255)
    String subject,

    @NotBlank(message = "Descrição é obrigatória")
    String description,

    @Pattern(regexp = "low|medium|high", message = "Prioridade inválida")
    String priority,

    String attachmentUrl,
    String attachmentName
) {}
