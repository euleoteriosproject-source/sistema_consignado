package com.consignado.api.settlement;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.consignado.api.domain.consignment.Consignment;
import com.consignado.api.domain.consignment.ConsignmentItem;
import com.consignado.api.domain.consignment.ConsignmentItemRepository;
import com.consignado.api.domain.consignment.ConsignmentRepository;
import com.consignado.api.domain.reseller.Reseller;
import com.consignado.api.domain.reseller.ResellerRepository;
import com.consignado.api.domain.settlement.Settlement;
import com.consignado.api.domain.settlement.SettlementRepository;
import com.consignado.api.domain.settlement.SettlementService;
import com.consignado.api.domain.settlement.dto.SettlementRequest;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;

@ExtendWith(MockitoExtension.class)
class SettlementServiceTest {

    @Mock private SettlementRepository settlementRepository;
    @Mock private ConsignmentRepository consignmentRepository;
    @Mock private ConsignmentItemRepository itemRepository;
    @Mock private ResellerRepository resellerRepository;
    @Mock private UserRepository userRepository;
    @InjectMocks private SettlementService settlementService;

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID   = UUID.randomUUID();

    @Test
    void create_withConsignmentId_calculatesValuesAutomatically() throws Exception {
        var resellerId     = UUID.randomUUID();
        var consignmentId  = UUID.randomUUID();
        var savedId        = UUID.randomUUID();

        var item1 = buildItem(consignmentId, new BigDecimal("100.00"), new BigDecimal("30.00"), 2);
        item1.setQuantitySold(2); // 100 * 2 = 200 sold, 200 * 30% = 60 commission
        var item2 = buildItem(consignmentId, new BigDecimal("50.00"),  new BigDecimal("20.00"), 1);
        item2.setQuantitySold(1); //  50 * 1 =  50 sold,  50 * 20% = 10 commission

        var saved = buildSettlement(savedId, resellerId, consignmentId,
            new BigDecimal("250.00"), new BigDecimal("70.00"), new BigDecimal("180.00"));

        when(resellerRepository.findByIdAndDeletedAtIsNull(resellerId))
            .thenReturn(Optional.of(buildReseller(resellerId)));
        when(itemRepository.findByConsignmentId(consignmentId)).thenReturn(List.of(item1, item2));
        when(settlementRepository.save(any())).thenReturn(saved);
        when(resellerRepository.findById(resellerId)).thenReturn(Optional.of(buildReseller(resellerId)));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(buildUser()));

        var request = new SettlementRequest(resellerId, consignmentId, null, null, null, "pix", null);

        ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner",
                    () -> settlementService.create(request))));

        var captor = ArgumentCaptor.forClass(Settlement.class);
        verify(settlementRepository).save(captor.capture());
        // item1: 100 * 2 = 200 sold; commission: 200 * 30% = 60
        // item2:  50 * 1 =  50 sold; commission:  50 * 20% = 10
        // total sold = 250, commission = 70, net = 180
        assertEquals(new BigDecimal("250.00"), captor.getValue().getTotalSoldValue());
        assertEquals(new BigDecimal("70.00"),  captor.getValue().getTotalCommission());
        assertEquals(new BigDecimal("180.00"), captor.getValue().getNetToReceive());
    }

    @Test
    void create_withoutConsignmentId_andMissingValues_throwsBusinessException() {
        var resellerId = UUID.randomUUID();

        when(resellerRepository.findByIdAndDeletedAtIsNull(resellerId))
            .thenReturn(Optional.of(buildReseller(resellerId)));

        var request = new SettlementRequest(resellerId, null, null, null, null, "cash", null);

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> settlementService.create(request)))));
    }

    @Test
    void create_withManualValues_calculatesNetToReceive() throws Exception {
        var resellerId = UUID.randomUUID();
        var savedId    = UUID.randomUUID();

        var totalSold  = new BigDecimal("500.00");
        var commission = new BigDecimal("150.00");
        var net        = new BigDecimal("350.00");

        var saved = buildSettlement(savedId, resellerId, null, totalSold, commission, net);

        when(resellerRepository.findByIdAndDeletedAtIsNull(resellerId))
            .thenReturn(Optional.of(buildReseller(resellerId)));
        when(settlementRepository.save(any())).thenReturn(saved);
        when(resellerRepository.findById(resellerId)).thenReturn(Optional.of(buildReseller(resellerId)));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(buildUser()));

        var request = new SettlementRequest(resellerId, null, null, totalSold, commission, "transfer", null);

        ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner",
                    () -> settlementService.create(request))));

        var captor = ArgumentCaptor.forClass(Settlement.class);
        verify(settlementRepository).save(captor.capture());
        assertEquals(net, captor.getValue().getNetToReceive());
        assertEquals("transfer", captor.getValue().getPaymentMethod());
    }

    @Test
    void getResellerBalance_returnsCorrectTotals() throws Exception {
        var resellerId    = UUID.randomUUID();
        var consignmentId = UUID.randomUUID();
        var productId     = UUID.randomUUID();

        var reseller    = buildReseller(resellerId);
        var consignment = buildConsignment(consignmentId, resellerId, "open");
        var item        = buildItem(consignmentId, new BigDecimal("100.00"), new BigDecimal("30.00"), 3);
        item.setQuantitySold(1);

        when(resellerRepository.findByIdAndDeletedAtIsNull(resellerId)).thenReturn(Optional.of(reseller));
        when(consignmentRepository.findByResellerIdAndTenantId(resellerId, TENANT_ID))
            .thenReturn(List.of(consignment));
        when(itemRepository.findByConsignmentIdIn(List.of(consignmentId))).thenReturn(List.of(item));
        when(settlementRepository.findByResellerIdAndTenantId(resellerId, TENANT_ID)).thenReturn(List.of());

        var result = ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner",
                    () -> settlementService.getResellerBalance(resellerId))));

        // totalSentValue: 100 * 3 = 300
        // totalSoldValue: 100 * 1 = 100
        // totalCommissionDue: 100 * 30% = 30
        // netToReceive: 100 - 30 = 70
        assertEquals(new BigDecimal("300.00"), result.totalSentValue());
        assertEquals(new BigDecimal("100.00"), result.totalSoldValue());
        assertEquals(new BigDecimal("30.00"),  result.totalCommissionDue());
        assertEquals(new BigDecimal("70.00"),  result.netToReceive());
        assertEquals(0L, result.totalSettlementsCount());
    }

    // ---- builders ----

    private Reseller buildReseller(UUID id) {
        var r = new Reseller();
        r.setId(id);
        r.setTenantId(TENANT_ID);
        r.setName("Revendedora Teste");
        r.setPhone("11999999999");
        r.setStatus("active");
        return r;
    }

    private User buildUser() {
        var u = new User();
        u.setId(USER_ID);
        u.setTenantId(TENANT_ID);
        u.setName("Gestora Teste");
        return u;
    }

    private ConsignmentItem buildItem(UUID consignmentId, BigDecimal salePrice,
                                      BigDecimal commissionRate, int sent) {
        var i = new ConsignmentItem();
        i.setId(UUID.randomUUID());
        i.setTenantId(TENANT_ID);
        i.setConsignmentId(consignmentId);
        i.setProductId(UUID.randomUUID());
        i.setQuantitySent(sent);
        i.setSalePrice(salePrice);
        i.setCommissionRate(commissionRate);
        return i;
    }

    private Consignment buildConsignment(UUID id, UUID resellerId, String status) {
        var c = new Consignment();
        c.setId(id);
        c.setTenantId(TENANT_ID);
        c.setResellerId(resellerId);
        c.setManagerId(USER_ID);
        c.setDeliveredAt(LocalDate.now());
        c.setStatus(status);
        return c;
    }

    private Settlement buildSettlement(UUID id, UUID resellerId, UUID consignmentId,
                                       BigDecimal totalSold, BigDecimal commission, BigDecimal net) {
        var s = new Settlement();
        s.setId(id);
        s.setTenantId(TENANT_ID);
        s.setResellerId(resellerId);
        s.setManagerId(USER_ID);
        s.setConsignmentId(consignmentId);
        s.setSettlementDate(LocalDate.now());
        s.setTotalSoldValue(totalSold);
        s.setTotalCommission(commission);
        s.setNetToReceive(net);
        s.setPaymentMethod("pix");
        return s;
    }
}
