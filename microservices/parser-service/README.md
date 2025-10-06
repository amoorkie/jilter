# Parser Service (Go)

Высокопроизводительный сервис парсинга вакансий на Go для Job Filter MVP.

## 🚀 Особенности

- **Высокая производительность** - Go обеспечивает быстрый парсинг
- **Параллельная обработка** - одновременный парсинг нескольких источников
- **Умная фильтрация** - исключение нерелевантных вакансий
- **Надежность** - обработка ошибок и retry механизмы
- **Масштабируемость** - легко масштабируется горизонтально

## 📊 Поддерживаемые источники

### 1. Geekjob.ru
- Парсинг списка вакансий
- Извлечение детальной информации
- Фильтрация по релевантности

### 2. HH.ru
- Поиск по ключевым словам
- Парсинг карточек вакансий
- Извлечение метаданных

### 3. Habr Career
- Парсинг IT вакансий
- Фильтрация по специальности
- Извлечение требований

## 🏗️ Архитектура

```
Parser Service
├── models/          # Модели данных
├── parsers/         # Парсеры для каждого источника
│   ├── geekjob.go   # Парсер Geekjob.ru
│   ├── hh.go        # Парсер HH.ru
│   └── habr.go      # Парсер Habr Career
├── main.go          # Основной сервер
└── go.mod           # Зависимости
```

## 🔧 API Endpoints

### Health Check
```http
GET /api/health
```

### Парсинг всех источников
```http
POST /api/parse
Content-Type: application/json

{
  "sources": ["geekjob", "hh", "habr"],
  "pages": 2,
  "query": "дизайнер"
}
```

### Парсинг конкретного источника
```http
POST /api/parse/geekjob
POST /api/parse/hh
POST /api/parse/habr

Content-Type: application/json

{
  "query": "дизайнер",
  "pages": 2
}
```

### Статус парсинга
```http
GET /api/parse/status/{job_id}
```

## 🚀 Запуск

### Локальная разработка
```bash
# Установка зависимостей
go mod tidy

# Запуск сервера
go run main.go

# Или сборка и запуск
go build -o parser-service .
./parser-service
```

### Docker
```bash
# Сборка образа
docker build -t job-filter-parser-service .

# Запуск контейнера
docker run -p 8080:8080 job-filter-parser-service
```

## 📊 Производительность

### Ожидаемые показатели
- **Парсинг:** 50 вакансий за 30-60 секунд
- **Память:** 50-100MB
- **CPU:** 20-30% при активном парсинге
- **Сеть:** 50-100 запросов/минуту

### Оптимизации
- Параллельная обработка источников
- Кэширование HTTP соединений
- Умная фильтрация на этапе парсинга
- Batch сохранение в базу данных

## 🔍 Фильтрация вакансий

### Ключевые слова дизайна
- дизайн, design, ui, ux
- веб-дизайн, web design
- графический дизайн, graphic design
- интерфейс, interface
- пользовательский опыт, user experience
- figma, sketch, adobe, photoshop

### Исключающие ключевые слова
- мебель, текстиль, одежда, мода
- ювелирный, украшения, бижутерия
- интерьер, декор, ландшафт
- промышленный, машиностроение
- архитектурный, строительный

## 🧪 Тестирование

### Запуск тестов
```bash
# Все тесты
go test ./...

# Конкретный пакет
go test ./parsers

# С покрытием
go test -cover ./...
```

### Тестирование API
```bash
# Health check
curl http://localhost:8080/api/health

# Парсинг Geekjob
curl -X POST http://localhost:8080/api/parse/geekjob \
  -H "Content-Type: application/json" \
  -d '{"query": "дизайнер", "pages": 1}'
```

## 📈 Мониторинг

### Логи
- Структурированные JSON логи
- Уровни: DEBUG, INFO, WARN, ERROR
- Контекстная информация

### Метрики
- Количество обработанных вакансий
- Время выполнения запросов
- Ошибки парсинга
- Статус источников

## 🔧 Конфигурация

### Переменные окружения
```bash
PORT=8080                           # Порт сервера
DATABASE_SERVICE_URL=http://localhost:8081  # URL Database Service
TIMEOUT=30s                         # Таймаут HTTP запросов
DELAY=1s                            # Задержка между запросами
```

### Настройка парсеров
```go
// Таймаут для HTTP запросов
timeout := 30 * time.Second

// Задержка между запросами
delay := 1 * time.Second

// Создание парсера
parser := NewGeekjobParser(databaseService, timeout, delay)
```

## 🚀 Развертывание

### Docker Compose
```yaml
parser-service:
  build: ./parser-service
  ports:
    - "8080:8080"
  environment:
    - DATABASE_SERVICE_URL=http://database-service:8081
  depends_on:
    - database-service
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: parser-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: parser-service
  template:
    metadata:
      labels:
        app: parser-service
    spec:
      containers:
      - name: parser-service
        image: job-filter-parser-service:latest
        ports:
        - containerPort: 8080
```

## 🔍 Отладка

### Логи
```bash
# Просмотр логов
docker logs parser-service

# Следить за логами
docker logs -f parser-service
```

### Профилирование
```bash
# CPU профиль
go tool pprof http://localhost:8080/debug/pprof/profile

# Память профиль
go tool pprof http://localhost:8080/debug/pprof/heap
```

## 📚 Дополнительные ресурсы

- [Go Documentation](https://golang.org/doc/)
- [Gin Framework](https://gin-gonic.com/)
- [Goquery Library](https://github.com/PuerkitoBio/goquery)
- [Logrus Logging](https://github.com/sirupsen/logrus)







