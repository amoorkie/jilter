package models

import "time"

// Vacancy представляет вакансию
type Vacancy struct {
	ID               int64     `json:"id"`
	ExternalID       string    `json:"external_id"`
	Source           string    `json:"source"`
	URL              string    `json:"url"`
	Title            string    `json:"title"`
	Company          string    `json:"company"`
	Salary           string    `json:"salary"`
	Location         string    `json:"location"`
	Description      string    `json:"description"`
	FullDescription  string    `json:"full_description"`
	Requirements     string    `json:"requirements"`
	Tasks            string    `json:"tasks"`
	Benefits         string    `json:"benefits"`
	Conditions       string    `json:"conditions"`
	EmploymentType   string    `json:"employment_type"`
	ExperienceLevel  string    `json:"experience_level"`
	RemoteType       string    `json:"remote_type"`
	CompanyLogo      string    `json:"company_logo"`
	CompanyURL       string    `json:"company_url"`
	PublishedAt      *time.Time `json:"published_at"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
	Status           string    `json:"status"`
	NeedsFormatting  bool      `json:"needs_formatting"`
}

// VacancyRequest представляет запрос на парсинг
type VacancyRequest struct {
	Sources []string `json:"sources"`
	Pages   int      `json:"pages"`
	Query   string   `json:"query"`
}

// VacancyResponse представляет ответ с вакансиями
type VacancyResponse struct {
	Vacancies []Vacancy `json:"vacancies"`
	Total     int       `json:"total"`
	Page      int       `json:"page"`
	Limit     int       `json:"limit"`
}

// ParseStatus представляет статус парсинга
type ParseStatus struct {
	JobID     string `json:"job_id"`
	Status    string `json:"status"`
	Progress  int    `json:"progress"`
	Total     int    `json:"total"`
	Processed int    `json:"processed"`
	Errors    int    `json:"errors"`
}







