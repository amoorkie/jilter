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

// GetMatchParser структура для парсера GetMatch.ru
type GetMatchParser struct {
	DatabaseServiceURL string
	Client             *http.Client
	Timeout            time.Duration
	Delay              time.Duration
	DesignKeywords     []string
	ExcludedKeywords   []string
}

// NewGetMatchParser создает новый экземпляр GetMatchParser
func NewGetMatchParser(databaseServiceURL string, timeout, delay time.Duration) *GetMatchParser {
	return &GetMatchParser{
		DatabaseServiceURL: databaseServiceURL,
		Client: &http.Client{
			Timeout: timeout,
		},
		Timeout: timeout,
		Delay:   delay,
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

// ParseAllSources запускает парсинг GetMatch.ru
func (p *GetMatchParser) ParseAllSources(query string, pages int) ([]models.Vacancy, error) {
	logrus.Infof("Starting GetMatch.ru parsing: query='%s', pages=%d", query, pages)
	var allVacancies []models.Vacancy

	for i := 1; i <= pages; i++ {
		vacancies, err := p.parseVacancyListPage(query, i)
		if err != nil {
			logrus.Errorf("Error parsing GetMatch.ru page %d: %v", i, err)
			continue
		}
		allVacancies = append(allVacancies, vacancies...)
		time.Sleep(p.Delay)
	}
	logrus.Infof("GetMatch.ru parsing completed. Total: %d vacancies", len(allVacancies))
	return allVacancies, nil
}

func (p *GetMatchParser) parseVacancyListPage(query string, page int) ([]models.Vacancy, error) {
	url := fmt.Sprintf("https://getmatch.ru/vacancies?q=%s&page=%d", url.QueryEscape(query), page)
	logrus.Infof("Parsing GetMatch.ru page %d: %s", page, url)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	resp, err := p.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch page: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("received non-200 status code: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to parse HTML: %w", err)
	}

	var vacancies []models.Vacancy
	doc.Find("a[href*='/vacancy/']").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if !exists {
			return
		}
		fullURL := "https://getmatch.ru" + href
		vacancyID := p.extractVacancyID(fullURL)

		title := s.Find(".vacancy-card__title").Text()
		company := s.Find(".vacancy-card__company").Text()
		location := s.Find(".vacancy-card__location").Text()
		salary := s.Find(".vacancy-card__salary").Text()
		publishedAtStr := s.Find(".vacancy-card__date").Text()

		publishedAt, _ := time.Parse("02.01.2006", publishedAtStr)

		description := ""

		vacancy := models.Vacancy{
			ExternalID:  vacancyID,
			Source:      "getmatch",
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

func (p *GetMatchParser) extractVacancyID(url string) string {
	parts := strings.Split(url, "/vacancy/")
	if len(parts) > 1 {
		idParts := strings.Split(parts[1], "?")
		return strings.Split(idParts[0], "/")[0]
	}
	return ""
}

func (p *GetMatchParser) isRelevantVacancy(title, description string) bool {
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
