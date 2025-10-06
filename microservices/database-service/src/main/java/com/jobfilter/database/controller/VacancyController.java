package com.jobfilter.database.controller;

import com.jobfilter.database.model.Vacancy;
import com.jobfilter.database.service.VacancyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class VacancyController {
    
    @Autowired
    private VacancyService vacancyService;
    
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok().body("Database Service is running");
    }
    
    @GetMapping("/vacancies")
    public ResponseEntity<Page<Vacancy>> getVacancies(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Vacancy> vacancies = vacancyService.findAll(pageable, status);
        return ResponseEntity.ok(vacancies);
    }
    
    @GetMapping("/vacancies/{id}")
    public ResponseEntity<Vacancy> getVacancy(@PathVariable Long id) {
        Optional<Vacancy> vacancy = vacancyService.findById(id);
        return vacancy.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping("/vacancies")
    public ResponseEntity<Vacancy> createVacancy(@RequestBody Vacancy vacancy) {
        Vacancy savedVacancy = vacancyService.save(vacancy);
        return ResponseEntity.ok(savedVacancy);
    }
    
    @PutMapping("/vacancies/{id}")
    public ResponseEntity<Vacancy> updateVacancy(@PathVariable Long id, @RequestBody Vacancy vacancy) {
        Optional<Vacancy> existingVacancy = vacancyService.findById(id);
        if (existingVacancy.isPresent()) {
            vacancy.setId(id);
            Vacancy updatedVacancy = vacancyService.save(vacancy);
            return ResponseEntity.ok(updatedVacancy);
        }
        return ResponseEntity.notFound().build();
    }
    
    @DeleteMapping("/vacancies/{id}")
    public ResponseEntity<?> deleteVacancy(@PathVariable Long id) {
        vacancyService.deleteById(id);
        return ResponseEntity.ok().build();
    }
    
    @PostMapping("/vacancies/{id}/moderate")
    public ResponseEntity<Vacancy> moderateVacancy(
            @PathVariable Long id, 
            @RequestBody ModerateRequest request) {
        
        Optional<Vacancy> vacancy = vacancyService.findById(id);
        if (vacancy.isPresent()) {
            Vacancy v = vacancy.get();
            v.setStatus(request.getAction());
            Vacancy updatedVacancy = vacancyService.save(v);
            return ResponseEntity.ok(updatedVacancy);
        }
        return ResponseEntity.notFound().build();
    }
    
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        return ResponseEntity.ok(vacancyService.getStatistics());
    }
    
    // Inner class for moderation request
    public static class ModerateRequest {
        private String action;
        private String reason;
        
        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}







