package com.consignado.api.domain.settlement;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.domain.settlement.dto.SettlementFilterRequest;
import com.consignado.api.domain.settlement.dto.SettlementRequest;
import com.consignado.api.domain.settlement.dto.SettlementResponse;
import com.consignado.api.domain.settlement.dto.SettlementsSummaryResponse;
import com.consignado.api.shared.response.ApiResponse;
import com.consignado.api.shared.response.PageResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SettlementResponse>>> findAll(
        @RequestParam(required = false) UUID resellerId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        var filter = new SettlementFilterRequest(resellerId, from, to);
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "settlementDate"));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(settlementService.findAll(filter, pageable))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SettlementResponse>> create(
        @Valid @RequestBody SettlementRequest request
    ) {
        return ResponseEntity.status(201).body(ApiResponse.created(settlementService.create(request)));
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<SettlementsSummaryResponse>> getSummary(
        @RequestParam(required = false) UUID resellerId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        var filter = new SettlementFilterRequest(resellerId, from, to);
        return ResponseEntity.ok(ApiResponse.ok(settlementService.getSummary(filter)));
    }
}
