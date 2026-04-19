package com.consignado.api.reports;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final MediaType XLSX =
        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    private final ReportService reportService;

    @GetMapping("/resellers")
    public ResponseEntity<byte[]> resellers() {
        return xlsx(reportService.generateResellersReport(), "relatorio-revendedoras.xlsx");
    }

    @GetMapping("/consignments")
    public ResponseEntity<byte[]> consignments() {
        return xlsx(reportService.generateConsignmentsReport(), "relatorio-consignados.xlsx");
    }

    @GetMapping("/financial")
    public ResponseEntity<byte[]> financial() {
        return xlsx(reportService.generateFinancialReport(), "relatorio-financeiro.xlsx");
    }

    @GetMapping("/ranking")
    public ResponseEntity<byte[]> ranking() {
        return xlsx(reportService.generateRankingReport(), "relatorio-ranking.xlsx");
    }

    private ResponseEntity<byte[]> xlsx(byte[] data, String filename) {
        return ResponseEntity.ok()
            .contentType(XLSX)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .body(data);
    }
}
