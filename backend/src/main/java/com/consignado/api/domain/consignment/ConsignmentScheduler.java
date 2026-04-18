package com.consignado.api.domain.consignment;

import java.time.LocalDate;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
@RequiredArgsConstructor
public class ConsignmentScheduler {

    private final ConsignmentRepository consignmentRepository;

    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void markOverdueConsignments() {
        var today = LocalDate.now();
        int updated = consignmentRepository.markOverdue(today);
        log.info("Marked {} consignments as overdue for date={}", updated, today);
    }
}
