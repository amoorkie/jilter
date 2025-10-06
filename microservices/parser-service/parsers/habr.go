package parsers

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"job-filter-parser-service/models"
)

// HabrParser парсер для Habr Career
type HabrParser struct {
	client          *http.Client
	databaseService string
	timeout         time.Duration
	delay           time.Duration
}

// NewHabrParser создает новый экземпляр парсера Habr Career
func NewHabrParser(databaseService string, timeout, delay time.Duration) *HabrParser {
	return &HabrParser{
		client: &http.Client{
			Timeout: timeout,
		},
		databaseService: databaseService,
		timeout:        timeout,
		delay:          delay,
	}
}

// IsRelevantVacancy проверяет релевантность вакансии для дизайнеров
func (p *HabrParser) IsRelevantVacancy(title, description string) bool {
	text := strings.ToLower(title + " " + description)
	
	// Проверяем наличие ключевых слов дизайна
	hasDesignKeywords := false
	for _, keyword := range designKeywords {
		if strings.Contains(text, strings.ToLower(keyword)) {
			hasDesignKeywords = true
			break
		}
	}
	
	// Проверяем отсутствие исключающих ключевых слов
	hasExcludedKeywords := false
	for _, keyword := range excludedKeywords {
		if strings.Contains(text, strings.ToLower(keyword)) {
			hasExcludedKeywords = true
			break
		}
	}
	
	// Вакансия релевантна, если есть ключевые слова дизайна И нет исключающих
	return hasDesignKeywords && !hasExcludedKeywords
}

// ExtractVacancyID извлекает ID вакансии из URL
func (p *HabrParser) ExtractVacancyID(vacancyURL string) string {
	re := regexp.MustCompile(`/vacancies/(\d+)`)
	matches := re.FindStringSubmatch(vacancyURL)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// ParseVacancyListPage парсит страницу со списком вакансий
func (p *HabrParser) ParseVacancyListPage(query string, page int) ([]models.Vacancy, error) {
	baseURL := "https://career.habr.com/vacancies"
	params := url.Values{}
	params.Add("q", query)
	params.Add("page", fmt.Sprintf("%d", page))
	
	fullURL := baseURL + "?" + params.Encode()
	
	req, err := http.NewRequest("GET", fullURL, nil)
	if err != nil {
		return nil, fmt.Errorf("ошибка создания запроса: %v", err)
	}
	
	// Устанавливаем заголовки
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	
	resp, err := p.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ошибка выполнения запроса: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("неожиданный статус код: %d", resp.StatusCode)
	}
	
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("ошибка парсинга HTML: %v", err)
	}
	
	var vacancies []models.Vacancy
	
	// Ищем ссылки на вакансии
	doc.Find("a[href*='/vacancies/']").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if !exists {
			return
		}
		
		// Преобразуем относительную ссылку в абсолютную
		if strings.HasPrefix(href, "/") {
			href = "https://career.habr.com" + href
		}
		
		// Извлекаем ID вакансии
		vacancyID := p.ExtractVacancyID(href)
		if vacancyID == "" {
			return
		}
		
		// Парсим детали вакансии
		vacancy, err := p.ParseVacancyDetails(href)
		if err != nil {
			return // Пропускаем вакансии с ошибками
		}
		
		// Проверяем релевантность
		if p.IsRelevantVacancy(vacancy.Title, vacancy.Description) {
			vacancies = append(vacancies, vacancy)
		}
	})
	
	return vacancies, nil
}

// ParseVacancyDetails парсит детали конкретной вакансии
func (p *HabrParser) ParseVacancyDetails(vacancyURL string) (models.Vacancy, error) {
	req, err := http.NewRequest("GET", vacancyURL, nil)
	if err != nil {
		return models.Vacancy{}, fmt.Errorf("ошибка создания запроса: %v", err)
	}
	
	// Устанавливаем заголовки
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")
	
	resp, err := p.client.Do(req)
	if err != nil {
		return models.Vacancy{}, fmt.Errorf("ошибка выполнения запроса: %v", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != http.StatusOK {
		return models.Vacancy{}, fmt.Errorf("неожиданный статус код: %d", resp.StatusCode)
	}
	
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return models.Vacancy{}, fmt.Errorf("ошибка парсинга HTML: %v", err)
	}
	
	vacancy := models.Vacancy{
		ExternalID:      p.ExtractVacancyID(vacancyURL),
		Source:          "habr",
		URL:             vacancyURL,
		Status:          "pending",
		NeedsFormatting: true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	
	// Извлекаем заголовок
	doc.Find(".vacancy-card__title, .vacancy-title, h1").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Title = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем компанию
	doc.Find(".vacancy-card__company, .company-name, .vacancy-company").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Company = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем зарплату
	doc.Find(".vacancy-card__salary, .salary, .vacancy-salary").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Salary = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем локацию
	doc.Find(".vacancy-card__location, .location, .vacancy-location").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Location = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем описание
	doc.Find(".vacancy-card__description, .description, .vacancy-description").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Description = strings.TrimSpace(s.Text())
		vacancy.FullDescription = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем требования
	doc.Find(".vacancy-card__requirements, .requirements, .vacancy-requirements").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Requirements = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем задачи
	doc.Find(".vacancy-card__tasks, .tasks, .vacancy-tasks").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Tasks = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем условия
	doc.Find(".vacancy-card__conditions, .conditions, .vacancy-conditions").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Conditions = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем тип занятости
	doc.Find(".vacancy-card__employment, .employment, .vacancy-employment").First().Each(func(i int, s *goquery.Selection) {
		vacancy.EmploymentType = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем уровень опыта
	doc.Find(".vacancy-card__experience, .experience, .vacancy-experience").First().Each(func(i int, s *goquery.Selection) {
		vacancy.ExperienceLevel = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем логотип компании
	doc.Find(".vacancy-card__logo img, .company-logo img, .vacancy-logo img").First().Each(func(i int, s *goquery.Selection) {
		if src, exists := s.Attr("src"); exists {
			vacancy.CompanyLogo = src
		}
	})
	
	// Извлекаем URL компании
	doc.Find(".vacancy-card__company-url a, .company-url a, .vacancy-company-url a").First().Each(func(i int, s *goquery.Selection) {
		if href, exists := s.Attr("href"); exists {
			vacancy.CompanyURL = href
		}
	})
	
	return vacancy, nil
}

// ParseAllSources парсит все источники
func (p *HabrParser) ParseAllSources(query string, pages int) ([]models.Vacancy, error) {
	var allVacancies []models.Vacancy
	
	for page := 1; page <= pages; page++ {
		vacancies, err := p.ParseVacancyListPage(query, page)
		if err != nil {
			return nil, fmt.Errorf("ошибка парсинга страницы %d: %v", page, err)
		}
		
		allVacancies = append(allVacancies, vacancies...)
		
		// Задержка между запросами
		if page < pages {
			time.Sleep(p.delay)
		}
	}
	
	return allVacancies, nil
}







