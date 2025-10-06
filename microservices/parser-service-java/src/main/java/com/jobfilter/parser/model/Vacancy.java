package com.jobfilter.parser.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;

public class Vacancy {
    private String externalId;
    private String source;
    private String url;
    private String title;
    private String company;
    private String location;
    private String salary;
    private String description;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime publishedAt;
    
    private String status;

    // Constructors
    public Vacancy() {}

    public Vacancy(String externalId, String source, String url, String title, 
                   String company, String location, String salary, String description,
                   LocalDateTime publishedAt, String status) {
        this.externalId = externalId;
        this.source = source;
        this.url = url;
        this.title = title;
        this.company = company;
        this.location = location;
        this.salary = salary;
        this.description = description;
        this.publishedAt = publishedAt;
        this.status = status;
    }

    // Getters and Setters
    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getSalary() { return salary; }
    public void setSalary(String salary) { this.salary = salary; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getPublishedAt() { return publishedAt; }
    public void setPublishedAt(LocalDateTime publishedAt) { this.publishedAt = publishedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}







