# Admin Service (Node.js)

Сервис управления вакансиями и модерации для Job Filter MVP.

## 🚀 Особенности

- **Управление вакансиями** - CRUD операции
- **Модерация контента** - одобрение/отклонение вакансий
- **Парсинг интеграция** - запуск парсинга через Parser Service
- **AI обработка** - интеграция с AI Service
- **Веб интерфейс** - HTML админка для управления
- **Статистика** - аналитика по вакансиям

## 🏗️ Архитектура

```
Admin Service
├── server.js          # Express сервер
├── public/            # Статические файлы
│   └── index.html     # HTML админка
├── package.json       # Зависимости
└── Dockerfile        # Docker конфигурация
```

## 🔧 API Endpoints

### Вакансии
```http
GET /api/vacancies              # Список вакансий
GET /api/pending               # Вакансии для модерации
GET /api/vacancies/:id         # Конкретная вакансия
PUT /api/vacancies/:id         # Обновление вакансии
DELETE /api/vacancies/:id      # Удаление вакансии
POST /api/moderate/:id         # Модерация вакансии
```

### Парсинг
```http
POST /api/parse                # Парсинг всех источников
POST /api/parse/geekjob        # Парсинг Geekjob
POST /api/parse/hh             # Парсинг HH.ru
POST /api/parse/habr           # Парсинг Habr
```

### AI Обработка
```http
POST /api/ai/analyze           # Анализ релевантности
POST /api/ai/clean             # Очистка текста
POST /api/ai/format            # Форматирование текста
POST /api/normalize            # Нормализация вакансии
```

### Статистика
```http
GET /api/stats                 # Статистика системы
GET /api/health               # Health check
```

## 🚀 Запуск

### Локальная разработка
```bash
# Установка зависимостей
npm install

# Запуск сервера
npm start

# Или в режиме разработки
npm run dev
```

### Docker
```bash
# Сборка образа
docker build -t job-filter-admin-service .

# Запуск контейнера
docker run -p 3001:3001 job-filter-admin-service
```

## 🌐 Веб интерфейс

После запуска сервиса админка доступна по адресу:
```
http://localhost:3001
```

### Функции админки:
- **📋 Вакансии** - просмотр и модерация вакансий
- **⚡ Парсинг** - запуск парсинга с настройками
- **🤖 AI Обработка** - анализ и обработка текста
- **📊 Статистика** - аналитика по вакансиям

## 🔧 Конфигурация

### Переменные окружения
```bash
PORT=3001                                    # Порт сервера
DATABASE_SERVICE_URL=http://localhost:8081  # URL Database Service
PARSER_SERVICE_URL=http://localhost:8080    # URL Parser Service
AI_SERVICE_URL=http://localhost:5000        # URL AI Service
```

### Зависимости
- **express** - веб сервер
- **axios** - HTTP клиент
- **cors** - CORS поддержка
- **helmet** - безопасность
- **morgan** - логирование

## 📊 Интеграция с другими сервисами

### Database Service
- Получение списка вакансий
- Обновление статуса вакансий
- Статистика по вакансиям

### Parser Service
- Запуск парсинга источников
- Мониторинг процесса парсинга
- Получение результатов

### AI Service
- Анализ релевантности текста
- Очистка от HTML/JS кода
- Форматирование описаний

## 🧪 Тестирование

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Тестирование парсинга
```bash
curl -X POST http://localhost:3001/api/parse \
  -H "Content-Type: application/json" \
  -d '{"sources": ["geekjob"], "pages": 1, "query": "дизайнер"}'
```

### Тестирование AI
```bash
curl -X POST http://localhost:3001/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Ищем UI/UX дизайнера для разработки мобильного приложения"}'
```

## 📈 Производительность

### Ожидаемые показатели
- **Память:** 50-100MB
- **CPU:** 10-20% при активном использовании
- **Сеть:** 50-100 запросов/минуту
- **Время отклика:** < 100ms

### Оптимизации
- Кэширование часто используемых данных
- Пакетная обработка запросов
- Асинхронная обработка AI запросов

## 🔍 Мониторинг

### Логи
- Структурированные логи запросов
- Уровни: INFO, WARN, ERROR
- Контекстная информация

### Метрики
- Количество обработанных вакансий
- Время выполнения запросов
- Ошибки интеграции с другими сервисами

## 🚀 Развертывание

### Docker Compose
```yaml
admin-service:
  build: ./admin-service
  ports:
    - "3001:3001"
  environment:
    - DATABASE_SERVICE_URL=http://database-service:8081
    - PARSER_SERVICE_URL=http://parser-service:8080
    - AI_SERVICE_URL=http://ai-service:5000
  depends_on:
    - database-service
    - parser-service
    - ai-service
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: admin-service
  template:
    metadata:
      labels:
        app: admin-service
    spec:
      containers:
      - name: admin-service
        image: job-filter-admin-service:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_SERVICE_URL
          value: "http://database-service:8081"
```

## 🔧 Отладка

### Логи
```bash
# Docker логи
docker logs admin-service

# Локальные логи
# Выводятся в консоль при запуске
```

### Проверка интеграции
```bash
# Проверка Database Service
curl http://localhost:8081/api/health

# Проверка Parser Service
curl http://localhost:8080/api/health

# Проверка AI Service
curl http://localhost:5000/api/health
```

## 📚 Дополнительные ресурсы

- [Express Documentation](https://expressjs.com/)
- [Axios Documentation](https://axios-http.com/)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Docker Documentation](https://docs.docker.com/)







