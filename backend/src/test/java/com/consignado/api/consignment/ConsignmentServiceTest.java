package com.consignado.api.consignment;

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
import com.consignado.api.domain.consignment.ConsignmentItemMovementRepository;
import com.consignado.api.domain.consignment.ConsignmentItemRepository;
import com.consignado.api.domain.consignment.ConsignmentRepository;
import com.consignado.api.domain.consignment.ConsignmentService;
import com.consignado.api.domain.consignment.dto.ConsignmentItemRequest;
import com.consignado.api.domain.consignment.dto.ConsignmentRequest;
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

@ExtendWith(MockitoExtension.class)
class ConsignmentServiceTest {

    @Mock private ConsignmentRepository consignmentRepository;
    @Mock private ConsignmentItemRepository itemRepository;
    @Mock private ConsignmentItemMovementRepository movementRepository;
    @Mock private ResellerRepository resellerRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProductRepository productRepository;
    @InjectMocks private ConsignmentService consignmentService;

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID   = UUID.randomUUID();

    @Test
    void create_withInsufficientStock_throwsBusinessException() {
        var resellerId = UUID.randomUUID();
        var productId  = UUID.randomUUID();

        when(resellerRepository.findByIdAndDeletedAtIsNull(resellerId))
            .thenReturn(Optional.of(buildReseller(resellerId)));
        when(productRepository.findByIdAndDeletedAtIsNull(productId))
            .thenReturn(Optional.of(buildProduct(productId, 2)));

        var request = new ConsignmentRequest(resellerId, null, null,
            List.of(new ConsignmentItemRequest(productId, 5)), null);

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> consignmentService.create(request)))));
    }

    @Test
    void create_withValidData_decreasesStockAvailable() throws Exception {
        var resellerId         = UUID.randomUUID();
        var productId          = UUID.randomUUID();
        var savedConsignmentId = UUID.randomUUID();

        var product           = buildProduct(productId, 10);
        var savedConsignment  = buildConsignment(savedConsignmentId, resellerId);
        var savedItem         = buildItem(UUID.randomUUID(), savedConsignmentId, productId, 3);

        when(resellerRepository.findByIdAndDeletedAtIsNull(resellerId))
            .thenReturn(Optional.of(buildReseller(resellerId)));
        when(productRepository.findByIdAndDeletedAtIsNull(productId))
            .thenReturn(Optional.of(product));
        when(consignmentRepository.save(any())).thenReturn(savedConsignment);
        when(itemRepository.findByConsignmentId(savedConsignmentId)).thenReturn(List.of(savedItem));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(buildUser()));
        when(movementRepository.findByItemIdOrderByCreatedAtAsc(any())).thenReturn(List.of());

        var request = new ConsignmentRequest(resellerId, null, null,
            List.of(new ConsignmentItemRequest(productId, 3)), null);

        ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner",
                    () -> consignmentService.create(request))));

        var captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(captor.capture());
        assertEquals(7, captor.getValue().getStockAvailable());
    }

    @Test
    void registerMovement_sold_updatesQuantitySold() throws Exception {
        var consignmentId = UUID.randomUUID();
        var itemId        = UUID.randomUUID();
        var resellerId    = UUID.randomUUID();

        var consignment = buildConsignment(consignmentId, resellerId);
        var item        = buildItem(itemId, consignmentId, UUID.randomUUID(), 5);

        when(consignmentRepository.findByIdAndTenantId(consignmentId, TENANT_ID))
            .thenReturn(Optional.of(consignment));
        when(itemRepository.findByIdAndConsignmentIdAndTenantId(itemId, consignmentId, TENANT_ID))
            .thenReturn(Optional.of(item));
        when(itemRepository.findByConsignmentId(consignmentId)).thenReturn(List.of(item));
        when(resellerRepository.findById(resellerId)).thenReturn(Optional.of(buildReseller(resellerId)));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(buildUser()));
        when(movementRepository.findByItemIdOrderByCreatedAtAsc(any())).thenReturn(List.of());

        ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner",
                    () -> consignmentService.registerMovement(
                        consignmentId, new MovementRequest(itemId, "sold", 2)))));

        var captor = ArgumentCaptor.forClass(ConsignmentItem.class);
        verify(itemRepository).save(captor.capture());
        assertEquals(2, captor.getValue().getQuantitySold());
    }

    @Test
    void registerMovement_withExcessQuantity_throwsBusinessException() {
        var consignmentId = UUID.randomUUID();
        var itemId        = UUID.randomUUID();
        var resellerId    = UUID.randomUUID();

        var consignment = buildConsignment(consignmentId, resellerId);
        var item        = buildItem(itemId, consignmentId, UUID.randomUUID(), 3);
        item.setQuantitySold(2); // remaining = 1

        when(consignmentRepository.findByIdAndTenantId(consignmentId, TENANT_ID))
            .thenReturn(Optional.of(consignment));
        when(itemRepository.findByIdAndConsignmentIdAndTenantId(itemId, consignmentId, TENANT_ID))
            .thenReturn(Optional.of(item));

        assertThrows(BusinessException.class, () ->
            ScopedValue.runWhere(TenantContext.TENANT_ID, TENANT_ID,
                () -> ScopedValue.runWhere(TenantContext.USER_ID, USER_ID,
                    () -> ScopedValue.runWhere(TenantContext.ROLE, "owner",
                        () -> consignmentService.registerMovement(
                            consignmentId, new MovementRequest(itemId, "sold", 5))))));
    }

    @Test
    void settle_returnsRemainingItemsToStock() throws Exception {
        var consignmentId = UUID.randomUUID();
        var resellerId    = UUID.randomUUID();
        var productId     = UUID.randomUUID();
        var itemId        = UUID.randomUUID();

        var consignment = buildConsignment(consignmentId, resellerId);
        var item        = buildItem(itemId, consignmentId, productId, 5);
        item.setQuantitySold(2); // remaining = 3
        var product = buildProduct(productId, 2);
        product.setStockTotal(10);

        when(consignmentRepository.findByIdAndTenantId(consignmentId, TENANT_ID))
            .thenReturn(Optional.of(consignment));
        when(itemRepository.findByConsignmentId(consignmentId)).thenReturn(List.of(item));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(resellerRepository.findById(resellerId)).thenReturn(Optional.of(buildReseller(resellerId)));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(buildUser()));
        when(movementRepository.findByItemIdOrderByCreatedAtAsc(any())).thenReturn(List.of());

        ScopedValue.callWhere(TenantContext.TENANT_ID, TENANT_ID,
            () -> ScopedValue.callWhere(TenantContext.USER_ID, USER_ID,
                () -> ScopedValue.callWhere(TenantContext.ROLE, "owner",
                    () -> consignmentService.settle(consignmentId, new SettleRequest(null)))));

        var captor = ArgumentCaptor.forClass(Product.class);
        verify(productRepository).save(captor.capture());
        assertEquals(5, captor.getValue().getStockAvailable()); // 2 + 3 returned
        assertEquals(8, captor.getValue().getStockTotal());     // 10 - 2 sold
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

    private Product buildProduct(UUID id, int stockAvailable) {
        var p = new Product();
        p.setId(id);
        p.setTenantId(TENANT_ID);
        p.setName("Anel Dourado");
        p.setCategory("anel");
        p.setSalePrice(new BigDecimal("49.90"));
        p.setCommissionRate(new BigDecimal("30.00"));
        p.setStockTotal(stockAvailable);
        p.setStockAvailable(stockAvailable);
        return p;
    }

    private Consignment buildConsignment(UUID id, UUID resellerId) {
        var c = new Consignment();
        c.setId(id);
        c.setTenantId(TENANT_ID);
        c.setResellerId(resellerId);
        c.setManagerId(USER_ID);
        c.setDeliveredAt(LocalDate.now());
        c.setStatus("open");
        return c;
    }

    private ConsignmentItem buildItem(UUID id, UUID consignmentId, UUID productId, int sent) {
        var i = new ConsignmentItem();
        i.setId(id);
        i.setTenantId(TENANT_ID);
        i.setConsignmentId(consignmentId);
        i.setProductId(productId);
        i.setQuantitySent(sent);
        i.setSalePrice(new BigDecimal("49.90"));
        i.setCommissionRate(new BigDecimal("30.00"));
        return i;
    }

    private User buildUser() {
        var u = new User();
        u.setId(USER_ID);
        u.setTenantId(TENANT_ID);
        u.setName("Gestora Teste");
        return u;
    }
}
