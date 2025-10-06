# Job Filter MVP - Микросервисная архитектура

## 🏗️ Обзор архитектуры

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Gateway   │ │   Admin     │ │   Parser    │ │  Database   │
│  (Next.js)  │ │  Service    │ │  Service    │ │  Service     │
│             │ │  (Node.js)  │ │    (Go)     │ │   (Java)     │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
       │               │               │               │
       └───────────────┼───────────────┼───────────────┘
                       │               │
                ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
                │   AI        │ │   Queue     │ │   Search    │
                │  Service    │ │  Service    │ │  Service    │
                │ (Python)    │ │   (Java)    │ │   (Java)    │
                └─────────────┘ └─────────────┘ └─────────────┘
```

## 🚀 Сервисы

### 1. Gateway Service (Next.js)
**Порт:** 3000  
**Роль:** Единая точка входа, API Gateway  
**Функции:**
- Проксирование запросов к микросервисам
- Аутентификация и авторизация
- Rate limiting
- Мониторинг

### 2. Admin Service (Node.js)
**Порт:** 3001  
**Роль:** Управление вакансиями и модерация  
**Функции:**
- CRUD операции с вакансиями
- Модерация контента
- Статистика и аналитика
- Админ панель

### 3. Parser Service (Go)
**Порт:** 8080  
**Роль:** Парсинг вакансий с внешних источников  
**Функции:**
- Парсинг Habr, HH.ru, Geekjob, GetMatch
- Высокая производительность
- Параллельная обработка
- Кэширование результатов

### 4. Database Service (Java)
**Порт:** 8081  
**Роль:** Работа с базой данных  
**Функции:**
- JPA/Hibernate ORM
- Транзакции
- Connection pooling
- Кэширование

### 5. Queue Service (Java)
**Порт:** 8082  
**Роль:** Обработка очередей задач  
**Функции:**
- RabbitMQ интеграция
- Асинхронные задачи
- Retry механизмы
- Мониторинг очередей

### 6. Search Service (Java)
**Порт:** 8083  
**Роль:** Полнотекстовый поиск  
**Функции:**
- Elasticsearch интеграция
- Сложные поисковые запросы
- Аналитика
- Автодополнение

### 7. AI Service (Python)
**Порт:** 5000  
**Роль:** Обработка текста и AI анализ  
**Функции:**
- OpenAI интеграция
- Анализ релевантности
- Очистка текста
- Форматирование

## 🗄️ Базы данных

### PostgreSQL
- Основная база данных
- Хранение вакансий
- Транзакции
- ACID свойства

### Redis
- Кэширование
- Сессии
- Временные данные

### Elasticsearch
- Полнотекстовый поиск
- Аналитика
- Индексация

### RabbitMQ
- Очереди сообщений
- Асинхронная обработка
- Retry механизмы

## 🔧 Технологический стек

| Сервис | Технология | Причина выбора |
|--------|------------|----------------|
| Gateway | Next.js | Быстрая разработка, SSR |
| Admin | Node.js | JSON API, быстрая разработка |
| Parser | Go | Высокая производительность |
| Database | Java | Надежность, JPA |
| Queue | Java | Spring AMQP, надежность |
| Search | Java | Elasticsearch клиент |
| AI | Python | ML библиотеки, OpenAI |

## 📊 Преимущества архитектуры

### 1. Масштабируемость
- Каждый сервис масштабируется независимо
- Горизонтальное масштабирование
- Load balancing

### 2. Надежность
- Изоляция отказов
- Circuit breaker pattern
- Retry механизмы

### 3. Производительность
- Параллельная обработка
- Кэширование
- Асинхронные операции

### 4. Разработка
- Независимые команды
- Разные технологии
- Быстрые релизы

## 🚀 Запуск

### Требования
- Docker
- Docker Compose
- 8GB RAM (рекомендуется)
- 4 CPU cores (рекомендуется)

### Быстрый старт
```bash
# Клонируем репозиторий
git clone <repository-url>
cd job-filter-mvp/microservices

# Копируем конфигурацию
cp env.example .env

# Редактируем .env файл
nano .env

# Запускаем сервисы
./start.sh  # Linux/Mac
# или
./start.ps1 # Windows PowerShell
```

### Проверка статуса
```bash
# Статус сервисов
docker-compose ps

# Логи сервиса
docker-compose logs -f [service-name]

# Остановка
docker-compose down
```

## 🔍 Мониторинг

### Health Checks
- Gateway: http://localhost:3000/api/health
- Admin: http://localhost:3001/api/health
- Parser: http://localhost:8080/api/health
- Database: http://localhost:8081/api/health
- Queue: http://localhost:8082/api/health
- Search: http://localhost:8083/api/health
- AI: http://localhost:5000/api/health

### Внешние сервисы
- RabbitMQ Management: http://localhost:15672
- Elasticsearch: http://localhost:9200

## 📈 Производительность

### Ожидаемые показатели
- **Парсинг:** 50 вакансий за 30-60 секунд
- **Память:** 2-4GB общее потребление
- **CPU:** 50-70% при активном парсинге
- **Сеть:** 100-200 запросов/минуту

### Оптимизация
- Кэширование часто используемых данных
- Параллельная обработка
- Connection pooling
- Индексы базы данных

## 🔒 Безопасность

### Аутентификация
- JWT токены
- Rate limiting
- CORS настройки

### Сетевая безопасность
- Изолированные сети
- Firewall правила
- SSL/TLS шифрование

## 🛠️ Разработка

### Структура проекта
```
microservices/
├── gateway/           # Next.js Gateway
├── admin-service/     # Node.js Admin
├── parser-service/    # Go Parser
├── database-service/  # Java Database
├── queue-service/     # Java Queue
├── search-service/    # Java Search
├── ai-service/        # Python AI
├── docker-compose.yml # Docker конфигурация
└── README.md          # Документация
```

### Добавление нового сервиса
1. Создать директорию сервиса
2. Добавить Dockerfile
3. Обновить docker-compose.yml
4. Добавить health check
5. Обновить документацию

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Next.js](https://nextjs.org/docs)
- [Spring Boot](https://spring.io/projects/spring-boot)
- [Go Documentation](https://golang.org/doc/)
- [Flask Documentation](https://flask.palletsprojects.com/)







