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

    @Cacheable(value = "dashboard-summary-v2", key = "#tenantId.toString() + ':' + #userId.toString()")
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary(UUID tenantId, UUID userId, boolean isManager) {
        log.info("Computing dashboard summary for tenant={} user={} isManager={}", tenantId, userId, isManager);

        long activeResellers = isManager
            ? resellerRepository.countByManagerIdAndStatusAndDeletedAtIsNull(userId, "active")
            : resellerRepository.countByTenantIdAndStatusAndDeletedAtIsNull(tenantId, "active");

        var activeStatuses = List.of("open", "partially_settled", "overdue");

        // Regra de circulação:
        //   Gestor  → apenas seus lotes reseller (o que distribuiu para revendedores)
        //   Dono    → manager_stock (deu para gestores) + reseller onde ele é responsável direto
        //             NÃO inclui reseller de gestores (essas peças já estão no manager_stock)
        var activeConsignments = isManager
            ? consignmentRepository.findByManagerIdAndConsignmentTypeAndStatusIn(userId, "reseller", activeStatuses)
            : consignmentRepository.findOwnerCirculation(tenantId, userId, activeStatuses);

        long openCount = isManager
            ? consignmentRepository.countByManagerIdAndConsignmentTypeAndStatus(userId, "reseller", "open")
                + consignmentRepository.countByManagerIdAndConsignmentTypeAndStatus(userId, "reseller", "partially_settled")
            : consignmentRepository.countOwnerCirculation(tenantId, userId, "open")
                + consignmentRepository.countOwnerCirculation(tenantId, userId, "partially_settled");

        long overdueCount = isManager
            ? consignmentRepository.countByManagerIdAndConsignmentTypeAndStatus(userId, "reseller", "overdue")
            : consignmentRepository.countOwnerCirculation(tenantId, userId, "overdue");

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
            ? allSettlements.stream().filter(s -> userId.equals(s.getManagerId())).toList()
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
        var role   = TenantContext.ROLE.get();
        var userId = TenantContext.USER_ID.get();
        var today  = LocalDate.now();

        // Já atrasados
        var overdue = consignmentRepository.findByTenantIdAndStatusIn(tenantId, List.of("overdue"));
        // Vencem hoje (ainda abertos)
        var dueToday = consignmentRepository.findDueTodayActive(tenantId, today);

        if ("manager".equalsIgnoreCase(role)) {
            overdue   = overdue.stream().filter(c -> userId.equals(c.getManagerId())).toList();
            dueToday  = dueToday.stream().filter(c -> userId.equals(c.getManagerId())).toList();
        }

        // Carrega nomes de revendedores e gestores em batch
        var allConsignments = new java.util.ArrayList<Consignment>(overdue);
        allConsignments.addAll(dueToday);

        var resellerIds = allConsignments.stream()
            .map(Consignment::getResellerId)
            .filter(java.util.Objects::nonNull)
            .collect(Collectors.toSet());
        var managerIds = allConsignments.stream()
            .map(Consignment::getManagerId)
            .collect(Collectors.toSet());

        Map<UUID, String> resellerNames = resellerRepository.findAllById(resellerIds).stream()
            .collect(Collectors.toMap(Reseller::getId, Reseller::getName));
        Map<UUID, String> managerNames = userRepository.findAllById(managerIds).stream()
            .collect(Collectors.toMap(com.consignado.api.domain.user.User::getId,
                                      com.consignado.api.domain.user.User::getName));

        var alerts = new java.util.ArrayList<DashboardAlertResponse>();

        overdue.forEach(c -> alerts.add(new DashboardAlertResponse(
            c.getId(), c.getResellerId(),
            c.getResellerId() != null ? resellerNames.getOrDefault(c.getResellerId(), "") : managerNames.getOrDefault(c.getManagerId(), ""),
            managerNames.getOrDefault(c.getManagerId(), ""),
            c.getExpectedReturnAt(),
            c.getExpectedReturnAt() != null ? (int) ChronoUnit.DAYS.between(c.getExpectedReturnAt(), today) : 0,
            "overdue"
        )));

        dueToday.forEach(c -> alerts.add(new DashboardAlertResponse(
            c.getId(), c.getResellerId(),
            c.getResellerId() != null ? resellerNames.getOrDefault(c.getResellerId(), "") : managerNames.getOrDefault(c.getManagerId(), ""),
            managerNames.getOrDefault(c.getManagerId(), ""),
            c.getExpectedReturnAt(),
            0,
            "due_today"
        )));

        // Ordena: atrasados primeiro (mais dias de atraso primeiro), depois vencem hoje
        alerts.sort(java.util.Comparator
            .comparing(DashboardAlertResponse::alertType)
            .thenComparing(a -> -a.daysOverdue()));

        return alerts;
    }

    @Cacheable(value = "dashboard-charts-v2", key = "#tenantId.toString() + ':' + #userId.toString() + ':' + #period")
    @Transactional(readOnly = true)
    public DashboardChartResponse getCharts(UUID tenantId, UUID userId, boolean isManager, String period) {
        var now = LocalDate.now();
        var from = switch (period != null ? period : "6m") {
            case "1m" -> now.minusMonths(1);
            case "3m" -> now.minusMonths(3);
            default   -> now.minusMonths(6);
        };

        var settlements = isManager
            ? settlementRepository.findByManagerIdAndSettlementDateBetween(userId, from, now)
            : settlementRepository.findByTenantIdAndSettlementDateBetween(tenantId, from, now);

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
