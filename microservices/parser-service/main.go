package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
	"job-filter-parser-service/models"
	"job-filter-parser-service/parsers"
)

// ParserService основной сервис парсинга
type ParserService struct {
	geekjobParser *parsers.GeekjobSeleniumParser
	hhParser      *parsers.HHParser
	habrParser    *parsers.HabrParser
	getmatchParser *parsers.GetMatchParser
	hirehiParser  *parsers.HireHiParser
}

func main() {
	// Загружаем переменные окружения
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Настраиваем логирование
	logrus.SetLevel(logrus.InfoLevel)
	logrus.SetFormatter(&logrus.JSONFormatter{})

	// Создаем сервис парсинга
	databaseService := os.Getenv("DATABASE_SERVICE_URL")
	if databaseService == "" {
		databaseService = "http://localhost:8081"
	}

	timeout := 30 * time.Second
	delay := 1 * time.Second

	parserService := &ParserService{
		geekjobParser: parsers.NewGeekjobSeleniumParser(databaseService, timeout, delay),
		hhParser:      parsers.NewHHParser(databaseService, timeout, delay),
		habrParser:    parsers.NewHabrParser(databaseService, timeout, delay),
		getmatchParser: parsers.NewGetMatchParser(databaseService, timeout, delay),
		hirehiParser:  parsers.NewHireHiParser(databaseService, timeout, delay),
	}

	// Создаем Gin роутер
	r := gin.Default()

	// Middleware
	r.Use(gin.Logger())
	r.Use(gin.Recovery())
	r.Use(corsMiddleware())

	// Health check
	r.GET("/api/health", healthCheck)

	// Parser endpoints
	r.POST("/api/parse", parserService.parseVacancies)
	r.GET("/api/parse/status/:id", getParseStatus)
	r.POST("/api/parse/habr", parserService.parseHabr)
	r.POST("/api/parse/hh", parserService.parseHH)
	r.POST("/api/parse/geekjob", parserService.parseGeekjob)
	r.POST("/api/parse/getmatch", parserService.parseGetMatch)
	r.POST("/api/parse/hirehi", parserService.parseHireHi)

	// Запускаем сервер
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	logrus.Infof("🚀 Parser Service starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		logrus.Fatal("Failed to start server:", err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "OK",
		"service":    "Parser Service",
		"timestamp": gin.H{},
		"uptime":    gin.H{},
	})
}

func (ps *ParserService) parseVacancies(c *gin.Context) {
	var request models.VacancyRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Устанавливаем значения по умолчанию
	if request.Pages == 0 {
		request.Pages = 2
	}
	if request.Query == "" {
		request.Query = "дизайнер"
	}
	if len(request.Sources) == 0 {
		request.Sources = []string{"geekjob", "hh", "habr", "getmatch", "hirehi"}
	}

	var allVacancies []models.Vacancy
	var errors []string

	// Парсим каждый источник
	for _, source := range request.Sources {
		var vacancies []models.Vacancy
		var err error

		switch source {
		case "geekjob":
			vacancies, err = ps.geekjobParser.ParseAllSources(request.Query, request.Pages)
		case "hh":
			vacancies, err = ps.hhParser.ParseAllSources(request.Query, request.Pages)
		case "habr":
			vacancies, err = ps.habrParser.ParseAllSources(request.Query, request.Pages)
		case "getmatch":
			vacancies, err = ps.getmatchParser.ParseAllSources(request.Query, request.Pages)
		case "hirehi":
			vacancies, err = ps.hirehiParser.ParseAllSources(request.Query, request.Pages)
		default:
			errors = append(errors, "Unknown source: "+source)
			continue
		}

		if err != nil {
			errors = append(errors, "Error parsing "+source+": "+err.Error())
			continue
		}

		allVacancies = append(allVacancies, vacancies...)
	}

	// Сохраняем вакансии в базу данных
	savedCount := 0
	for _, vacancy := range allVacancies {
		if err := ps.saveVacancy(vacancy); err != nil {
			errors = append(errors, "Error saving vacancy: "+err.Error())
		} else {
			savedCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Parsing completed",
		"total_found": len(allVacancies),
		"saved":       savedCount,
		"errors":      errors,
		"sources":     request.Sources,
		"pages":       request.Pages,
		"query":       request.Query,
	})
}

func getParseStatus(c *gin.Context) {
	jobID := c.Param("id")
	
	// Здесь будет проверка статуса парсинга
	c.JSON(http.StatusOK, gin.H{
		"job_id":  jobID,
		"status":  "completed",
		"results": gin.H{},
	})
}

func (ps *ParserService) parseHabr(c *gin.Context) {
	var request struct {
		Query string `json:"query"`
		Pages int    `json:"pages"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if request.Query == "" {
		request.Query = "дизайнер"
	}
	if request.Pages == 0 {
		request.Pages = 2
	}

	vacancies, err := ps.habrParser.ParseAllSources(request.Query, request.Pages)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Сохраняем вакансии
	savedCount := 0
	for _, vacancy := range vacancies {
		if err := ps.saveVacancy(vacancy); err != nil {
			continue
		}
		savedCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Habr parsing completed",
		"source":      "habr",
		"total_found": len(vacancies),
		"saved":       savedCount,
		"query":       request.Query,
		"pages":       request.Pages,
	})
}

func (ps *ParserService) parseHH(c *gin.Context) {
	var request struct {
		Query string `json:"query"`
		Pages int    `json:"pages"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if request.Query == "" {
		request.Query = "дизайнер"
	}
	if request.Pages == 0 {
		request.Pages = 2
	}

	vacancies, err := ps.hhParser.ParseAllSources(request.Query, request.Pages)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Сохраняем вакансии
	savedCount := 0
	for _, vacancy := range vacancies {
		if err := ps.saveVacancy(vacancy); err != nil {
			continue
		}
		savedCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "HH.ru parsing completed",
		"source":      "hh",
		"total_found": len(vacancies),
		"saved":       savedCount,
		"query":       request.Query,
		"pages":       request.Pages,
	})
}

func (ps *ParserService) parseGeekjob(c *gin.Context) {
	var request struct {
		Query string `json:"query"`
		Pages int    `json:"pages"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if request.Query == "" {
		request.Query = "дизайнер"
	}
	if request.Pages == 0 {
		request.Pages = 2
	}

	vacancies, err := ps.geekjobParser.ParseAllSources(request.Query, request.Pages)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Сохраняем вакансии
	savedCount := 0
	for _, vacancy := range vacancies {
		if err := ps.saveVacancy(vacancy); err != nil {
			continue
		}
		savedCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Geekjob parsing completed",
		"source":      "geekjob",
		"total_found": len(vacancies),
		"saved":       savedCount,
		"query":       request.Query,
		"pages":       request.Pages,
	})
}

func (ps *ParserService) parseGetMatch(c *gin.Context) {
	var request struct {
		Query string `json:"query"`
		Pages int    `json:"pages"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if request.Query == "" {
		request.Query = "дизайнер"
	}
	if request.Pages == 0 {
		request.Pages = 2
	}

	vacancies, err := ps.getmatchParser.ParseAllSources(request.Query, request.Pages)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Сохраняем вакансии
	savedCount := 0
	for _, vacancy := range vacancies {
		if err := ps.saveVacancy(vacancy); err != nil {
			continue
		}
		savedCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "GetMatch parsing completed",
		"source":      "getmatch",
		"total_found": len(vacancies),
		"saved":       savedCount,
		"query":       request.Query,
		"pages":       request.Pages,
	})
}

func (ps *ParserService) parseHireHi(c *gin.Context) {
	var request struct {
		Query string `json:"query"`
		Pages int    `json:"pages"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if request.Query == "" {
		request.Query = "дизайнер"
	}
	if request.Pages == 0 {
		request.Pages = 2
	}

	vacancies, err := ps.hirehiParser.ParseAllSources(request.Query, request.Pages)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Сохраняем вакансии
	savedCount := 0
	for _, vacancy := range vacancies {
		if err := ps.saveVacancy(vacancy); err != nil {
			continue
		}
		savedCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "HireHi parsing completed",
		"source":      "hirehi",
		"total_found": len(vacancies),
		"saved":       savedCount,
		"query":       request.Query,
		"pages":       request.Pages,
	})
}

// saveVacancy сохраняет вакансию в базу данных через Database Service
func (ps *ParserService) saveVacancy(vacancy models.Vacancy) error {
	// Здесь будет HTTP запрос к Database Service
	// Пока возвращаем nil для тестирования
	return nil
}
