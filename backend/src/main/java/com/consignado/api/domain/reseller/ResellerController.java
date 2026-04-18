package com.consignado.api.domain.reseller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.consignado.api.domain.reseller.dto.ResellerDocumentResponse;
import com.consignado.api.domain.reseller.dto.ResellerFilterRequest;
import com.consignado.api.domain.reseller.dto.ResellerRequest;
import com.consignado.api.domain.reseller.dto.ResellerResponse;
import com.consignado.api.domain.reseller.dto.ResellerSummaryResponse;
import com.consignado.api.domain.reseller.dto.UpdateStatusRequest;
import com.consignado.api.shared.response.ApiResponse;
import com.consignado.api.shared.response.PageResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/resellers")
@RequiredArgsConstructor
public class ResellerController {

    private final ResellerService resellerService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ResellerSummaryResponse>>> findAll(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) UUID managerId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "name") String sort
    ) {
        var filter = new ResellerFilterRequest(search, status, managerId);
        var pageable = PageRequest.of(page, size, Sort.by(sort));
        var result = resellerService.findAll(filter, pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(result)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ResellerResponse>> create(
        @Valid @RequestBody ResellerRequest request
    ) {
        return ResponseEntity.status(201).body(ApiResponse.created(resellerService.create(request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ResellerResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(resellerService.findById(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ResellerResponse>> update(
        @PathVariable UUID id,
        @Valid @RequestBody ResellerRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(resellerService.update(id, request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateStatusRequest request
    ) {
        resellerService.updateStatus(id, request.status());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/{id}/consignments")
    public ResponseEntity<ApiResponse<List<?>>> getConsignments(@PathVariable UUID id) {
        // Implemented in Sprint 4
        return ResponseEntity.ok(ApiResponse.ok(List.of()));
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<ApiResponse<ResellerDocumentResponse>> addDocument(
        @PathVariable UUID id,
        @RequestParam String type,
        @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.status(201).body(ApiResponse.created(resellerService.addDocument(id, type, file)));
    }

    @GetMapping("/{id}/documents")
    public ResponseEntity<ApiResponse<List<ResellerDocumentResponse>>> listDocuments(
        @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(resellerService.listDocuments(id)));
    }

    @DeleteMapping("/{id}/documents/{docId}")
    public ResponseEntity<Void> removeDocument(
        @PathVariable UUID id,
        @PathVariable UUID docId
    ) {
        resellerService.removeDocument(id, docId);
        return ResponseEntity.noContent().build();
    }
}
