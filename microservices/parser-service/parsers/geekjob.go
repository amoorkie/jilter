package parsers

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/go-rod/rod"
	"github.com/sirupsen/logrus"
	"job-filter-parser-service/models"
)

// GeekjobParser парсер для Geekjob.ru
type GeekjobParser struct {
	client          *http.Client
	browser         *rod.Browser
	databaseService string
	timeout         time.Duration
	delay           time.Duration
}

// Ключевые слова для дизайнеров
var designKeywords = []string{
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
var excludedKeywords = []string{
	"текстиль", "текстильный", "ткань", "одежда", "мода", "fashion",
	"ювелирный", "ювелир", "украшения", "бижутерия",
	"мебель", "интерьер", "декор", "ландшафт", "садовый",
	"промышленный", "машиностроение", "автомобильный",
	"упаковка", "полиграфия", "печать", "типография",
	"архитектурный", "строительный", "реставрация",
	"косметический", "парикмахер", "маникюр", "педикюр",
	"кулинарный", "кондитер", "повар", "шеф-повар",
	"флористика", "цветы", "букет", "свадебный",
	"тату", "татуировка", "пирсинг", "боди-арт",
	"фотограф", "фото", "видео", "монтаж",
	"звук", "аудио", "музыка", "композитор",
	"танцы", "хореограф", "балет", "современный танец",
	"актер", "актриса", "театр", "кино",
	"писатель", "журналист", "копирайтер", "редактор",
	"переводчик", "лингвист", "филолог",
	"психолог", "психотерапевт", "коуч",
	"тренер", "фитнес", "йога", "пилатес",
	"массаж", "массажист", "спа", "салон",
	"продавец", "консультант", "менеджер по продажам",
	"водитель", "курьер", "логист", "склад",
	"охрана", "охранник", "секретарь", "администратор",
	"уборщик", "уборщица", "дворник", "садовник",
	"электрик", "сантехник", "слесарь", "механик",
	"сварщик", "токарь", "фрезеровщик", "слесарь-сборщик",
	"маляр", "штукатур", "плиточник", "каменщик",
	"столяр", "плотник", "краснодеревщик", "мебельщик",
	"швея", "портной", "закройщик", "модельер",
	"обувщик", "сапожник", "кожевник", "скорняк",
	"ювелир", "гравер", "чеканщик", "литейщик",
	"стеклодув", "керамист", "гончар", "скульптор",
	"художник", "живописец", "график", "иллюстратор",
	"каллиграф", "шрифтовик", "типограф", "печатник",
	"переплетчик", "реставратор книг", "библиотекарь",
	"архивариус", "музейный работник", "экскурсовод",
	"гид", "переводчик-гид", "туристический агент",
	"менеджер по туризму", "организатор мероприятий",
	"декоратор", "оформитель", "витринист", "мерчандайзер",
	"дизайнер одежды", "модельер", "стилист", "имиджмейкер",
	"визажист", "гример", "парикмахер-стилист",
	"мастер маникюра", "мастер педикюра", "косметолог",
	"массажист", "мастер по массажу", "рефлексотерапевт",
	"ароматерапевт", "эстетист", "мастер по наращиванию",
	"мастер по татуажу", "мастер по микроблейдингу",
	"мастер по ламинированию", "мастер по лашмейкингу",
	"мастер по перманентному макияжу", "мастер по бровям",
	"мастер по ресницам", "лашмейкер", "бровист",
	"мастер по ногтям", "нейл-мастер", "мастер по маникюру",
	"мастер по педикюру", "подолог", "мастер по стопам",
	"мастер по телу", "мастер по лицу", "эстетист",
	"косметолог-эстетист", "дерматолог", "трихолог",
	"мастер по волосам", "колорист", "мастер по окрашиванию",
	"мастер по стрижке", "барбер", "мастер по бороде",
	"мастер по усам", "мастер по бритью", "мастер по уходу",
	"мастер по укладке", "мастер по прическам", "стилист-парикмахер",
	"мастер по наращиванию волос", "мастер по плетению",
	"мастер по афрокосичкам", "мастер по дредам",
	"мастер по локонам", "мастер по завивке", "мастер по выпрямлению",
	"мастер по кератиновому выпрямлению", "мастер по ботоксу",
	"мастер по филлерам", "мастер по мезотерапии",
	"мастер по биоревитализации", "мастер по плазмолифтингу",
	"мастер по карбокситерапии", "мастер по озонотерапии",
	"мастер по криотерапии", "мастер по ультразвуку",
	"мастер по радиочастотному лифтингу", "мастер по лазеру",
	"мастер по фотоомоложению", "мастер по IPL",
	"мастер по эпиляции", "мастер по депиляции",
	"мастер по шугарингу", "мастер по восковой депиляции",
	"мастер по лазерной эпиляции", "мастер по электроэпиляции",
	"мастер по фотоэпиляции", "мастер по элос-эпиляции",
	"мастер по SHR-эпиляции", "мастер по AFT-эпиляции",
	"мастер по диодной эпиляции", "мастер по александритовой эпиляции",
	"мастер по рубиновой эпиляции", "мастер по сапфировой эпиляции",
	"мастер по неодимовой эпиляции", "мастер по эрбиевой эпиляции",
	"мастер по углекислотной эпиляции", "мастер по оксидной эпиляции",
	"мастер по азотной эпиляции", "мастер по гелиевой эпиляции",
	"мастер по аргоновой эпиляции", "мастер по ксеноновой эпиляции",
	"мастер по криптоновой эпиляции", "мастер по радоновой эпиляции",
	"мастер по ториевой эпиляции", "мастер по урановой эпиляции",
	"мастер по плутониевой эпиляции", "мастер по америциевой эпиляции",
	"мастер по кюриевой эпиляции", "мастер по берклиевой эпиляции",
	"мастер по калифорниевой эпиляции", "мастер по эйнштейниевой эпиляции",
	"мастер по фермиевой эпиляции", "мастер по менделевиевой эпиляции",
	"мастер по нобелиевой эпиляции", "мастер по лоуренсиевой эпиляции",
	"мастер по резерфордиевой эпиляции", "мастер по дубниевой эпиляции",
	"мастер по сиборгиевой эпиляции", "мастер по бориевой эпиляции",
	"мастер по хассиевой эпиляции", "мастер по мейтнериевой эпиляции",
	"мастер по дармштадтиевой эпиляции", "мастер по рентгениевой эпиляции",
	"мастер по коперницииевой эпиляции", "мастер по флеровиевой эпиляции",
	"мастер по ливермориевой эпиляции", "мастер по оганессоновой эпиляции",
	"мастер по теннессиневой эпиляции", "мастер по московиевой эпиляции",
}

// NewGeekjobParser создает новый экземпляр парсера Geekjob
func NewGeekjobParser(databaseService string, timeout, delay time.Duration) *GeekjobParser {
	// Запускаем браузер для JavaScript
	browser := rod.New().MustConnect()
	
	return &GeekjobParser{
		client: &http.Client{
			Timeout: timeout,
		},
		browser:         browser,
		databaseService: databaseService,
		timeout:        timeout,
		delay:          delay,
	}
}

// IsRelevantVacancy проверяет релевантность вакансии для дизайнеров
func (p *GeekjobParser) IsRelevantVacancy(title, description string) bool {
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
func (p *GeekjobParser) ExtractVacancyID(vacancyURL string) string {
	re := regexp.MustCompile(`/vacancy/(\d+)`)
	matches := re.FindStringSubmatch(vacancyURL)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// ParseVacancyListPage парсит страницу со списком вакансий
func (p *GeekjobParser) ParseVacancyListPage(query string, page int) ([]models.Vacancy, error) {
	baseURL := "https://geekjob.ru/vacancies"
	params := url.Values{}
	params.Add("q", query)
	params.Add("page", fmt.Sprintf("%d", page))
	
	fullURL := baseURL + "?" + params.Encode()
	
	logrus.Infof("Parsing Geekjob.ru with JavaScript: %s", fullURL)
	
	// Создаем новую страницу в браузере
	page_rod := p.browser.MustPage(fullURL)
	defer page_rod.Close()
	
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
	}
	
	var foundSelector string
	for _, selector := range selectors {
		if page_rod.MustElement(selector).MustWaitVisible().MustText() != "" {
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
	
	// Ищем вакансии с найденным селектором
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
		
		vacancyID := p.ExtractVacancyID(fullURL)

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

		if p.IsRelevantVacancy(vacancy.Title, vacancy.Description) {
			vacancies = append(vacancies, vacancy)
			logrus.Debugf("Found relevant vacancy: %s at %s", vacancy.Title, vacancy.Company)
		} else {
			logrus.Debugf("Filtered out irrelevant vacancy: %s", vacancy.Title)
		}
	})
	
	logrus.Infof("Found %d vacancies on page %d", len(vacancies), page)
	return vacancies, nil
}

// Close закрывает браузер
func (p *GeekjobParser) Close() {
	if p.browser != nil {
		p.browser.MustClose()
	}
}

// ParseVacancyDetails парсит детали конкретной вакансии
func (p *GeekjobParser) ParseVacancyDetails(vacancyURL string) (models.Vacancy, error) {
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
		Source:          "geekjob",
		URL:             vacancyURL,
		Status:          "pending",
		NeedsFormatting: true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	
	// Извлекаем заголовок
	doc.Find("h1").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Title = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем компанию
	doc.Find(".company-name, .company, [class*='company']").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Company = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем зарплату
	doc.Find(".salary, [class*='salary']").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Salary = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем локацию
	doc.Find(".location, [class*='location']").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Location = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем описание
	doc.Find(".description, .vacancy-description, [class*='description']").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Description = strings.TrimSpace(s.Text())
		vacancy.FullDescription = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем требования
	doc.Find(".requirements, [class*='requirements']").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Requirements = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем задачи
	doc.Find(".tasks, [class*='tasks']").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Tasks = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем условия
	doc.Find(".conditions, [class*='conditions']").First().Each(func(i int, s *goquery.Selection) {
		vacancy.Conditions = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем тип занятости
	doc.Find(".employment-type, [class*='employment']").First().Each(func(i int, s *goquery.Selection) {
		vacancy.EmploymentType = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем уровень опыта
	doc.Find(".experience, [class*='experience']").First().Each(func(i int, s *goquery.Selection) {
		vacancy.ExperienceLevel = strings.TrimSpace(s.Text())
	})
	
	// Извлекаем логотип компании
	doc.Find(".company-logo img, [class*='logo'] img").First().Each(func(i int, s *goquery.Selection) {
		if src, exists := s.Attr("src"); exists {
			vacancy.CompanyLogo = src
		}
	})
	
	// Извлекаем URL компании
	doc.Find(".company-url a, [class*='company'] a").First().Each(func(i int, s *goquery.Selection) {
		if href, exists := s.Attr("href"); exists {
			vacancy.CompanyURL = href
		}
	})
	
	return vacancy, nil
}

// ParseAllSources парсит все источники
func (p *GeekjobParser) ParseAllSources(query string, pages int) ([]models.Vacancy, error) {
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
