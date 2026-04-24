package com.consignado.api.domain.consignment;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.domain.consignment.dto.BatchMovementRequest;
import com.consignado.api.domain.consignment.dto.ConsignmentFilterRequest;
import com.consignado.api.domain.consignment.dto.ConsignmentRequest;
import com.consignado.api.domain.consignment.dto.ConsignmentResponse;
import com.consignado.api.domain.consignment.dto.ConsignmentSummaryResponse;
import com.consignado.api.domain.consignment.dto.MovementRequest;
import com.consignado.api.domain.consignment.dto.SettleRequest;
import com.consignado.api.shared.response.ApiResponse;
import com.consignado.api.shared.response.PageResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/consignments")
@RequiredArgsConstructor
public class ConsignmentController {

    private final ConsignmentService consignmentService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ConsignmentSummaryResponse>>> findAll(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) UUID resellerId,
        @RequestParam(required = false) UUID managerId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var filter = new ConsignmentFilterRequest(status, resellerId, managerId, from, to);
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(consignmentService.findAll(filter, pageable))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ConsignmentResponse>> create(
        @Valid @RequestBody ConsignmentRequest request
    ) {
        return ResponseEntity.status(201).body(ApiResponse.created(consignmentService.create(request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ConsignmentResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(consignmentService.findById(id)));
    }

    @PostMapping("/{id}/movements")
    public ResponseEntity<ApiResponse<ConsignmentResponse>> registerMovement(
        @PathVariable UUID id,
        @Valid @RequestBody BatchMovementRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(consignmentService.registerBatchMovement(id, request)));
    }

    @PostMapping("/{id}/settle")
    public ResponseEntity<ApiResponse<ConsignmentResponse>> settle(
        @PathVariable UUID id,
        @RequestBody(required = false) SettleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(consignmentService.settle(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> revert(@PathVariable UUID id) {
        consignmentService.revert(id);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
