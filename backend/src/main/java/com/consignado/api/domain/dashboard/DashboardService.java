package com.consignado.api.domain.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.consignment.Consignment;
import com.consignado.api.domain.consignment.ConsignmentItemRepository;
import com.consignado.api.domain.consignment.ConsignmentRepository;
import com.consignado.api.domain.dashboard.dto.DashboardAlertResponse;
import com.consignado.api.domain.dashboard.dto.DashboardChartResponse;
import com.consignado.api.domain.dashboard.dto.DashboardSummaryResponse;
import com.consignado.api.domain.dashboard.dto.DashboardTreeResponse;
import com.consignado.api.domain.reseller.Reseller;
import com.consignado.api.domain.reseller.ResellerRepository;
import com.consignado.api.domain.settlement.Settlement;
import com.consignado.api.domain.settlement.SettlementRepository;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class DashboardService {

    private final ConsignmentRepository consignmentRepository;
    private final ConsignmentItemRepository itemRepository;
    private final SettlementRepository settlementRepository;
    private final ResellerRepository resellerRepository;
    private final UserRepository userRepository;

    @Cacheable(value = "dashboard-summary-v2", key = "#tenantId.toString() + ':' + (#managerId != null ? #managerId.toString() : 'owner')")
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(UUID tenantId, UUID managerId) {
        boolean isManager = managerId != null;
        log.info("Computing dashboard summary for tenant={} manager={}", tenantId, managerId);

        long activeResellers = isManager
            ? resellerRepository.countByManagerIdAndStatusAndDeletedAtIsNull(managerId, "active")
            : resellerRepository.countByTenantIdAndStatusAndDeletedAtIsNull(tenantId, "active");

        // Contagem de lotes abertos: apenas reseller (exclui manager_stock para não duplicar)
        long openCount = isManager
            ? consignmentRepository.countByManagerIdAndStatus(managerId, "open")
                + consignmentRepository.countByManagerIdAndStatus(managerId, "partially_settled")
            : consignmentRepository.countByTenantIdAndConsignmentTypeAndStatus(tenantId, "reseller", "open")
                + consignmentRepository.countByTenantIdAndConsignmentTypeAndStatus(tenantId, "reseller", "partially_settled");

        long overdueCount = isManager
            ? consignmentRepository.countByManagerIdAndStatus(managerId, "overdue")
            : consignmentRepository.countByTenantIdAndConsignmentTypeAndStatus(tenantId, "reseller", "overdue");

        var activeStatuses = List.of("open", "partially_settled", "overdue");

        // Valor em circulação: APENAS lotes reseller para evitar dupla contagem.
        // Lotes manager_stock representam estoque do gestor — as mesmas peças
        // aparecem novamente nos lotes reseller quando o gestor distribui para revendedores.
        var activeConsignments = isManager
            ? consignmentRepository.findByManagerIdAndConsignmentTypeAndStatusIn(managerId, "reseller", activeStatuses)
            : consignmentRepository.findByTenantIdAndConsignmentTypeAndStatusIn(tenantId, "reseller", activeStatuses);
        var activeIds = activeConsignments.stream().map(Consignment::getId).toList();

        var totalOpenValue = BigDecimal.ZERO;
        var totalItems = 0;

        if (!activeIds.isEmpty()) {
            var items = itemRepository.findByConsignmentIdIn(activeIds);
            for (var item : items) {
                int onConsignment = item.getQuantitySent() - item.getQuantitySold()
                    - item.getQuantityReturned() - item.getQuantityLost();
                if (onConsignment > 0) {
                    totalItems += onConsignment;
                    totalOpenValue = totalOpenValue.add(
                        item.getSalePrice().multiply(BigDecimal.valueOf(onConsignment)));
                }
            }
        }

        var now = LocalDate.now();
        var allSettlements = settlementRepository
            .findByTenantIdAndSettlementDateBetween(tenantId, now.withDayOfMonth(1), now);
        var filteredSettlements = isManager
            ? allSettlements.stream().filter(s -> managerId.equals(s.getManagerId())).toList()
            : allSettlements;
        var totalSettledThisMonth = filteredSettlements.stream()
            .map(Settlement::getNetToReceive)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DashboardSummaryResponse(activeResellers, openCount, overdueCount, totalItems, totalOpenValue, totalSettledThisMonth);
    }

    @Cacheable(value = "dashboard-tree", key = "#tenantId.toString()")
    @Transactional(readOnly = true)
    public DashboardTreeResponse getTree(UUID tenantId) {
        log.info("Computing dashboard tree for tenant={}", tenantId);

        var managers = userRepository.findByTenantIdAndRole(tenantId, "manager");
        var resellers = resellerRepository.findByTenantIdAndDeletedAtIsNull(tenantId);
        var openConsignments = consignmentRepository.findByTenantIdAndStatusIn(
            tenantId, List.of("open", "partially_settled", "overdue"));

        Map<UUID, List<Reseller>> resellersByManager = resellers.stream()
            .collect(Collectors.groupingBy(Reseller::getManagerId));

        Map<UUID, Long> consignmentCountByReseller = openConsignments.stream()
            .collect(Collectors.groupingBy(Consignment::getResellerId, Collectors.counting()));

        var managerNodes = managers.stream().map(manager -> {
            var managerResellers = resellersByManager.getOrDefault(manager.getId(), List.of());
            var resellerNodes = managerResellers.stream().map(reseller ->
                new DashboardTreeResponse.ResellerNode(
                    reseller.getId(), reseller.getName(), reseller.getStatus(),
                    consignmentCountByReseller.getOrDefault(reseller.getId(), 0L).intValue())
            ).toList();
            return new DashboardTreeResponse.ManagerNode(manager.getId(), manager.getName(), resellerNodes);
        }).toList();

        return new DashboardTreeResponse(managerNodes);
    }

    @Transactional(readOnly = true)
    public List<DashboardAlertResponse> getAlerts(UUID tenantId) {
        var role = TenantContext.ROLE.get();
        var userId = TenantContext.USER_ID.get();

        var overdueConsignments = consignmentRepository
            .findByTenantIdAndStatusIn(tenantId, List.of("overdue"));

        if ("manager".equalsIgnoreCase(role)) {
            overdueConsignments = overdueConsignments.stream()
                .filter(c -> c.getManagerId().equals(userId)).toList();
        }

        var resellerIds = overdueConsignments.stream()
            .map(Consignment::getResellerId).collect(Collectors.toSet());
        Map<UUID, String> resellerNames = resellerRepository.findAllById(resellerIds).stream()
            .collect(Collectors.toMap(Reseller::getId, Reseller::getName));

        var today = LocalDate.now();
        return overdueConsignments.stream().map(c -> new DashboardAlertResponse(
            c.getId(), c.getResellerId(),
            resellerNames.getOrDefault(c.getResellerId(), ""),
            c.getExpectedReturnAt(),
            c.getExpectedReturnAt() != null
                ? (int) ChronoUnit.DAYS.between(c.getExpectedReturnAt(), today)
                : 0
        )).toList();
    }

    @Cacheable(value = "dashboard-charts-v2", key = "#tenantId.toString() + ':' + #period")
    @Transactional(readOnly = true)
    public DashboardChartResponse getCharts(UUID tenantId, String period) {
        var now = LocalDate.now();
        var from = switch (period != null ? period : "6m") {
            case "1m" -> now.minusMonths(1);
            case "3m" -> now.minusMonths(3);
            default   -> now.minusMonths(6);
        };

        var settlements = settlementRepository.findByTenantIdAndSettlementDateBetween(tenantId, from, now);

        Map<String, List<Settlement>> byMonth = settlements.stream()
            .collect(Collectors.groupingBy(s ->
                s.getSettlementDate().getYear() + "-"
                    + String.format("%02d", s.getSettlementDate().getMonthValue())));

        var points = byMonth.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> {
                var list = entry.getValue();
                var totalSold = list.stream().map(Settlement::getTotalSoldValue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                var totalComm = list.stream().map(Settlement::getTotalCommission)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                var net = list.stream().map(Settlement::getNetToReceive)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                return new DashboardChartResponse.DataPoint(entry.getKey(), totalSold, totalComm, net);
            }).toList();

        return new DashboardChartResponse(points);
    }
}
