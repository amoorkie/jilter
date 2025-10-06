package com.jobfilter.parser.parser;

import com.jobfilter.parser.model.Vacancy;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;

@Component
public class GeekjobParser {
    
    private final List<String> designKeywords = Arrays.asList(
        "дизайн", "design", "ui", "ux", "веб-дизайн", "web design",
        "графический дизайн", "graphic design", "интерфейс", "interface",
        "пользовательский опыт", "user experience", "figma", "sketch",
        "adobe", "photoshop", "illustrator", "индизайн", "indesign",
        "веб-дизайнер", "web designer", "ui дизайнер", "ux дизайнер",
        "графический дизайнер", "graphic designer", "дизайнер интерфейсов",
        "interface designer", "product designer", "продуктовый дизайнер",
        "моушн дизайнер", "motion designer", "анимация", "animation",
        "брендинг", "branding", "логотип", "logo", "иконки", "icons",
        "типографика", "typography", "цвет", "color", "композиция",
        "composition", "макет", "layout", "wireframe", "прототип",
        "prototype", "usability", "юзабилити", "accessibility",
        "доступность", "responsive", "адаптивный", "mobile first",
        "мобильный дизайн", "mobile design", "app design", "дизайн приложений"
    );
    
    private final List<String> excludedKeywords = Arrays.asList(
        "текстиль", "текстильный", "ткань", "одежда", "мода", "fashion",
        "ювелирный", "ювелир", "украшения", "бижутерия",
        "мебель", "интерьер", "декор", "ландшафт", "садовый",
        "промышленный", "машиностроение", "автомобильный",
        "упаковка", "полиграфия", "печать", "типография",
        "архитектурный", "строительный", "реставрация"
    );

    public List<Vacancy> parseVacancies(String query, int pages) {
        List<Vacancy> allVacancies = new ArrayList<>();
        WebDriver driver = null;
        
        try {
            // Настраиваем Chrome WebDriver
            ChromeOptions options = new ChromeOptions();
            options.addArguments("--headless");
            options.addArguments("--no-sandbox");
            options.addArguments("--disable-dev-shm-usage");
            options.addArguments("--disable-gpu");
            options.addArguments("--window-size=1920,1080");
            options.addArguments("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            
            driver = new ChromeDriver(options);
            WebDriverWait wait = new WebDriverWait(driver, java.time.Duration.ofSeconds(10));
            
            for (int page = 1; page <= pages; page++) {
                String url = String.format("https://geekjob.ru/vacancies?q=%s&page=%d", 
                    java.net.URLEncoder.encode(query, "UTF-8"), page);
                
                System.out.println("Parsing Geekjob.ru page " + page + ": " + url);
                
                driver.get(url);
                
                // Ждем загрузки контента
                Thread.sleep(3000);
                
                // Получаем HTML после JavaScript рендеринга
                String html = driver.getPageSource();
                Document doc = Jsoup.parse(html);
                
                // Пробуем разные селекторы для поиска вакансий
                String[] selectors = {
                    ".vacancy-card",
                    ".vacancy-item", 
                    ".job-card",
                    ".vacancy",
                    "[data-testid*='vacancy']",
                    ".search-result-item",
                    ".job-item",
                    "a[href*='/vacancy/']",
                    ".vacancy-list .vacancy",
                    ".jobs-list .job"
                };
                
                Elements vacancyElements = null;
                for (String selector : selectors) {
                    vacancyElements = doc.select(selector);
                    if (!vacancyElements.isEmpty()) {
                        System.out.println("Found vacancies with selector: " + selector);
                        break;
                    }
                }
                
                if (vacancyElements == null || vacancyElements.isEmpty()) {
                    System.out.println("No vacancy cards found on page " + page);
                    continue;
                }
                
                // Парсим каждую вакансию
                for (Element element : vacancyElements) {
                    Vacancy vacancy = extractVacancyData(element);
                    if (vacancy != null && isRelevantVacancy(vacancy)) {
                        allVacancies.add(vacancy);
                        System.out.println("Found relevant vacancy: " + vacancy.getTitle() + " at " + vacancy.getCompany());
                    }
                }
                
                System.out.println("Found " + vacancyElements.size() + " vacancies on page " + page);
            }
            
        } catch (Exception e) {
            System.err.println("Error parsing Geekjob.ru: " + e.getMessage());
            e.printStackTrace();
        } finally {
            if (driver != null) {
                driver.quit();
            }
        }
        
        System.out.println("Geekjob.ru parsing completed. Total: " + allVacancies.size() + " vacancies");
        return allVacancies;
    }
    
    private Vacancy extractVacancyData(Element element) {
        try {
            // Извлекаем заголовок
            String title = element.select("h3, .title, .job-title, .vacancy-title").first() != null ?
                element.select("h3, .title, .job-title, .vacancy-title").first().text() :
                element.select("a").first() != null ? element.select("a").first().text() : "";
            
            if (title.isEmpty()) return null;
            
            // Извлекаем компанию
            String company = element.select(".company, .employer, .job-company").first() != null ?
                element.select(".company, .employer, .job-company").first().text() :
                element.select("span").first() != null ? element.select("span").first().text() : "Не указано";
            
            // Извлекаем локацию
            String location = element.select(".location, .city, .job-location").first() != null ?
                element.select(".location, .city, .job-location").first().text() : "Не указано";
            
            // Извлекаем зарплату
            String salary = element.select(".salary, .job-salary, .wage").first() != null ?
                element.select(".salary, .job-salary, .wage").first().text() : "";
            
            // Извлекаем дату
            String publishedAtStr = element.select(".date, .published, .job-date").first() != null ?
                element.select(".date, .published, .job-date").first().text() : "";
            
            LocalDateTime publishedAt = LocalDateTime.now();
            if (!publishedAtStr.isEmpty()) {
                try {
                    publishedAt = LocalDateTime.parse(publishedAtStr, DateTimeFormatter.ofPattern("dd.MM.yyyy"));
                } catch (Exception e) {
                    // Если не удалось распарсить, используем текущее время
                }
            }
            
            // Извлекаем ссылку
            String href = element.select("a").first() != null ?
                element.select("a").first().attr("href") : "";
            
            String fullUrl = href;
            if (!href.isEmpty() && !href.startsWith("http")) {
                fullUrl = "https://geekjob.ru" + href;
            }
            
            String vacancyId = extractVacancyId(fullUrl);
            
            return new Vacancy(
                vacancyId,
                "geekjob",
                fullUrl,
                title.trim(),
                company.trim(),
                location.trim(),
                salary.trim(),
                "",
                publishedAt,
                "pending"
            );
            
        } catch (Exception e) {
            System.err.println("Error extracting vacancy data: " + e.getMessage());
            return null;
        }
    }
    
    private String extractVacancyId(String url) {
        if (url.contains("/vacancy/")) {
            String[] parts = url.split("/vacancy/");
            if (parts.length > 1) {
                String[] idParts = parts[1].split("\\?");
                return idParts[0].split("/")[0];
            }
        }
        return "";
    }
    
    private boolean isRelevantVacancy(Vacancy vacancy) {
        String text = (vacancy.getTitle() + " " + vacancy.getDescription()).toLowerCase();
        
        // Проверяем наличие ключевых слов дизайна
        boolean hasDesignKeywords = designKeywords.stream()
            .anyMatch(keyword -> text.contains(keyword.toLowerCase()));
        
        // Проверяем наличие исключающих ключевых слов
        boolean hasExcludedKeywords = excludedKeywords.stream()
            .anyMatch(keyword -> text.contains(keyword.toLowerCase()));
        
        return hasDesignKeywords && !hasExcludedKeywords;
    }
}







