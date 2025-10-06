package parsers

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/sirupsen/logrus"
	"job-filter-parser-service/models"
)

// GeekjobSimpleParser простой парсер для Geekjob.ru без JavaScript
type GeekjobSimpleParser struct {
	client          *http.Client
	databaseService string
	timeout         time.Duration
	delay           time.Duration
}

// NewGeekjobSimpleParser создает новый экземпляр GeekjobSimpleParser
func NewGeekjobSimpleParser(databaseService string, timeout, delay time.Duration) *GeekjobSimpleParser {
	return &GeekjobSimpleParser{
		client: &http.Client{
			Timeout: timeout,
		},
		databaseService: databaseService,
		timeout:         timeout,
		delay:           delay,
	}
}

// ParseAllSources запускает парсинг Geekjob.ru
func (p *GeekjobSimpleParser) ParseAllSources(query string, pages int) ([]models.Vacancy, error) {
	logrus.Infof("Starting Geekjob.ru simple parsing: query='%s', pages=%d", query, pages)
	var allVacancies []models.Vacancy

	for i := 1; i <= pages; i++ {
		vacancies, err := p.parseVacancyListPage(query, i)
		if err != nil {
			logrus.Errorf("Error parsing Geekjob.ru page %d: %v", i, err)
			continue
		}
		allVacancies = append(allVacancies, vacancies...)
		time.Sleep(p.delay)
	}
	
	logrus.Infof("Geekjob.ru simple parsing completed. Total: %d vacancies", len(allVacancies))
	return allVacancies, nil
}

func (p *GeekjobSimpleParser) parseVacancyListPage(query string, page int) ([]models.Vacancy, error) {
	baseURL := "https://geekjob.ru/vacancies"
	params := url.Values{}
	params.Add("q", query)
	params.Add("page", fmt.Sprintf("%d", page))
	
	fullURL := baseURL + "?" + params.Encode()
	
	logrus.Infof("Parsing Geekjob.ru simple: %s", fullURL)
	
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
	
	// Пробуем разные селекторы для поиска вакансий
	selectors := []string{
		"a[href*='/vacancy/']",
		".vacancy-card a",
		".job-card a", 
		".vacancy a",
		"[data-testid*='vacancy'] a",
		".search-result-item a",
		".job-item a",
	}
	
	var foundSelector string
	for _, selector := range selectors {
		if doc.Find(selector).Length() > 0 {
			foundSelector = selector
			break
		}
	}
	
	if foundSelector == "" {
		logrus.Warnf("No vacancy links found on page %d", page)
		return []models.Vacancy{}, nil
	}
	
	logrus.Infof("Found vacancies with selector: %s", foundSelector)
	
	// Ищем ссылки на вакансии
	doc.Find(foundSelector).Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if !exists {
			return
		}
		
		// Преобразуем относительную ссылку в абсолютную
		if strings.HasPrefix(href, "/") {
			href = "https://geekjob.ru" + href
		}
		
		// Извлекаем ID вакансии
		vacancyID := p.extractVacancyID(href)
		if vacancyID == "" {
			return
		}
		
		// Извлекаем заголовок
		title := s.Text()
		if title == "" {
			title = s.Find("h3, .title, .job-title").First().Text()
		}
		
		// Извлекаем компанию
		company := s.Parent().Find(".company, .employer").First().Text()
		if company == "" {
			company = "Не указано"
		}
		
		// Извлекаем локацию
		location := s.Parent().Find(".location, .city").First().Text()
		if location == "" {
			location = "Не указано"
		}
		
		// Извлекаем зарплату
		salary := s.Parent().Find(".salary, .wage").First().Text()
		
		// Извлекаем дату
		publishedAtStr := s.Parent().Find(".date, .published").First().Text()
		publishedAt, _ := time.Parse("02.01.2006", publishedAtStr)
		if publishedAt.IsZero() {
			publishedAt = time.Now()
		}
		
		vacancy := models.Vacancy{
			ExternalID:  vacancyID,
			Source:      "geekjob",
			URL:         href,
			Title:       strings.TrimSpace(title),
			Company:     strings.TrimSpace(company),
			Location:    strings.TrimSpace(location),
			Salary:      strings.TrimSpace(salary),
			Description: "",
			PublishedAt: &publishedAt,
			Status:      "pending",
		}
		
		// Проверяем релевантность
		if p.isRelevantVacancy(vacancy.Title, vacancy.Description) {
			vacancies = append(vacancies, vacancy)
			logrus.Debugf("Found relevant vacancy: %s at %s", vacancy.Title, vacancy.Company)
		} else {
			logrus.Debugf("Filtered out irrelevant vacancy: %s", vacancy.Title)
		}
	})
	
	logrus.Infof("Found %d vacancies on page %d", len(vacancies), page)
	return vacancies, nil
}

func (p *GeekjobSimpleParser) extractVacancyID(url string) string {
	parts := strings.Split(url, "/vacancy/")
	if len(parts) > 1 {
		idParts := strings.Split(parts[1], "?")
		return strings.Split(idParts[0], "/")[0]
	}
	return ""
}

func (p *GeekjobSimpleParser) isRelevantVacancy(title, description string) bool {
	text := strings.ToLower(title + " " + description)
	
	// Ключевые слова для дизайнеров
	designKeywords := []string{
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
		"мобильный дизайн", "mobile design", "app design", "дизайн приложений",
	}
	
	// Исключающие ключевые слова
	excludedKeywords := []string{
		"текстиль", "текстильный", "ткань", "одежда", "мода", "fashion",
		"ювелирный", "ювелир", "украшения", "бижутерия",
		"мебель", "интерьер", "декор", "ландшафт", "садовый",
		"промышленный", "машиностроение", "автомобильный",
		"упаковка", "полиграфия", "печать", "типография",
		"архитектурный", "строительный", "реставрация",
	}
	
	hasDesignKeywords := false
	for _, keyword := range designKeywords {
		if strings.Contains(text, strings.ToLower(keyword)) {
			hasDesignKeywords = true
			break
		}
	}
	
	hasExcludedKeywords := false
	for _, keyword := range excludedKeywords {
		if strings.Contains(text, strings.ToLower(keyword)) {
			hasExcludedKeywords = true
			break
		}
	}
	
	return hasDesignKeywords && !hasExcludedKeywords
}







