# Job Filter MVP - Микросервисная архитектура

## 🏗️ Архитектура

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Gateway   │ │   Admin     │ │   Parser    │ │  Database   │
│  (Next.js)  │ │  Service    │ │  Service    │ │  Service    │
│             │ │  (Node.js)  │ │    (Go)     │ │   (Java)    │
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
- Единая точка входа
- API Gateway
- Проксирование запросов

### 2. Admin Service (Node.js)
- Управление вакансиями
- Модерация
- Админ панель

### 3. Parser Service (Go)
- Парсинг вакансий
- Высокая производительность
- Параллельная обработка

### 4. Database Service (Java)
- Работа с PostgreSQL
- JPA/Hibernate
- Транзакции

### 5. Queue Service (Java)
- Обработка очередей
- RabbitMQ
- Асинхронные задачи

### 6. Search Service (Java)
- Полнотекстовый поиск
- Elasticsearch
- Аналитика

### 7. AI Service (Python)
- Обработка текста
- OpenAI интеграция
- ML модели

## 🐳 Запуск

```bash
# Запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps

# Логи
docker-compose logs -f [service-name]
```

## 📊 Порты

- Gateway: 3000
- Admin: 3001
- Parser: 8080
- Database: 8081
- Queue: 8082
- Search: 8083
- AI: 5000
- PostgreSQL: 5432
- RabbitMQ: 5672
- Elasticsearch: 9200







