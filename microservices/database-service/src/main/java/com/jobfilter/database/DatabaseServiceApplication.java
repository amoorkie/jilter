package com.jobfilter.database;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories
public class DatabaseServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(DatabaseServiceApplication.class, args);
    }
}



