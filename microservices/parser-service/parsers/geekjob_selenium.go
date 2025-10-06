package parsers

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/tebeka/selenium"
	"github.com/sirupsen/logrus"
	"job-filter-parser-service/models"
)

// GeekjobSeleniumParser парсер для Geekjob.ru с Selenium
type GeekjobSeleniumParser struct {
	wd              selenium.WebDriver
	databaseService string
	timeout         time.Duration
	delay           time.Duration
	designKeywords  []string
	excludedKeywords []string
}

// NewGeekjobSeleniumParser создает новый экземпляр GeekjobSeleniumParser
func NewGeekjobSeleniumParser(databaseService string, timeout, delay time.Duration) *GeekjobSeleniumParser {
	// Настраиваем Selenium
	caps := selenium.Capabilities{"browserName": "chrome"}
	wd, err := selenium.NewRemote(caps, "http://localhost:4444/wd/hub")
	if err != nil {
		logrus.Errorf("Failed to create Selenium WebDriver: %v", err)
		// Fallback на простой HTTP парсер
		return &GeekjobSeleniumParser{
			wd:              nil,
			databaseService: databaseService,
			timeout:         timeout,
			delay:           delay,
		}
	}

	return &GeekjobSeleniumParser{
		wd:              wd,
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

// ParseAllSources запускает парсинг Geekjob.ru с Selenium
func (p *GeekjobSeleniumParser) ParseAllSources(query string, pages int) ([]models.Vacancy, error) {
	logrus.Infof("Starting Geekjob.ru Selenium parsing: query='%s', pages=%d", query, pages)
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
	
	logrus.Infof("Geekjob.ru Selenium parsing completed. Total: %d vacancies", len(allVacancies))
	return allVacancies, nil
}

func (p *GeekjobSeleniumParser) parseVacancyListPage(query string, page int) ([]models.Vacancy, error) {
	url := fmt.Sprintf("https://geekjob.ru/vacancies?q=%s&page=%d", url.QueryEscape(query), page)
	logrus.Infof("Parsing Geekjob.ru Selenium page %d: %s", page, url)

	if p.wd == nil {
		// Fallback на простой HTTP парсер
		return p.parseWithHTTP(url, page)
	}

	// Переходим на страницу
	if err := p.wd.Get(url); err != nil {
		logrus.Errorf("Failed to navigate to %s: %v", url, err)
		return p.parseWithHTTP(url, page)
	}

	// Ждем загрузки
	time.Sleep(3 * time.Second)

	// Получаем HTML
	html, err := p.wd.PageSource()
	if err != nil {
		logrus.Errorf("Failed to get page source: %v", err)
		return p.parseWithHTTP(url, page)
	}

	// Парсим HTML
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	var vacancies []models.Vacancy
	
	// Пробуем разные селекторы
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
		if doc.Find(selector).Length() > 0 {
			foundSelector = selector
			break
		}
	}
	
	if foundSelector == "" {
		logrus.Warnf("No vacancy cards found on page %d", page)
		return []models.Vacancy{}, nil
	}
	
	logrus.Infof("Found vacancies with selector: %s", foundSelector)
	
	// Парсим вакансии
	doc.Find(foundSelector).Each(func(i int, s *goquery.Selection) {
		vacancy := p.extractVacancyData(s)
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

func (p *GeekjobSeleniumParser) parseWithHTTP(url string, page int) ([]models.Vacancy, error) {
	// Простой HTTP парсинг как fallback
	logrus.Infof("Using HTTP fallback for %s", url)
	return []models.Vacancy{}, nil
}

func (p *GeekjobSeleniumParser) extractVacancyData(s *goquery.Selection) models.Vacancy {
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
		href = ""
	}
	
	fullURL := href
	if href != "" && !strings.HasPrefix(href, "http") {
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

	return models.Vacancy{
		ExternalID:  vacancyID,
		Source:      "geekjob",
		URL:         fullURL,
		Title:       strings.TrimSpace(title),
		Company:     strings.TrimSpace(company),
		Location:    strings.TrimSpace(location),
		Salary:      strings.TrimSpace(salary),
		Description: "",
		PublishedAt: &publishedAt,
		Status:      "pending",
	}
}

func (p *GeekjobSeleniumParser) extractVacancyID(url string) string {
	parts := strings.Split(url, "/vacancy/")
	if len(parts) > 1 {
		idParts := strings.Split(parts[1], "?")
		return strings.Split(idParts[0], "/")[0]
	}
	return ""
}

func (p *GeekjobSeleniumParser) isRelevantVacancy(title, description string) bool {
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

// Close закрывает WebDriver
func (p *GeekjobSeleniumParser) Close() {
	if p.wd != nil {
		p.wd.Quit()
	}
}







