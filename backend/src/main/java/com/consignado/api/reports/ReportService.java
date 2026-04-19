package com.consignado.api.reports;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.consignado.api.domain.consignment.ConsignmentRepository;
import com.consignado.api.domain.reseller.Reseller;
import com.consignado.api.domain.reseller.ResellerRepository;
import com.consignado.api.domain.settlement.Settlement;
import com.consignado.api.domain.settlement.SettlementRepository;
import com.consignado.api.domain.user.User;
import com.consignado.api.domain.user.UserRepository;
import com.consignado.api.multitenancy.TenantContext;
import com.consignado.api.shared.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class ReportService {

    private final ResellerRepository resellerRepository;
    private final ConsignmentRepository consignmentRepository;
    private final SettlementRepository settlementRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public byte[] generateResellersReport() {
        var tenantId = TenantContext.TENANT_ID.get();
        var resellers = resellerRepository.findByTenantIdAndDeletedAtIsNull(tenantId);

        var managerIds = resellers.stream().map(Reseller::getManagerId).collect(Collectors.toSet());
        Map<UUID, String> managerNames = userRepository.findAllById(managerIds).stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        try (var wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("Revendedoras");
            var headerStyle = buildHeaderStyle(wb);

            writeRow(sheet, 0, headerStyle,
                "Nome", "Telefone", "Email", "Instagram", "Gestora", "Status", "Criado em");

            for (int i = 0; i < resellers.size(); i++) {
                var r = resellers.get(i);
                writeRow(sheet, i + 1, null,
                    r.getName(),
                    nvl(r.getPhone()),
                    nvl(r.getEmail()),
                    nvl(r.getInstagram()),
                    managerNames.getOrDefault(r.getManagerId(), ""),
                    r.getStatus(),
                    r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate().toString() : "");
            }

            autoSize(sheet, 7);
            return toBytes(wb);
        } catch (Exception e) {
            throw new BusinessException("Erro ao gerar relatório de revendedoras");
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateConsignmentsReport() {
        var tenantId = TenantContext.TENANT_ID.get();
        var consignments = consignmentRepository.findByTenantIdAndStatusIn(tenantId,
            List.of("open", "partially_settled", "settled", "overdue"));

        var resellerIds = consignments.stream()
            .map(c -> c.getResellerId()).collect(Collectors.toSet());
        var managerIds = consignments.stream()
            .map(c -> c.getManagerId()).collect(Collectors.toSet());

        Map<UUID, String> resellerNames = resellerRepository.findAllById(resellerIds).stream()
            .collect(Collectors.toMap(Reseller::getId, Reseller::getName));
        Map<UUID, String> managerNames = userRepository.findAllById(managerIds).stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        try (var wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("Consignados");
            var headerStyle = buildHeaderStyle(wb);

            writeRow(sheet, 0, headerStyle,
                "Revendedora", "Gestora", "Status", "Data Entrega", "Retorno Esperado", "Notas");

            for (int i = 0; i < consignments.size(); i++) {
                var c = consignments.get(i);
                writeRow(sheet, i + 1, null,
                    resellerNames.getOrDefault(c.getResellerId(), ""),
                    managerNames.getOrDefault(c.getManagerId(), ""),
                    c.getStatus(),
                    c.getDeliveredAt() != null ? c.getDeliveredAt().toString() : "",
                    c.getExpectedReturnAt() != null ? c.getExpectedReturnAt().toString() : "",
                    nvl(c.getNotes()));
            }

            autoSize(sheet, 6);
            return toBytes(wb);
        } catch (Exception e) {
            throw new BusinessException("Erro ao gerar relatório de consignados");
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateFinancialReport() {
        var tenantId = TenantContext.TENANT_ID.get();
        var settlements = settlementRepository.findAll()
            .stream().filter(s -> s.getTenantId().equals(tenantId)).toList();

        var resellerIds = settlements.stream()
            .map(Settlement::getResellerId).collect(Collectors.toSet());
        var managerIds = settlements.stream()
            .map(Settlement::getManagerId).collect(Collectors.toSet());

        Map<UUID, String> resellerNames = resellerRepository.findAllById(resellerIds).stream()
            .collect(Collectors.toMap(Reseller::getId, Reseller::getName));
        Map<UUID, String> managerNames = userRepository.findAllById(managerIds).stream()
            .collect(Collectors.toMap(User::getId, User::getName));

        try (var wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("Financeiro");
            var headerStyle = buildHeaderStyle(wb);

            writeRow(sheet, 0, headerStyle,
                "Data", "Revendedora", "Gestora", "Total Vendido", "Comissão",
                "Líquido", "Forma Pagamento", "Notas");

            for (int i = 0; i < settlements.size(); i++) {
                var s = settlements.get(i);
                writeRow(sheet, i + 1, null,
                    s.getSettlementDate() != null ? s.getSettlementDate().toString() : "",
                    resellerNames.getOrDefault(s.getResellerId(), ""),
                    managerNames.getOrDefault(s.getManagerId(), ""),
                    s.getTotalSoldValue() != null ? s.getTotalSoldValue().toPlainString() : "0",
                    s.getTotalCommission() != null ? s.getTotalCommission().toPlainString() : "0",
                    s.getNetToReceive() != null ? s.getNetToReceive().toPlainString() : "0",
                    nvl(s.getPaymentMethod()),
                    nvl(s.getNotes()));
            }

            autoSize(sheet, 8);
            return toBytes(wb);
        } catch (Exception e) {
            throw new BusinessException("Erro ao gerar relatório financeiro");
        }
    }

    @Transactional(readOnly = true)
    public byte[] generateRankingReport() {
        var tenantId = TenantContext.TENANT_ID.get();
        var settlements = settlementRepository.findAll()
            .stream().filter(s -> s.getTenantId().equals(tenantId)).toList();

        record RankEntry(UUID resellerId, String name, java.math.BigDecimal totalSold, long count) {}

        Map<UUID, List<Settlement>> byReseller = settlements.stream()
            .collect(Collectors.groupingBy(Settlement::getResellerId));

        var resellerIds = byReseller.keySet();
        Map<UUID, String> resellerNames = resellerRepository.findAllById(resellerIds).stream()
            .collect(Collectors.toMap(Reseller::getId, Reseller::getName));

        var ranking = byReseller.entrySet().stream()
            .map(e -> new RankEntry(
                e.getKey(),
                resellerNames.getOrDefault(e.getKey(), ""),
                e.getValue().stream().map(Settlement::getTotalSoldValue)
                    .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add),
                e.getValue().size()))
            .sorted((a, b) -> b.totalSold().compareTo(a.totalSold()))
            .toList();

        try (var wb = new XSSFWorkbook()) {
            var sheet = wb.createSheet("Ranking");
            var headerStyle = buildHeaderStyle(wb);

            writeRow(sheet, 0, headerStyle, "Posição", "Revendedora", "Total Vendido", "Qtd Acertos");

            for (int i = 0; i < ranking.size(); i++) {
                var entry = ranking.get(i);
                writeRow(sheet, i + 1, null,
                    String.valueOf(i + 1),
                    entry.name(),
                    entry.totalSold().toPlainString(),
                    String.valueOf(entry.count()));
            }

            autoSize(sheet, 4);
            return toBytes(wb);
        } catch (Exception e) {
            throw new BusinessException("Erro ao gerar relatório de ranking");
        }
    }

    // ---- helpers ----

    private XSSFCellStyle buildHeaderStyle(XSSFWorkbook wb) {
        var style = wb.createCellStyle();
        var font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        return style;
    }

    private void writeRow(XSSFSheet sheet, int rowIndex, XSSFCellStyle style, String... values) {
        XSSFRow row = sheet.createRow(rowIndex);
        for (int i = 0; i < values.length; i++) {
            var cell = row.createCell(i);
            cell.setCellValue(values[i]);
            if (style != null) cell.setCellStyle(style);
        }
    }

    private void autoSize(XSSFSheet sheet, int columns) {
        for (int i = 0; i < columns; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private byte[] toBytes(XSSFWorkbook wb) throws Exception {
        var out = new ByteArrayOutputStream();
        wb.write(out);
        return out.toByteArray();
    }

    private String nvl(String value) {
        return value != null ? value : "";
    }
}
