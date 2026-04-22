package com.consignado.api.domain.product;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.consignado.api.domain.billing.TenantPlan;
import com.consignado.api.domain.consignment.Consignment;
import com.consignado.api.domain.consignment.ConsignmentItem;
import com.consignado.api.domain.consignment.ConsignmentItemRepository;
import com.consignado.api.domain.consignment.ConsignmentRepository;
import com.consignado.api.domain.product.dto.ProductFilterRequest;
import com.consignado.api.domain.product.dto.ProductImageResponse;
import com.consignado.api.domain.product.dto.ProductRequest;
import com.consignado.api.domain.product.dto.ProductResponse;
import com.consignado.api.domain.product.dto.ProductSummaryResponse;
import com.consignado.api.domain.product.dto.ProductTrackingResponse;
import com.consignado.api.domain.product.dto.UpdateProductStatusRequest;
import com.consignado.api.domain.reseller.Reseller;
import com.consignado.api.domain.reseller.ResellerRepository;
import com.consignado.api.domain.tenant.TenantRepository;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;
import com.consignado.api.shared.exception.ResourceNotFoundException;
import com.consignado.api.storage.SupabaseStorageService;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductImageRepository imageRepository;
    private final TenantRepository tenantRepository;
    private final SupabaseStorageService storageService;
    private final ConsignmentItemRepository consignmentItemRepository;
    private final ConsignmentRepository consignmentRepository;
    private final ResellerRepository resellerRepository;
    private final UserRepository userRepository;

    private static final Set<String> VALID_CATEGORIES = Set.of(
        "anel", "colar", "brinco", "pulseira", "tornozeleira", "conjunto", "outro"
    );

    @Transactional
    public ProductResponse create(ProductRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        log.info("Creating product for tenant={}", tenantId);

        var tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));
        var plan = TenantPlan.from(tenant.getPlan());
        var currentCount = productRepository.countByTenantIdAndDeletedAtIsNull(tenantId);
        if (currentCount >= plan.getMaxProducts()) {
            throw new BusinessException(
                "Limite de produtos atingido para o plano " + plan.getValue() +
                " (" + plan.getMaxProducts() + "). Faça upgrade do plano para adicionar mais.");
        }

        validateCategory(request.category());

        if (request.code() != null && !request.code().isBlank()) {
            if (productRepository.existsByCodeAndTenantId(request.code(), tenantId)) {
                throw new BusinessException("Código já cadastrado neste tenant");
            }
        }

        var product = new Product();
        product.setTenantId(tenantId);
        mapRequestToEntity(request, product);

        int stockTotal = request.stockTotal() != null ? request.stockTotal() : 0;
        product.setStockTotal(stockTotal);
        product.setStockAvailable(stockTotal);

        var saved = productRepository.save(product);
        log.info("Product created id={} tenant={}", saved.getId(), tenantId);
        return toResponse(saved, List.of());
    }

    @Transactional(readOnly = true)
    public ProductResponse findById(UUID id) {
        var tenantId = TenantContext.TENANT_ID.get();
        var product = resolveProduct(id, tenantId);
        var images = imageRepository.findByProductIdOrderByDisplayOrder(id);
        return toResponse(product, images);
    }

    @Transactional(readOnly = true)
    public Page<ProductSummaryResponse> findAll(ProductFilterRequest filter, Pageable pageable) {
        var tenantId = TenantContext.TENANT_ID.get();
        var spec = buildSpec(filter, tenantId);
        var page = productRepository.findAll(spec, pageable);

        var productIds = page.stream().map(Product::getId).collect(Collectors.toSet());
        Map<UUID, String> primaryUrls = imageRepository
            .findByProductIdInAndIsPrimaryTrue(productIds)
            .stream()
            .collect(Collectors.toMap(
                img -> img.getProduct().getId(),
                img -> storageService.getPublicUrl(img.getStoragePath())
            ));

        return page.map(p -> toSummary(p, primaryUrls.get(p.getId())));
    }

    @Transactional
    public ProductResponse update(UUID id, ProductRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        var product = resolveProduct(id, tenantId);

        validateCategory(request.category());

        if (request.code() != null && !request.code().isBlank()
                && !request.code().equals(product.getCode())) {
            if (productRepository.existsByCodeAndTenantId(request.code(), tenantId)) {
                throw new BusinessException("Código já cadastrado neste tenant");
            }
        }

        if (request.stockTotal() != null) {
            int delta = request.stockTotal() - product.getStockTotal();
            int newAvailable = product.getStockAvailable() + delta;
            if (newAvailable < 0) {
                throw new BusinessException("Redução excede o estoque disponível");
            }
            product.setStockTotal(request.stockTotal());
            product.setStockAvailable(newAvailable);
        }

        mapRequestToEntity(request, product);
        var saved = productRepository.save(product);
        var images = imageRepository.findByProductIdOrderByDisplayOrder(id);
        log.info("Product updated id={} tenant={}", id, tenantId);
        return toResponse(saved, images);
    }

    @Transactional
    public void updateStatus(UUID id, boolean active) {
        var tenantId = TenantContext.TENANT_ID.get();
        var product = resolveProduct(id, tenantId);
        product.setActive(active);
        productRepository.save(product);
        log.info("Product status updated id={} active={}", id, active);
    }

    @Transactional(readOnly = true)
    public ProductTrackingResponse getTracking(UUID id) {
        var tenantId = TenantContext.TENANT_ID.get();
        var product = resolveProduct(id, tenantId);

        var items = consignmentItemRepository.findByProductIdAndTenantId(id, tenantId);
        var activeItems = items.stream()
            .filter(i -> {
                int remaining = i.getQuantitySent() - i.getQuantitySold()
                    - i.getQuantityReturned() - i.getQuantityLost();
                return remaining > 0;
            }).toList();

        int onConsignment = activeItems.stream()
            .mapToInt(i -> i.getQuantitySent() - i.getQuantitySold()
                - i.getQuantityReturned() - i.getQuantityLost())
            .sum();
        int totalSold = items.stream().mapToInt(ConsignmentItem::getQuantitySold).sum();
        int totalReturned = items.stream().mapToInt(ConsignmentItem::getQuantityReturned).sum();
        int totalLost = items.stream().mapToInt(ConsignmentItem::getQuantityLost).sum();
        BigDecimal totalConsignedValue = product.getSalePrice()
            .multiply(BigDecimal.valueOf(onConsignment))
            .setScale(2, RoundingMode.HALF_UP);

        var consignmentIds = activeItems.stream().map(ConsignmentItem::getConsignmentId).collect(Collectors.toSet());
        Map<UUID, Consignment> consignmentMap = consignmentIds.isEmpty() ? Map.of()
            : consignmentRepository.findAllById(consignmentIds).stream()
                .collect(Collectors.toMap(Consignment::getId, c -> c));

        var resellerIds = consignmentMap.values().stream().map(Consignment::getResellerId).collect(Collectors.toSet());
        var managerIds = consignmentMap.values().stream().map(Consignment::getManagerId).collect(Collectors.toSet());
        Map<UUID, String> resellerNames = resellerRepository.findAllById(resellerIds).stream()
            .collect(Collectors.toMap(Reseller::getId, Reseller::getName));
        Map<UUID, String> managerNames = userRepository.findAllById(managerIds).stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        var locations = activeItems.stream()
            .filter(i -> consignmentMap.containsKey(i.getConsignmentId()))
            .map(i -> {
                var c = consignmentMap.get(i.getConsignmentId());
                int qty = i.getQuantitySent() - i.getQuantitySold()
                    - i.getQuantityReturned() - i.getQuantityLost();
                return new ProductTrackingResponse.ConsignmentLocation(
                    c.getId(), c.getResellerId(),
                    resellerNames.getOrDefault(c.getResellerId(), ""),
                    c.getManagerId(),
                    managerNames.getOrDefault(c.getManagerId(), ""),
                    qty, c.getDeliveredAt()
                );
            }).toList();

        return new ProductTrackingResponse(
            product.getId(), product.getCode(), product.getName(),
            product.getStockTotal(), product.getStockAvailable(),
            onConsignment, totalSold, totalReturned, totalLost,
            totalConsignedValue, locations
        );
    }

    @Transactional
    public ProductImageResponse addImage(UUID productId, MultipartFile file) {
        var tenantId = TenantContext.TENANT_ID.get();
        var product = resolveProduct(productId, tenantId);

        int currentCount = imageRepository.countByProductId(productId);
        var folder = tenantId + "/products/" + productId;
        var storagePath = storageService.upload(folder, file);

        var image = new ProductImage();
        image.setTenantId(tenantId);
        image.setProduct(product);
        image.setStoragePath(storagePath);
        image.setDisplayOrder(currentCount);
        image.setPrimary(currentCount == 0);

        var saved = imageRepository.save(image);
        log.info("Image added productId={} primary={}", productId, saved.isPrimary());
        return toImageResponse(saved);
    }

    @Transactional
    public void deleteImage(UUID productId, UUID imageId) {
        var tenantId = TenantContext.TENANT_ID.get();
        resolveProduct(productId, tenantId);

        var image = imageRepository.findByIdAndTenantId(imageId, tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Imagem", imageId));

        storageService.delete(image.getStoragePath());
        imageRepository.delete(image);

        if (image.isPrimary()) {
            imageRepository.findByProductIdOrderByDisplayOrder(productId)
                .stream().findFirst()
                .ifPresent(first -> {
                    first.setPrimary(true);
                    imageRepository.save(first);
                });
        }
        log.info("Image deleted imageId={} productId={}", imageId, productId);
    }

    @Transactional
    public void setPrimaryImage(UUID productId, UUID imageId) {
        var tenantId = TenantContext.TENANT_ID.get();
        resolveProduct(productId, tenantId);

        var images = imageRepository.findByProductIdOrderByDisplayOrder(productId);
        images.forEach(img -> {
            boolean shouldBePrimary = img.getId().equals(imageId);
            if (img.isPrimary() != shouldBePrimary) {
                img.setPrimary(shouldBePrimary);
                imageRepository.save(img);
            }
        });

        boolean found = images.stream().anyMatch(img -> img.getId().equals(imageId));
        if (!found) {
            throw new ResourceNotFoundException("Imagem", imageId);
        }
        log.info("Primary image set imageId={} productId={}", imageId, productId);
    }

    private Product resolveProduct(UUID id, UUID tenantId) {
        return productRepository.findByIdAndDeletedAtIsNull(id)
            .filter(p -> p.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Produto", id));
    }

    private void validateCategory(String category) {
        if (!VALID_CATEGORIES.contains(category.toLowerCase())) {
            throw new BusinessException("Categoria inválida: " + category);
        }
    }

    private Specification<Product> buildSpec(ProductFilterRequest filter, UUID tenantId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            predicates.add(cb.equal(root.get("tenantId"), tenantId));

            if (filter.search() != null && !filter.search().isBlank()) {
                var pattern = "%" + filter.search().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("code")), pattern)
                ));
            }

            if (filter.category() != null && !filter.category().isBlank()) {
                predicates.add(cb.equal(root.get("category"), filter.category().toLowerCase()));
            }

            if (filter.active() != null) {
                predicates.add(cb.equal(root.get("active"), filter.active()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private void mapRequestToEntity(ProductRequest request, Product product) {
        product.setName(request.name());
        product.setCode(request.code());
        product.setDescription(request.description());
        product.setCategory(request.category().toLowerCase());
        product.setSalePrice(request.salePrice());
        product.setCostPrice(request.costPrice());
        if (request.commissionRate() != null) {
            product.setCommissionRate(request.commissionRate());
        }
    }

    private ProductResponse toResponse(Product p, List<ProductImage> images) {
        return new ProductResponse(
            p.getId(), p.getCode(), p.getName(), p.getDescription(), p.getCategory(),
            p.getCostPrice(), p.getSalePrice(), p.getCommissionRate(),
            p.getStockTotal(), p.getStockAvailable(), p.isActive(),
            images.stream().map(this::toImageResponse).toList(),
            p.getCreatedAt(), p.getUpdatedAt()
        );
    }

    private ProductSummaryResponse toSummary(Product p, String primaryImageUrl) {
        return new ProductSummaryResponse(
            p.getId(), p.getCode(), p.getName(), p.getCategory(),
            p.getSalePrice(), p.getStockTotal(), p.getStockAvailable(),
            p.isActive(), primaryImageUrl, p.getCreatedAt()
        );
    }

    private ProductImageResponse toImageResponse(ProductImage img) {
        return new ProductImageResponse(
            img.getId(), img.getStoragePath(),
            storageService.getPublicUrl(img.getStoragePath()),
            img.getDisplayOrder(), img.isPrimary(), img.getCreatedAt()
        );
    }
}
