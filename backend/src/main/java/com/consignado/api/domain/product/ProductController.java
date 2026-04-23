package com.consignado.api.domain.product;

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

import com.consignado.api.domain.product.dto.ProductFilterRequest;
import com.consignado.api.domain.product.dto.ProductImageResponse;
import com.consignado.api.domain.product.dto.ProductRequest;
import com.consignado.api.domain.product.dto.ProductResponse;
import com.consignado.api.domain.product.dto.ProductSummaryResponse;
import com.consignado.api.domain.product.dto.ProductTrackingResponse;
import com.consignado.api.domain.product.dto.UpdateProductStatusRequest;
import com.consignado.api.shared.response.ApiResponse;
import com.consignado.api.shared.response.PageResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ProductSummaryResponse>>> findAll(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) Boolean active,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "name") String sort
    ) {
        var filter = new ProductFilterRequest(search, category, active);
        var pageable = PageRequest.of(page, size, Sort.by(sort));
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.from(productService.findAll(filter, pageable))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductResponse>> create(
        @Valid @RequestBody ProductRequest request
    ) {
        return ResponseEntity.status(201).body(ApiResponse.created(productService.create(request)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(productService.findById(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductResponse>> update(
        @PathVariable UUID id,
        @Valid @RequestBody ProductRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(productService.update(id, request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
        @PathVariable UUID id,
        @Valid @RequestBody UpdateProductStatusRequest request
    ) {
        productService.updateStatus(id, request.active());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @PostMapping("/{id}/stock-entry")
    public ResponseEntity<ApiResponse<ProductResponse>> addStock(
        @PathVariable UUID id,
        @RequestBody java.util.Map<String, Integer> body
    ) {
        return ResponseEntity.ok(ApiResponse.ok(productService.addStock(id, body.get("quantity"))));
    }

    @GetMapping("/{id}/tracking")
    public ResponseEntity<ApiResponse<ProductTrackingResponse>> getTracking(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(productService.getTracking(id)));
    }

    @PostMapping("/{id}/images")
    public ResponseEntity<ApiResponse<ProductImageResponse>> addImage(
        @PathVariable UUID id,
        @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.status(201).body(ApiResponse.created(productService.addImage(id, file)));
    }

    @DeleteMapping("/{id}/images/{imgId}")
    public ResponseEntity<Void> deleteImage(
        @PathVariable UUID id,
        @PathVariable UUID imgId
    ) {
        productService.deleteImage(id, imgId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/images/{imgId}/primary")
    public ResponseEntity<ApiResponse<Void>> setPrimaryImage(
        @PathVariable UUID id,
        @PathVariable UUID imgId
    ) {
        productService.setPrimaryImage(id, imgId);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
