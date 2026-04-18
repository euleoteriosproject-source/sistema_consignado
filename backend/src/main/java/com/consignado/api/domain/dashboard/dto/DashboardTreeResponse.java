package com.consignado.api.domain.dashboard.dto;

import java.util.List;
import java.util.UUID;

public record DashboardTreeResponse(List<ManagerNode> managers) {

    public record ManagerNode(UUID id, String name, List<ResellerNode> resellers) {}

    public record ResellerNode(UUID id, String name, String status, int openConsignments) {}
}
