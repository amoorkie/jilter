package parsers

import (
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/go-rod/rod"
	"github.com/sirupsen/logrus"
	"job-filter-parser-service/models"
)

// GeekjobPlaywrightParser парсер для Geekjob.ru с Playwright
type GeekjobPlaywrightParser struct {
	browser         *rod.Browser
	databaseService string
	timeout         time.Duration
	delay           time.Duration
	designKeywords  []string
	excludedKeywords []string
}

// NewGeekjobPlaywrightParser создает новый экземпляр GeekjobPlaywrightParser
func NewGeekjobPlaywrightParser(databaseService string, timeout, delay time.Duration) *GeekjobPlaywrightParser {
	// Отключаем leakless через переменную окружения
	os.Setenv("ROD_LEAKLESS", "false")
	
	// Запускаем браузер
	browser := rod.New().
		NoDefaultDevice().
		MustConnect()

	return &GeekjobPlaywrightParser{
		browser:         browser,
		databaseService: databaseService,
		timeout:         timeout,
		delay:           delay,
		designKeywords: []string{
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
		},
		excludedKeywords: []string{
			"текстиль", "текстильный", "ткань", "одежда", "мода", "fashion",
			"ювелирный", "ювелир", "украшения", "бижутерия",
			"мебель", "интерьер", "декор", "ландшафт", "садовый",
			"промышленный", "машиностроение", "автомобильный",
			"упаковка", "полиграфия", "печать", "типография",
			"архитектурный", "строительный", "реставрация",
		},
	}
}

// ParseAllSources запускает парсинг Geekjob.ru с Playwright
func (p *GeekjobPlaywrightParser) ParseAllSources(query string, pages int) ([]models.Vacancy, error) {
	logrus.Infof("Starting Geekjob.ru Playwright parsing: query='%s', pages=%d", query, pages)
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
	
	logrus.Infof("Geekjob.ru Playwright parsing completed. Total: %d vacancies", len(allVacancies))
	return allVacancies, nil
}

func (p *GeekjobPlaywrightParser) parseVacancyListPage(query string, page int) ([]models.Vacancy, error) {
	url := fmt.Sprintf("https://geekjob.ru/vacancies?q=%s&page=%d", url.QueryEscape(query), page)
	logrus.Infof("Parsing Geekjob.ru Playwright page %d: %s", page, url)

	// Создаем новую страницу
	page_rod := p.browser.MustPage(url)
	defer page_rod.Close()

	// Устанавливаем заголовки
	page_rod.MustSetExtraHeaders("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	// Ждем загрузки контента
	page_rod.MustWaitLoad().MustWaitIdle()

	// Ждем появления вакансий (пробуем разные селекторы)
	selectors := []string{
		".vacancy-card",
		".vacancy-item", 
		".job-card",
		".vacancy",
		"[data-testid*='vacancy']",
		".search-result-item",
		".job-item",
		"a[href*='/vacancy/']",
		".vacancy-list .vacancy",
		".jobs-list .job",
	}

	var foundSelector string
	for _, selector := range selectors {
		// Ждем появления элемента
		page_rod.MustElement(selector).MustWaitVisible()
		if page_rod.MustElement(selector).MustText() != "" {
			foundSelector = selector
			break
		}
	}

	if foundSelector == "" {
		logrus.Warnf("No vacancy cards found on page %d", page)
		return []models.Vacancy{}, nil
	}

	logrus.Infof("Found vacancies with selector: %s", foundSelector)

	// Получаем HTML после JavaScript рендеринга
	html, err := page_rod.HTML()
	if err != nil {
		return nil, fmt.Errorf("failed to get HTML: %w", err)
	}

	// Парсим HTML с помощью goquery
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	var vacancies []models.Vacancy
	doc.Find(foundSelector).Each(func(i int, s *goquery.Selection) {
		// Извлекаем данные из карточки вакансии
		title := s.Find("h3, .title, .job-title, .vacancy-title").First().Text()
		if title == "" {
			title = s.Find("a").First().Text()
		}
		
		company := s.Find(".company, .employer, .job-company").First().Text()
		if company == "" {
			company = s.Find("span").First().Text()
		}
		
		location := s.Find(".location, .city, .job-location").First().Text()
		salary := s.Find(".salary, .job-salary, .wage").First().Text()
		publishedAtStr := s.Find(".date, .published, .job-date").First().Text()

		// Получаем ссылку на вакансию
		href, exists := s.Find("a").First().Attr("href")
		if !exists {
			return
		}
		
		fullURL := href
		if !strings.HasPrefix(href, "http") {
			fullURL = "https://geekjob.ru" + href
		}
		
		vacancyID := p.extractVacancyID(fullURL)

		publishedAt, _ := time.Parse("02.01.2006", publishedAtStr)
		if publishedAt.IsZero() {
			publishedAt, _ = time.Parse("2006-01-02", publishedAtStr)
		}
		if publishedAt.IsZero() {
			publishedAt = time.Now()
		}

		description := ""

		vacancy := models.Vacancy{
			ExternalID:  vacancyID,
			Source:      "geekjob",
			URL:         fullURL,
			Title:       strings.TrimSpace(title),
			Company:     strings.TrimSpace(company),
			Location:    strings.TrimSpace(location),
			Salary:      strings.TrimSpace(salary),
			Description: strings.TrimSpace(description),
			PublishedAt: &publishedAt,
			Status:      "pending",
		}

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

func (p *GeekjobPlaywrightParser) extractVacancyID(url string) string {
	parts := strings.Split(url, "/vacancy/")
	if len(parts) > 1 {
		idParts := strings.Split(parts[1], "?")
		return strings.Split(idParts[0], "/")[0]
	}
	return ""
}

func (p *GeekjobPlaywrightParser) isRelevantVacancy(title, description string) bool {
	text := strings.ToLower(title + " " + description)

	hasDesignKeywords := false
	for _, keyword := range p.designKeywords {
		if strings.Contains(text, strings.ToLower(keyword)) {
			hasDesignKeywords = true
			break
		}
	}

	hasExcludedKeywords := false
	for _, keyword := range p.excludedKeywords {
		if strings.Contains(text, strings.ToLower(keyword)) {
			hasExcludedKeywords = true
			break
		}
	}

	return hasDesignKeywords && !hasExcludedKeywords
}

// Close закрывает браузер
func (p *GeekjobPlaywrightParser) Close() {
	if p.browser != nil {
		p.browser.MustClose()
	}
}
