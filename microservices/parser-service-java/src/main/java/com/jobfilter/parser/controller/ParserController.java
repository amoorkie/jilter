package com.jobfilter.parser.controller;

import com.jobfilter.parser.model.Vacancy;
import com.jobfilter.parser.parser.GeekjobParser;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ParserController {
    
    @Autowired
    private GeekjobParser geekjobParser;
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "Java Parser Service");
        response.put("timestamp", java.time.LocalDateTime.now());
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/parse/geekjob")
    public ResponseEntity<Map<String, Object>> parseGeekjob(@RequestBody Map<String, Object> request) {
        try {
            String query = (String) request.getOrDefault("query", "дизайнер");
            Integer pages = (Integer) request.getOrDefault("pages", 1);
            
            System.out.println("Starting Geekjob.ru parsing: query='" + query + "', pages=" + pages);
            
            List<Vacancy> vacancies = geekjobParser.parseVacancies(query, pages);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Geekjob parsing completed");
            response.put("source", "geekjob");
            response.put("total_found", vacancies.size());
            response.put("saved", vacancies.size());
            response.put("query", query);
            response.put("pages", pages);
            response.put("vacancies", vacancies);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in parseGeekjob: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Internal server error");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @PostMapping("/parse")
    public ResponseEntity<Map<String, Object>> parseAll(@RequestBody Map<String, Object> request) {
        try {
            String query = (String) request.getOrDefault("query", "дизайнер");
            Integer pages = (Integer) request.getOrDefault("pages", 1);
            @SuppressWarnings("unchecked")
            List<String> sources = (List<String>) request.getOrDefault("sources", List.of("geekjob"));
            
            System.out.println("Starting parsing: query='" + query + "', pages=" + pages + ", sources=" + sources);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Parsing completed");
            response.put("query", query);
            response.put("pages", pages);
            response.put("sources", sources);
            
            int totalFound = 0;
            int totalSaved = 0;
            
            if (sources.contains("geekjob")) {
                List<Vacancy> geekjobVacancies = geekjobParser.parseVacancies(query, pages);
                totalFound += geekjobVacancies.size();
                totalSaved += geekjobVacancies.size();
            }
            
            response.put("total_found", totalFound);
            response.put("saved", totalSaved);
            response.put("errors", null);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Error in parseAll: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Internal server error");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
}







