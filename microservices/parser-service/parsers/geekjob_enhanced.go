package parsers

import (
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/go-rod/rod"
	"github.com/sirupsen/logrus"
	"job-filter-parser-service/models"
)

// GeekjobEnhancedParser улучшенный парсер для Geekjob.ru с поддержкой JavaScript
type GeekjobEnhancedParser struct {
	DatabaseServiceURL string
	Browser            *rod.Browser
	Timeout            time.Duration
	Delay              time.Duration
	DesignKeywords     []string
	ExcludedKeywords   []string
}

// NewGeekjobEnhancedParser создает новый экземпляр GeekjobEnhancedParser
func NewGeekjobEnhancedParser(databaseServiceURL string, timeout, delay time.Duration) *GeekjobEnhancedParser {
	browser := rod.New().MustConnect()
	
	return &GeekjobEnhancedParser{
		DatabaseServiceURL: databaseServiceURL,
		Browser:            browser,
		Timeout:            timeout,
		Delay:              delay,
		DesignKeywords: []string{
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
		ExcludedKeywords: []string{
			"текстиль", "текстильный", "ткань", "одежда", "мода", "fashion",
			"ювелирный", "ювелир", "украшения", "бижутерия",
			"мебель", "интерьер", "декор", "ландшафт", "садовый",
			"промышленный", "машиностроение", "автомобильный",
			"упаковка", "полиграфия", "печать", "типография",
			"архитектурный", "строительный", "реставрация",
		},
	}
}

// ParseAllSources запускает парсинг Geekjob.ru с JavaScript
func (p *GeekjobEnhancedParser) ParseAllSources(query string, pages int) ([]models.Vacancy, error) {
	logrus.Infof("Starting enhanced Geekjob.ru parsing: query='%s', pages=%d", query, pages)
	var allVacancies []models.Vacancy

	for i := 1; i <= pages; i++ {
		vacancies, err := p.parseVacancyListPage(query, i)
		if err != nil {
			logrus.Errorf("Error parsing Geekjob.ru page %d: %v", i, err)
			continue
		}
		allVacancies = append(allVacancies, vacancies...)
		time.Sleep(p.Delay)
	}
	logrus.Infof("Enhanced Geekjob.ru parsing completed. Total: %d vacancies", len(allVacancies))
	return allVacancies, nil
}

func (p *GeekjobEnhancedParser) parseVacancyListPage(query string, page int) ([]models.Vacancy, error) {
	url := fmt.Sprintf("https://geekjob.ru/vacancies?q=%s&page=%d", url.QueryEscape(query), page)
	logrus.Infof("Parsing enhanced Geekjob.ru page %d: %s", page, url)

	// Создаем новую страницу
	page_rod := p.Browser.MustPage(url)
	defer page_rod.Close()

	// Ждем загрузки контента
	page_rod.MustWaitLoad().MustWaitIdle()

	// Ждем появления вакансий
	page_rod.MustElement(".vacancy-card").MustWaitVisible()

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
	doc.Find(".vacancy-card").Each(func(i int, s *goquery.Selection) {
		// Извлекаем данные из карточки вакансии
		title := s.Find(".vacancy-card__title").Text()
		company := s.Find(".vacancy-card__company").Text()
		location := s.Find(".vacancy-card__location").Text()
		salary := s.Find(".vacancy-card__salary").Text()
		publishedAtStr := s.Find(".vacancy-card__date").Text()

		// Получаем ссылку на вакансию
		href, exists := s.Find("a").Attr("href")
		if !exists {
			return
		}
		fullURL := "https://geekjob.ru" + href
		vacancyID := p.extractVacancyID(fullURL)

		publishedAt, _ := time.Parse("02.01.2006", publishedAtStr)

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
		} else {
			logrus.Debugf("Filtered out irrelevant vacancy: %s", vacancy.Title)
		}
	})

	return vacancies, nil
}

func (p *GeekjobEnhancedParser) extractVacancyID(url string) string {
	parts := strings.Split(url, "/vacancy/")
	if len(parts) > 1 {
		idParts := strings.Split(parts[1], "?")
		return strings.Split(idParts[0], "/")[0]
	}
	return ""
}

func (p *GeekjobEnhancedParser) isRelevantVacancy(title, description string) bool {
	text := strings.ToLower(title + " " + description)

	hasDesignKeywords := false
	for _, keyword := range p.DesignKeywords {
		if strings.Contains(text, strings.ToLower(keyword)) {
			hasDesignKeywords = true
			break
		}
	}

	hasExcludedKeywords := false
	for _, keyword := range p.ExcludedKeywords {
		if strings.Contains(text, strings.ToLower(keyword)) {
			hasExcludedKeywords = true
			break
		}
	}

	return hasDesignKeywords && !hasExcludedKeywords
}

// Close закрывает браузер
func (p *GeekjobEnhancedParser) Close() {
	if p.Browser != nil {
		p.Browser.MustClose()
	}
}







