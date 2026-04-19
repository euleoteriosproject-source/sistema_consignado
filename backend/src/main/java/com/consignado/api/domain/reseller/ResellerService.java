package com.consignado.api.domain.reseller;

import java.math.BigDecimal;
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
import com.consignado.api.domain.reseller.dto.ResellerDocumentResponse;
import com.consignado.api.domain.reseller.dto.ResellerFilterRequest;
import com.consignado.api.domain.reseller.dto.ResellerRequest;
import com.consignado.api.domain.reseller.dto.ResellerResponse;
import com.consignado.api.domain.reseller.dto.ResellerSummaryResponse;
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
public class ResellerService {

    private final ResellerRepository resellerRepository;
    private final ResellerDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final SupabaseStorageService storageService;

    @Transactional
    public ResellerResponse create(ResellerRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        log.info("Creating reseller for tenant={}", tenantId);

        var tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Tenant", tenantId));
        var plan = TenantPlan.from(tenant.getPlan());
        var currentCount = resellerRepository.countByTenantIdAndDeletedAtIsNull(tenantId);
        if (currentCount >= plan.getMaxResellers()) {
            throw new BusinessException(
                "Limite de revendedoras atingido para o plano " + plan.getValue() +
                " (" + plan.getMaxResellers() + "). Faça upgrade do plano para adicionar mais.");
        }

        if (request.cpf() != null && !request.cpf().isBlank()) {
            if (resellerRepository.existsByCpfAndTenantId(request.cpf(), tenantId)) {
                throw new BusinessException("CPF já cadastrado neste tenant");
            }
        }

        var manager = userRepository.findById(request.managerId())
            .filter(u -> u.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Gestora", request.managerId()));

        var reseller = new Reseller();
        reseller.setTenantId(tenantId);
        mapRequestToEntity(request, reseller);

        var saved = resellerRepository.save(reseller);
        log.info("Reseller created id={} tenant={}", saved.getId(), tenantId);
        return toResponse(saved, manager.getName());
    }

    @Transactional(readOnly = true)
    public ResellerResponse findById(UUID id) {
        var tenantId = TenantContext.TENANT_ID.get();
        var reseller = resellerRepository.findByIdAndDeletedAtIsNull(id)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", id));

        var managerName = userRepository.findById(reseller.getManagerId())
            .map(User::getName)
            .orElse("");

        return toResponse(reseller, managerName);
    }

    @Transactional(readOnly = true)
    public Page<ResellerSummaryResponse> findAll(ResellerFilterRequest filter, Pageable pageable) {
        var tenantId = TenantContext.TENANT_ID.get();
        var role = TenantContext.ROLE.get();
        var userId = TenantContext.USER_ID.get();

        var spec = buildSpec(filter, tenantId, role, userId);
        var page = resellerRepository.findAll(spec, pageable);

        var managerIds = page.stream().map(Reseller::getManagerId).collect(Collectors.toSet());
        Map<UUID, String> managers = userRepository.findAllById(managerIds).stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        return page.map(r -> toSummary(r, managers.getOrDefault(r.getManagerId(), "")));
    }

    @Transactional
    public ResellerResponse update(UUID id, ResellerRequest request) {
        var tenantId = TenantContext.TENANT_ID.get();
        var reseller = resellerRepository.findByIdAndDeletedAtIsNull(id)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", id));

        if (request.cpf() != null && !request.cpf().isBlank()
                && !request.cpf().equals(reseller.getCpf())) {
            if (resellerRepository.existsByCpfAndTenantId(request.cpf(), tenantId)) {
                throw new BusinessException("CPF já cadastrado neste tenant");
            }
        }

        var manager = userRepository.findById(request.managerId())
            .filter(u -> u.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Gestora", request.managerId()));

        mapRequestToEntity(request, reseller);
        var saved = resellerRepository.save(reseller);
        log.info("Reseller updated id={} tenant={}", id, tenantId);
        return toResponse(saved, manager.getName());
    }

    @Transactional
    public void updateStatus(UUID id, String status) {
        var tenantId = TenantContext.TENANT_ID.get();
        var reseller = resellerRepository.findByIdAndDeletedAtIsNull(id)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", id));

        var validStatuses = Set.of("active", "inactive", "blocked");
        if (!validStatuses.contains(status.toLowerCase())) {
            throw new BusinessException("Status inválido: " + status);
        }

        reseller.setStatus(status.toLowerCase());
        resellerRepository.save(reseller);
        log.info("Reseller status updated id={} status={}", id, status);
    }

    @Transactional
    public ResellerDocumentResponse addDocument(UUID resellerId, String type, MultipartFile file) {
        var tenantId = TenantContext.TENANT_ID.get();
        var reseller = resellerRepository.findByIdAndDeletedAtIsNull(resellerId)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", resellerId));

        var validTypes = Set.of("rg_front", "rg_back", "cnh_front", "cnh_back",
            "proof_of_address", "selfie", "other");
        if (!validTypes.contains(type.toLowerCase())) {
            throw new BusinessException("Tipo de documento inválido: " + type);
        }

        var folder = tenantId + "/resellers/" + resellerId + "/" + type.toLowerCase();
        var storagePath = storageService.upload(folder, file);

        var doc = new ResellerDocument();
        doc.setTenantId(tenantId);
        doc.setReseller(reseller);
        doc.setType(type.toLowerCase());
        doc.setStoragePath(storagePath);
        doc.setFileName(file.getOriginalFilename());

        var saved = documentRepository.save(doc);
        log.info("Document added resellerId={} type={}", resellerId, type);
        return toDocumentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ResellerDocumentResponse> listDocuments(UUID resellerId) {
        var tenantId = TenantContext.TENANT_ID.get();
        resellerRepository.findByIdAndDeletedAtIsNull(resellerId)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", resellerId));

        return documentRepository.findByResellerId(resellerId).stream()
            .map(this::toDocumentResponse)
            .toList();
    }

    @Transactional
    public void removeDocument(UUID resellerId, UUID docId) {
        var tenantId = TenantContext.TENANT_ID.get();
        resellerRepository.findByIdAndDeletedAtIsNull(resellerId)
            .filter(r -> r.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Revendedora", resellerId));

        var doc = documentRepository.findByIdAndTenantId(docId, tenantId)
            .orElseThrow(() -> new ResourceNotFoundException("Documento", docId));

        storageService.delete(doc.getStoragePath());
        documentRepository.delete(doc);
        log.info("Document removed docId={} resellerId={}", docId, resellerId);
    }

    private Specification<Reseller> buildSpec(ResellerFilterRequest filter, UUID tenantId,
                                               String role, UUID userId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isNull(root.get("deletedAt")));
            predicates.add(cb.equal(root.get("tenantId"), tenantId));

            if ("manager".equalsIgnoreCase(role)) {
                predicates.add(cb.equal(root.get("managerId"), userId));
            }

            if (filter.search() != null && !filter.search().isBlank()) {
                var pattern = "%" + filter.search().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("phone")), pattern),
                    cb.like(cb.lower(root.get("email")), pattern)
                ));
            }

            if (filter.status() != null && !filter.status().isBlank()) {
                predicates.add(cb.equal(root.get("status"), filter.status().toLowerCase()));
            }

            if (filter.managerId() != null) {
                predicates.add(cb.equal(root.get("managerId"), filter.managerId()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private void mapRequestToEntity(ResellerRequest request, Reseller reseller) {
        reseller.setManagerId(request.managerId());
        reseller.setName(request.name());
        reseller.setCpf(request.cpf());
        reseller.setBirthDate(request.birthDate());
        reseller.setPhone(request.phone());
        reseller.setPhone2(request.phone2());
        reseller.setEmail(request.email());
        reseller.setAddressStreet(request.addressStreet());
        reseller.setAddressNumber(request.addressNumber());
        reseller.setAddressComplement(request.addressComplement());
        reseller.setAddressNeighborhood(request.addressNeighborhood());
        reseller.setAddressCity(request.addressCity());
        reseller.setAddressState(request.addressState());
        reseller.setAddressZip(request.addressZip());
        reseller.setInstagram(request.instagram());
        reseller.setFacebook(request.facebook());
        reseller.setTiktok(request.tiktok());
        reseller.setReference1Name(request.reference1Name());
        reseller.setReference1Phone(request.reference1Phone());
        reseller.setReference2Name(request.reference2Name());
        reseller.setReference2Phone(request.reference2Phone());
        reseller.setNotes(request.notes());
    }

    private ResellerResponse toResponse(Reseller r, String managerName) {
        return new ResellerResponse(
            r.getId(), r.getName(), r.getPhone(), r.getPhone2(), r.getEmail(),
            r.getCpf(), r.getBirthDate(), r.getStatus(), r.getManagerId(), managerName,
            r.getAddressStreet(), r.getAddressNumber(), r.getAddressComplement(),
            r.getAddressNeighborhood(), r.getAddressCity(), r.getAddressState(), r.getAddressZip(),
            r.getInstagram(), r.getFacebook(), r.getTiktok(),
            r.getReference1Name(), r.getReference1Phone(),
            r.getReference2Name(), r.getReference2Phone(),
            r.getNotes(), 0, BigDecimal.ZERO,
            r.getCreatedAt(), r.getUpdatedAt()
        );
    }

    private ResellerSummaryResponse toSummary(Reseller r, String managerName) {
        return new ResellerSummaryResponse(
            r.getId(), r.getName(), r.getPhone(), r.getEmail(),
            r.getStatus(), managerName, 0, r.getCreatedAt()
        );
    }

    private ResellerDocumentResponse toDocumentResponse(ResellerDocument doc) {
        return new ResellerDocumentResponse(
            doc.getId(), doc.getType(), doc.getStoragePath(), doc.getFileName(),
            storageService.getPublicUrl(doc.getStoragePath()), doc.getUploadedAt()
        );
    }
}
