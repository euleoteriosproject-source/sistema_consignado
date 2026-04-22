package com.consignado.api.domain.settlement;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.consignment.Consignment;
import com.consignado.api.domain.consignment.ConsignmentItemRepository;
import com.consignado.api.domain.consignment.ConsignmentRepository;
import com.consignado.api.domain.reseller.Reseller;
import com.consignado.api.domain.reseller.ResellerRepository;
import com.consignado.api.domain.reseller.dto.ResellerBalanceResponse;
import com.consignado.api.domain.settlement.dto.SettlementFilterRequest;
import com.consignado.api.domain.settlement.dto.SettlementRequest;
import com.consignado.api.domain.settlement.dto.SettlementResponse;
import com.consignado.api.domain.settlement.dto.SettlementsSummaryResponse;
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
public class SettlementService {

    private final SettlementRepository settlementRepository;
    private final ConsignmentRepository consignmentRepository;
    private final ConsignmentItemRepository itemRepository;
    private final ResellerRepository resellerRepository;
    private final UserRepository userRepository;

    @Transactional
    public SettlementResponse create(SettlementRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        var userId = TenantContext.USER_ID.get();
        log.info("Creating settlement for tenant={} reseller={}", tenantId, request.resellerId());

        resellerRepository.findByIdAndDeletedAtIsNull(request.resellerId())
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", request.resellerId()));

        BigDecimal totalSoldValue;
        BigDecimal totalCommission;

        if (request.totalSoldValue() != null && request.totalCommission() != null) {
            // Explicit values provided (allow linking consignmentId for tracking without recalculating)
            totalSoldValue = request.totalSoldValue();
            totalCommission = request.totalCommission();
        } else if (request.consignmentId() != null) {
            var items = itemRepository.findByConsignmentId(request.consignmentId());
            totalSoldValue = items.stream()
                .map(i -> i.getSalePrice().multiply(BigDecimal.valueOf(i.getQuantitySold())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            totalCommission = items.stream()
                .map(i -> i.getSalePrice()
                    .multiply(BigDecimal.valueOf(i.getQuantitySold()))
                    .multiply(i.getCommissionRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            throw new BusinessException("totalSoldValue e totalCommission são obrigatórios");
        }

        var netToReceive = totalSoldValue.subtract(totalCommission);

        var settlement = new Settlement();
        settlement.setTenantId(tenantId);
        settlement.setResellerId(request.resellerId());
        settlement.setManagerId(userId);
        settlement.setConsignmentId(request.consignmentId());
        settlement.setSettlementDate(request.settlementDate() != null ? request.settlementDate() : LocalDate.now());
        settlement.setTotalSoldValue(totalSoldValue);
        settlement.setTotalCommission(totalCommission);
        settlement.setNetToReceive(netToReceive);
        settlement.setPaymentMethod(request.paymentMethod().toLowerCase());
        settlement.setNotes(request.notes());

        var saved = settlementRepository.save(settlement);
        log.info("Settlement created id={} netToReceive={}", saved.getId(), netToReceive);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<SettlementResponse> findAll(SettlementFilterRequest filter, Pageable pageable) {
        var tenantId = TenantContext.TENANT_ID.get();
        var role = TenantContext.ROLE.get();
        var userId = TenantContext.USER_ID.get();
        return settlementRepository.findAll(buildSpec(filter, tenantId, role, userId), pageable)
            .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public SettlementsSummaryResponse getSummary(SettlementFilterRequest filter) {
        var tenantId = TenantContext.TENANT_ID.get();
        var role = TenantContext.ROLE.get();
        var userId = TenantContext.USER_ID.get();
        var settlements = settlementRepository.findAll(buildSpec(filter, tenantId, role, userId));

        // Include ALL consignment statuses so settled-but-unacertado consignments are counted
        var allStatuses = List.of("open", "partially_settled", "overdue", "settled");
        List<com.consignado.api.domain.consignment.Consignment> relevantConsignments =
            "manager".equalsIgnoreCase(role)
                ? consignmentRepository.findByManagerIdAndStatusIn(userId, allStatuses)
                : consignmentRepository.findByTenantIdAndStatusIn(tenantId, allStatuses);
        var allIds = relevantConsignments.stream().map(Consignment::getId).toList();

        BigDecimal totalPendingReceivable = BigDecimal.ZERO;
        if (!allIds.isEmpty()) {
            BigDecimal netSold = BigDecimal.ZERO;
            for (var row : itemRepository.aggregateSoldValueByConsignmentIds(allIds)) {
                BigDecimal gross = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
                BigDecimal commission = row[2] != null ? (BigDecimal) row[2] : BigDecimal.ZERO;
                netSold = netSold.add(gross.subtract(commission));
            }
            BigDecimal alreadySettled = BigDecimal.ZERO;
            for (var row : settlementRepository.sumNetToReceiveByConsignmentIds(allIds)) {
                if (row[1] != null) alreadySettled = alreadySettled.add((BigDecimal) row[1]);
            }
            totalPendingReceivable = netSold.subtract(alreadySettled).max(BigDecimal.ZERO);
        }

        return new SettlementsSummaryResponse(
            settlements.size(),
            settlements.stream().map(Settlement::getTotalSoldValue).reduce(BigDecimal.ZERO, BigDecimal::add),
            settlements.stream().map(Settlement::getTotalCommission).reduce(BigDecimal.ZERO, BigDecimal::add),
            settlements.stream().map(Settlement::getNetToReceive).reduce(BigDecimal.ZERO, BigDecimal::add),
            totalPendingReceivable
        );
    }

    @Transactional(readOnly = true)
    public ResellerBalanceResponse getResellerBalance(UUID resellerId) {
        var tenantId = TenantContext.TENANT_ID.get();
        var reseller = resellerRepository.findByIdAndDeletedAtIsNull(resellerId)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", resellerId));

        var openConsignments = consignmentRepository.findByResellerIdAndTenantId(resellerId, tenantId)
            .stream().filter(c -> !"settled".equals(c.getStatus())).toList();

        var openIds = openConsignments.stream().map(Consignment::getId).toList();

        var totalSentValue = BigDecimal.ZERO;
        var totalSoldValue = BigDecimal.ZERO;
        var totalCommissionDue = BigDecimal.ZERO;

        if (!openIds.isEmpty()) {
            var items = itemRepository.findByConsignmentIdIn(openIds);
            for (var item : items) {
                totalSentValue = totalSentValue.add(
                    item.getSalePrice().multiply(BigDecimal.valueOf(item.getQuantitySent())));
                var soldVal = item.getSalePrice().multiply(BigDecimal.valueOf(item.getQuantitySold()));
                totalSoldValue = totalSoldValue.add(soldVal);
                totalCommissionDue = totalCommissionDue.add(
                    soldVal.multiply(item.getCommissionRate())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
            }
        }

        var settlements = settlementRepository.findByResellerIdAndTenantId(resellerId, tenantId);
        var lastSettlementDate = settlements.stream()
            .map(Settlement::getSettlementDate)
            .max(Comparator.naturalOrder())
            .orElse(null);

        return new ResellerBalanceResponse(
            resellerId, reseller.getName(), openConsignments.size(),
            totalSentValue, totalSoldValue, totalCommissionDue,
            totalSoldValue.subtract(totalCommissionDue),
            settlements.size(), lastSettlementDate
        );
    }

    private Specification<Settlement> buildSpec(SettlementFilterRequest f, UUID tenantId,
                                                 String role, UUID userId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            if ("manager".equalsIgnoreCase(role)) {
                var sub = query.subquery(UUID.class);
                var resellerRoot = sub.from(com.consignado.api.domain.reseller.Reseller.class);
                sub.select(resellerRoot.get("id"))
                   .where(
                       cb.equal(resellerRoot.get("managerId"), userId),
                       cb.equal(resellerRoot.get("tenantId"), tenantId),
                       cb.isNull(resellerRoot.get("deletedAt"))
                   );
                predicates.add(root.get("resellerId").in(sub));
            }
            if (f.resellerId() != null) {
                predicates.add(cb.equal(root.get("resellerId"), f.resellerId()));
            }
            if (f.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("settlementDate"), f.from()));
            }
            if (f.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("settlementDate"), f.to()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private SettlementResponse toResponse(Settlement s) {
        var resellerName = resellerRepository.findById(s.getResellerId())
            .map(Reseller::getName).orElse("");
        var managerName = userRepository.findById(s.getManagerId())
            .map(User::getName).orElse("");
        return new SettlementResponse(
            s.getId(), s.getResellerId(), resellerName,
            s.getManagerId(), managerName, s.getConsignmentId(),
            s.getSettlementDate(), s.getTotalSoldValue(), s.getTotalCommission(),
            s.getNetToReceive(), s.getPaymentMethod(), s.getNotes(), s.getCreatedAt()
        );
    }
}
