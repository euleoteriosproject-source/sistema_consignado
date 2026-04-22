package com.consignado.api.domain.consignment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.consignment.dto.BatchMovementRequest;
import com.consignado.api.domain.consignment.dto.ConsignmentFilterRequest;
import com.consignado.api.domain.consignment.dto.ConsignmentItemMovementResponse;
import com.consignado.api.domain.consignment.dto.ConsignmentItemRequest;
import com.consignado.api.domain.consignment.dto.ConsignmentItemResponse;
import com.consignado.api.domain.consignment.dto.ConsignmentRequest;
import com.consignado.api.domain.consignment.dto.ConsignmentResponse;
import com.consignado.api.domain.consignment.dto.ConsignmentSummaryResponse;
import com.consignado.api.domain.consignment.dto.MovementRequest;
import com.consignado.api.domain.consignment.dto.SettleRequest;
import com.consignado.api.domain.product.Product;
import com.consignado.api.domain.product.ProductRepository;
import com.consignado.api.domain.reseller.Reseller;
import com.consignado.api.domain.reseller.ResellerRepository;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;
import com.consignado.api.shared.exception.ResourceNotFoundException;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class ConsignmentService {

    private final ConsignmentRepository consignmentRepository;
    private final ConsignmentItemRepository itemRepository;
    private final ConsignmentItemMovementRepository movementRepository;
    private final ResellerRepository resellerRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Transactional
    public ConsignmentResponse create(ConsignmentRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        var userId = TenantContext.USER_ID.get();
        log.info("Creating consignment for tenant={} reseller={}", tenantId, request.resellerId());

        var reseller = resellerRepository.findByIdAndDeletedAtIsNull(request.resellerId())
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", request.resellerId()));

        if (!"active".equalsIgnoreCase(reseller.getStatus())) {
            throw new BusinessException("Não é possível criar lote para revendedor(a) inativo(a). Ative o cadastro primeiro.");
        }

        // Validate all products and stock before persisting anything
        Map<UUID, Product> productMap = new HashMap<>();
        for (ConsignmentItemRequest itemReq : request.items()) {
            var product = productRepository.findByIdAndDeletedAtIsNull(itemReq.productId())
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Produto", itemReq.productId()));
            if (product.getStockAvailable() < itemReq.quantitySent()) {
                throw new BusinessException("Estoque insuficiente para: " + product.getName());
            }
            productMap.put(product.getId(), product);
        }

        var consignment = new Consignment();
        consignment.setTenantId(tenantId);
        consignment.setResellerId(request.resellerId());
        consignment.setManagerId(userId);
        consignment.setDeliveredAt(request.deliveredAt() != null ? request.deliveredAt() : LocalDate.now());
        consignment.setExpectedReturnAt(request.expectedReturnAt());
        consignment.setNotes(request.notes());
        var saved = consignmentRepository.save(consignment);

        for (ConsignmentItemRequest itemReq : request.items()) {
            var product = productMap.get(itemReq.productId());
            var item = new ConsignmentItem();
            item.setTenantId(tenantId);
            item.setConsignmentId(saved.getId());
            item.setProductId(itemReq.productId());
            item.setQuantitySent(itemReq.quantitySent());
            item.setSalePrice(product.getSalePrice());
            item.setCommissionRate(product.getCommissionRate());
            itemRepository.save(item);

            product.setStockAvailable(product.getStockAvailable() - itemReq.quantitySent());
            productRepository.save(product);
        }

        var items = itemRepository.findByConsignmentId(saved.getId());
        log.info("Consignment created id={} items={}", saved.getId(), items.size());
        return toResponse(saved, reseller, items, productMap);
    }

    @Transactional(readOnly = true)
    public ConsignmentResponse findById(UUID id) {
        var tenantId = TenantContext.TENANT_ID.get();
        var consignment = resolveConsignment(id, tenantId);
        var reseller = resellerRepository.findById(consignment.getResellerId())
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", consignment.getResellerId()));
        var items = itemRepository.findByConsignmentId(id);
        var productMap = loadProductMap(items);
        return toResponse(consignment, reseller, items, productMap);
    }

    @Transactional(readOnly = true)
    public Page<ConsignmentSummaryResponse> findAll(ConsignmentFilterRequest filter, Pageable pageable) {
        var tenantId = TenantContext.TENANT_ID.get();
        var role = TenantContext.ROLE.get();
        var userId = TenantContext.USER_ID.get();

        var spec = buildSpec(filter, tenantId, role, userId);
        var page = consignmentRepository.findAll(spec, pageable);

        var resellerIds = page.stream().map(Consignment::getResellerId).collect(Collectors.toSet());
        var managerIds  = page.stream().map(Consignment::getManagerId).collect(Collectors.toSet());
        var consignmentIds = page.stream().map(Consignment::getId).toList();

        Map<UUID, String> resellers = resellerRepository.findAllById(resellerIds).stream()
            .collect(Collectors.toMap(Reseller::getId, Reseller::getName));
        Map<UUID, String> managers = userRepository.findAllById(managerIds).stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        Map<UUID, Integer> totalItemsMap = new HashMap<>();
        Map<UUID, Integer> totalSoldMap   = new HashMap<>();
        Map<UUID, Integer> totalReturnedMap = new HashMap<>();
        Map<UUID, Integer> totalLostMap   = new HashMap<>();
        Map<UUID, BigDecimal> totalValuesMap = new HashMap<>();
        if (!consignmentIds.isEmpty()) {
            for (var row : itemRepository.aggregateTotalsByConsignmentIds(consignmentIds)) {
                UUID cid = (UUID) row[0];
                totalItemsMap.put(cid, ((Number) row[1]).intValue());
                totalSoldMap.put(cid, ((Number) row[2]).intValue());
                totalReturnedMap.put(cid, ((Number) row[3]).intValue());
                totalLostMap.put(cid, ((Number) row[4]).intValue());
                totalValuesMap.put(cid, (BigDecimal) row[5]);
            }
        }

        return page.map(c -> toSummary(c,
            resellers.getOrDefault(c.getResellerId(), ""),
            managers.getOrDefault(c.getManagerId(), ""),
            totalItemsMap.getOrDefault(c.getId(), 0),
            totalSoldMap.getOrDefault(c.getId(), 0),
            totalReturnedMap.getOrDefault(c.getId(), 0),
            totalLostMap.getOrDefault(c.getId(), 0),
            totalValuesMap.getOrDefault(c.getId(), BigDecimal.ZERO)));
    }

    @Transactional(readOnly = true)
    public List<ConsignmentSummaryResponse> findByReseller(UUID resellerId) {
        var tenantId = TenantContext.TENANT_ID.get();
        resellerRepository.findByIdAndDeletedAtIsNull(resellerId)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", resellerId));

        var consignments = consignmentRepository.findByResellerIdAndTenantId(resellerId, tenantId);
        var resellerName = resellerRepository.findById(resellerId).map(Reseller::getName).orElse("");

        var managerIds = consignments.stream().map(Consignment::getManagerId).collect(Collectors.toSet());
        Map<UUID, String> managers = userRepository.findAllById(managerIds).stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        var ids = consignments.stream().map(Consignment::getId).toList();
        Map<UUID, Integer> totalItemsMap    = new HashMap<>();
        Map<UUID, Integer> totalSoldMap     = new HashMap<>();
        Map<UUID, Integer> totalReturnedMap = new HashMap<>();
        Map<UUID, Integer> totalLostMap     = new HashMap<>();
        Map<UUID, BigDecimal> totalValuesMap = new HashMap<>();
        if (!ids.isEmpty()) {
            for (var row : itemRepository.aggregateTotalsByConsignmentIds(ids)) {
                UUID cid = (UUID) row[0];
                totalItemsMap.put(cid, ((Number) row[1]).intValue());
                totalSoldMap.put(cid, ((Number) row[2]).intValue());
                totalReturnedMap.put(cid, ((Number) row[3]).intValue());
                totalLostMap.put(cid, ((Number) row[4]).intValue());
                totalValuesMap.put(cid, (BigDecimal) row[5]);
            }
        }

        return consignments.stream()
            .map(c -> toSummary(c, resellerName, managers.getOrDefault(c.getManagerId(), ""),
                totalItemsMap.getOrDefault(c.getId(), 0),
                totalSoldMap.getOrDefault(c.getId(), 0),
                totalReturnedMap.getOrDefault(c.getId(), 0),
                totalLostMap.getOrDefault(c.getId(), 0),
                totalValuesMap.getOrDefault(c.getId(), BigDecimal.ZERO)))
            .toList();
    }

    @Transactional
    public ConsignmentResponse registerBatchMovement(UUID consignmentId, BatchMovementRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        var consignment = resolveConsignment(consignmentId, tenantId);

        if ("settled".equals(consignment.getStatus())) {
            throw new BusinessException("Consignado já encerrado");
        }

        for (var movement : request.movements()) {
            if (movement.quantitySold() == 0 && movement.quantityReturned() == 0 && movement.quantityLost() == 0) {
                continue;
            }
            var item = resolveItem(movement.itemId(), consignmentId, tenantId);
            int avail = remaining(item);

            int total = movement.quantitySold() + movement.quantityReturned() + movement.quantityLost();
            if (total > avail) {
                throw new BusinessException("Total de movimentações excede saldo disponível do item: " + movement.itemId());
            }

            if (movement.quantitySold() > 0) {
                item.setQuantitySold(item.getQuantitySold() + movement.quantitySold());
                saveMovement(tenantId, consignmentId, item.getId(), "sold", movement.quantitySold());
            }
            if (movement.quantityReturned() > 0) {
                item.setQuantityReturned(item.getQuantityReturned() + movement.quantityReturned());
                var product = productRepository.findById(item.getProductId()).orElseThrow();
                product.setStockAvailable(product.getStockAvailable() + movement.quantityReturned());
                productRepository.save(product);
                saveMovement(tenantId, consignmentId, item.getId(), "returned", movement.quantityReturned());
            }
            if (movement.quantityLost() > 0) {
                item.setQuantityLost(item.getQuantityLost() + movement.quantityLost());
                saveMovement(tenantId, consignmentId, item.getId(), "lost", movement.quantityLost());
            }

            updateItemStatus(item);
            itemRepository.save(item);
        }

        updateConsignmentStatus(consignment);
        consignmentRepository.save(consignment);

        // When batch movement fully settles the consignment, finalize stockTotal
        // (normally done by settle(), but settle() may be skipped or the status may already be "settled")
        if ("settled".equals(consignment.getStatus())) {
            finalizeStockTotals(consignmentId);
        }

        var items = itemRepository.findByConsignmentId(consignmentId);
        var reseller = resellerRepository.findById(consignment.getResellerId()).orElseThrow();
        log.info("Batch movement registered consignmentId={}", consignmentId);
        return toResponse(consignment, reseller, items, loadProductMap(items));
    }

    @Transactional
    public ConsignmentResponse registerMovement(UUID consignmentId, MovementRequest request) {
        ConsignmentEvent event = switch (request.type().toLowerCase()) {
            case "sold"     -> new ItemSold(request.itemId(), request.quantity(), null);
            case "returned" -> new ItemReturned(request.itemId(), request.quantity());
            case "lost"     -> new ItemLost(request.itemId(), request.quantity());
            default -> throw new BusinessException("Tipo de movimento inválido: " + request.type());
        };
        return processMovement(consignmentId, event);
    }

    @Transactional
    public ConsignmentResponse settle(UUID consignmentId, SettleRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        var consignment = resolveConsignment(consignmentId, tenantId);

        // Idempotent: if already settled (e.g. batch movement settled it first), return silently
        if ("settled".equals(consignment.getStatus())) {
            var existingItems = itemRepository.findByConsignmentId(consignmentId);
            var reseller = resellerRepository.findById(consignment.getResellerId()).orElseThrow();
            log.info("Consignment already settled id={}, returning current state", consignmentId);
            return toResponse(consignment, reseller, existingItems, loadProductMap(existingItems));
        }

        var items = itemRepository.findByConsignmentId(consignmentId);
        Map<UUID, Product> productMap = new HashMap<>();

        for (var item : items) {
            int remaining = remaining(item);
            var product = productRepository.findById(item.getProductId()).orElseThrow();
            productMap.put(product.getId(), product);

            if (remaining > 0) {
                item.setQuantityReturned(item.getQuantityReturned() + remaining);
                product.setStockAvailable(product.getStockAvailable() + remaining);
            }

            int soldAndLost = item.getQuantitySold() + item.getQuantityLost();
            if (soldAndLost > 0) {
                product.setStockTotal(Math.max(0, product.getStockTotal() - soldAndLost));
            }

            item.setStatus("settled");
            itemRepository.save(item);
            productRepository.save(product);
        }

        consignment.setStatus("settled");
        if (request != null && request.notes() != null && !request.notes().isBlank()) {
            consignment.setNotes(request.notes());
        }
        consignmentRepository.save(consignment);

        var reseller = resellerRepository.findById(consignment.getResellerId()).orElseThrow();
        log.info("Consignment settled id={}", consignmentId);
        return toResponse(consignment, reseller, items, productMap);
    }

    private ConsignmentResponse processMovement(UUID consignmentId, ConsignmentEvent event) {
        var tenantId = TenantContext.TENANT_ID.get();
        var consignment = resolveConsignment(consignmentId, tenantId);

        if ("settled".equals(consignment.getStatus())) {
            throw new BusinessException("Consignado já encerrado");
        }

        switch (event) {
            case ItemSold e -> {
                var item = resolveItem(e.itemId(), consignmentId, tenantId);
                if (e.quantity() > remaining(item)) {
                    throw new BusinessException("Quantidade excede saldo disponível do item");
                }
                item.setQuantitySold(item.getQuantitySold() + e.quantity());
                updateItemStatus(item);
                itemRepository.save(item);
                saveMovement(tenantId, consignmentId, item.getId(), "sold", e.quantity());
            }
            case ItemReturned e -> {
                var item = resolveItem(e.itemId(), consignmentId, tenantId);
                if (e.quantity() > remaining(item)) {
                    throw new BusinessException("Quantidade excede saldo disponível do item");
                }
                item.setQuantityReturned(item.getQuantityReturned() + e.quantity());
                updateItemStatus(item);
                itemRepository.save(item);
                var product = productRepository.findById(item.getProductId()).orElseThrow();
                product.setStockAvailable(product.getStockAvailable() + e.quantity());
                productRepository.save(product);
                saveMovement(tenantId, consignmentId, item.getId(), "returned", e.quantity());
            }
            case ItemLost e -> {
                var item = resolveItem(e.itemId(), consignmentId, tenantId);
                if (e.quantity() > remaining(item)) {
                    throw new BusinessException("Quantidade excede saldo disponível do item");
                }
                item.setQuantityLost(item.getQuantityLost() + e.quantity());
                updateItemStatus(item);
                itemRepository.save(item);
                saveMovement(tenantId, consignmentId, item.getId(), "lost", e.quantity());
            }
            default -> throw new BusinessException("Evento de consignado inválido");
        }

        updateConsignmentStatus(consignment);
        consignmentRepository.save(consignment);

        var items = itemRepository.findByConsignmentId(consignmentId);
        var reseller = resellerRepository.findById(consignment.getResellerId()).orElseThrow();
        return toResponse(consignment, reseller, items, loadProductMap(items));
    }

    private Consignment resolveConsignment(UUID id, UUID tenantId) {
        return consignmentRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Consignado", id));
    }

    private ConsignmentItem resolveItem(UUID itemId, UUID consignmentId, UUID tenantId) {
        return itemRepository.findByIdAndConsignmentIdAndTenantId(itemId, consignmentId, tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Item de consignado", itemId));
    }

    private int remaining(ConsignmentItem item) {
        return item.getQuantitySent() - item.getQuantitySold()
             - item.getQuantityReturned() - item.getQuantityLost();
    }

    private void updateItemStatus(ConsignmentItem item) {
        int accounted = item.getQuantitySold() + item.getQuantityReturned() + item.getQuantityLost();
        if (accounted == 0) {
            item.setStatus("pending");
        } else if (accounted < item.getQuantitySent()) {
            item.setStatus("partially_settled");
        } else {
            item.setStatus("settled");
        }
    }

    private void updateConsignmentStatus(Consignment consignment) {
        var items = itemRepository.findByConsignmentId(consignment.getId());
        long settled = items.stream().filter(i -> "settled".equals(i.getStatus())).count();
        long partial = items.stream().filter(i -> "partially_settled".equals(i.getStatus())).count();

        if (settled == items.size() && !items.isEmpty()) {
            consignment.setStatus("settled");
        } else if (settled > 0 || partial > 0) {
            if (!"overdue".equals(consignment.getStatus())) {
                consignment.setStatus("partially_settled");
            }
        }
    }

    private Map<UUID, Product> loadProductMap(List<ConsignmentItem> items) {
        var productIds = items.stream().map(ConsignmentItem::getProductId).collect(Collectors.toSet());
        return productRepository.findAllById(productIds).stream()
            .collect(Collectors.toMap(Product::getId, p -> p));
    }

    private Specification<Consignment> buildSpec(ConsignmentFilterRequest f, UUID tenantId,
                                                  String role, UUID userId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));

            if ("manager".equalsIgnoreCase(role)) {
                predicates.add(cb.equal(root.get("managerId"), userId));
            }
            if (f.status() != null && !f.status().isBlank()) {
                predicates.add(cb.equal(root.get("status"), f.status().toLowerCase()));
            }
            if (f.resellerId() != null) {
                predicates.add(cb.equal(root.get("resellerId"), f.resellerId()));
            }
            if (f.managerId() != null) {
                predicates.add(cb.equal(root.get("managerId"), f.managerId()));
            }
            if (f.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("deliveredAt"), f.from()));
            }
            if (f.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("deliveredAt"), f.to()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private ConsignmentResponse toResponse(Consignment c, Reseller reseller,
                                            List<ConsignmentItem> items, Map<UUID, Product> productMap) {
        var managerName = userRepository.findById(c.getManagerId()).map(User::getName).orElse("");

        var itemResponses = items.stream()
            .map(item -> toItemResponse(item, productMap.get(item.getProductId())))
            .toList();

        var totalSentValue = items.stream()
            .map(i -> i.getSalePrice().multiply(BigDecimal.valueOf(i.getQuantitySent())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        var totalSoldValue = items.stream()
            .map(i -> i.getSalePrice().multiply(BigDecimal.valueOf(i.getQuantitySold())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ConsignmentResponse(
            c.getId(), c.getResellerId(), reseller.getName(),
            c.getManagerId(), managerName,
            c.getDeliveredAt(), c.getExpectedReturnAt(), c.getStatus(), c.getNotes(),
            itemResponses, totalSentValue, totalSoldValue,
            c.getCreatedAt(), c.getUpdatedAt()
        );
    }

    private ConsignmentSummaryResponse toSummary(Consignment c, String resellerName, String managerName,
                                                  int totalItems, int totalSold, int totalReturned,
                                                  int totalLost, BigDecimal totalValue) {
        return new ConsignmentSummaryResponse(
            c.getId(), c.getResellerId(), resellerName,
            c.getManagerId(), managerName,
            c.getDeliveredAt(), c.getExpectedReturnAt(), c.getStatus(),
            totalItems, totalSold, totalReturned, totalLost, totalValue,
            c.getCreatedAt(), c.getUpdatedAt()
        );
    }

    private ConsignmentItemResponse toItemResponse(ConsignmentItem item, Product product) {
        var soldValue = item.getSalePrice()
            .multiply(BigDecimal.valueOf(item.getQuantitySold()))
            .setScale(2, RoundingMode.HALF_UP);
        var commissionValue = soldValue
            .multiply(item.getCommissionRate())
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        var movements = movementRepository.findByItemIdOrderByCreatedAtAsc(item.getId()).stream()
            .map(m -> new ConsignmentItemMovementResponse(
                m.getId(), m.getMovementType(), m.getQuantity(), m.getNotes(), m.getCreatedAt()))
            .toList();

        return new ConsignmentItemResponse(
            item.getId(),
            item.getProductId(),
            product != null ? product.getName() : "",
            product != null ? product.getCode() : "",
            item.getQuantitySent(), item.getQuantitySold(),
            item.getQuantityReturned(), item.getQuantityLost(),
            item.getSalePrice(), item.getCommissionRate(), item.getStatus(),
            soldValue, commissionValue, movements
        );
    }

    private void finalizeStockTotals(UUID consignmentId) {
        for (var item : itemRepository.findByConsignmentId(consignmentId)) {
            int soldAndLost = item.getQuantitySold() + item.getQuantityLost();
            if (soldAndLost > 0) {
                var product = productRepository.findById(item.getProductId()).orElseThrow();
                product.setStockTotal(Math.max(0, product.getStockTotal() - soldAndLost));
                productRepository.save(product);
            }
        }
    }

    private void saveMovement(UUID tenantId, UUID consignmentId, UUID itemId, String type, int quantity) {
        var m = new ConsignmentItemMovement();
        m.setTenantId(tenantId);
        m.setConsignmentId(consignmentId);
        m.setItemId(itemId);
        m.setMovementType(type);
        m.setQuantity(quantity);
        movementRepository.save(m);
    }
}
