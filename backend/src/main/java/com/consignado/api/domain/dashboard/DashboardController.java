package com.consignado.api.domain.dashboard;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.consignado.api.domain.dashboard.dto.DashboardAlertResponse;
import com.consignado.api.domain.dashboard.dto.DashboardChartResponse;
import com.consignado.api.domain.dashboard.dto.DashboardSummaryResponse;
import com.consignado.api.domain.dashboard.dto.DashboardTreeResponse;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.ForbiddenException;
import com.consignado.api.shared.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<DashboardSummaryResponse>> getSummary() {
        requireOwner();
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getSummary(TenantContext.TENANT_ID.get())));
    }

    @GetMapping("/tree")
    public ResponseEntity<ApiResponse<DashboardTreeResponse>> getTree() {
        requireOwner();
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getTree(TenantContext.TENANT_ID.get())));
    }

    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<List<DashboardAlertResponse>>> getAlerts() {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getAlerts(TenantContext.TENANT_ID.get())));
    }

    @GetMapping("/charts")
    public ResponseEntity<ApiResponse<DashboardChartResponse>> getCharts(
        @RequestParam(defaultValue = "6m") String period
    ) {
        return ResponseEntity.ok(ApiResponse.ok(dashboardService.getCharts(TenantContext.TENANT_ID.get(), period)));
    }

    private void requireOwner() {
        if (!"owner".equalsIgnoreCase(TenantContext.ROLE.get())) {
            throw new ForbiddenException("Acesso restrito ao proprietário");
        }
    }
}
