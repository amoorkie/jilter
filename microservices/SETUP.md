# Установка и настройка микросервисов

## 🚀 Быстрый старт

### 1. Установка зависимостей

#### Go (для Parser Service)
```bash
# Скачать Go с официального сайта
# https://golang.org/dl/

# Или через Chocolatey (Windows)
choco install golang

# Или через Scoop (Windows)
scoop install go

# Проверка установки
go version
```

#### Java (для Database, Queue, Search Services)
```bash
# Скачать JDK 17 с официального сайта
# https://adoptium.net/

# Или через Chocolatey (Windows)
choco install openjdk17

# Проверка установки
java -version
```

#### Node.js (для Admin Service)
```bash
# Скачать Node.js с официального сайта
# https://nodejs.org/

# Или через Chocolatey (Windows)
choco install nodejs

# Проверка установки
node --version
npm --version
```

#### Python (для AI Service)
```bash
# Скачать Python с официального сайта
# https://python.org/

# Или через Chocolatey (Windows)
choco install python

# Проверка установки
python --version
pip --version
```

### 2. Установка Docker

#### Windows
```bash
# Скачать Docker Desktop
# https://www.docker.com/products/docker-desktop/

# Или через Chocolatey
choco install docker-desktop
```

#### Проверка установки
```bash
docker --version
docker-compose --version
```

## 🔧 Настройка проекта

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd job-filter-mvp/microservices
```

### 2. Настройка переменных окружения
```bash
# Копируем конфигурацию
cp env.example .env

# Редактируем .env файл
nano .env  # или любой другой редактор
```

### 3. Запуск сервисов

#### Вариант 1: Docker Compose (рекомендуется)
```bash
# Запуск всех сервисов
docker-compose up --build -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f [service-name]
```

#### Вариант 2: Локальная разработка
```bash
# Запуск каждого сервиса отдельно
cd gateway && npm install && npm run dev
cd admin-service && npm install && npm start
cd parser-service && go mod tidy && go run main.go
cd database-service && mvn spring-boot:run
cd ai-service && pip install -r requirements.txt && python app.py
```

## 🧪 Тестирование

### 1. Проверка health checks
```bash
# Gateway
curl http://localhost:3000/api/health

# Admin Service
curl http://localhost:3001/api/health

# Parser Service
curl http://localhost:8080/api/health

# Database Service
curl http://localhost:8081/api/health

# AI Service
curl http://localhost:5000/api/health
```

### 2. Тестирование парсинга
```bash
# Парсинг Geekjob
curl -X POST http://localhost:8080/api/parse/geekjob \
  -H "Content-Type: application/json" \
  -d '{"query": "дизайнер", "pages": 1}'

# Парсинг HH.ru
curl -X POST http://localhost:8080/api/parse/hh \
  -H "Content-Type: application/json" \
  -d '{"query": "дизайнер", "pages": 1}'

# Парсинг Habr
curl -X POST http://localhost:8080/api/parse/habr \
  -H "Content-Type: application/json" \
  -d '{"query": "дизайнер", "pages": 1}'
```

### 3. Тестирование AI
```bash
# Анализ релевантности
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Ищем UI/UX дизайнера для разработки мобильного приложения"}'

# Очистка текста
curl -X POST http://localhost:5000/api/clean \
  -H "Content-Type: application/json" \
  -d '{"text": "<p>Описание вакансии</p><script>alert(\"test\")</script>"}'
```

## 🔍 Отладка

### 1. Логи сервисов
```bash
# Docker Compose
docker-compose logs -f [service-name]

# Локальная разработка
# Логи выводятся в консоль каждого сервиса
```

### 2. Проверка портов
```bash
# Windows
netstat -an | findstr :3000
netstat -an | findstr :8080

# Linux/Mac
netstat -tulpn | grep :3000
netstat -tulpn | grep :8080
```

### 3. Проверка зависимостей
```bash
# Go модули
cd parser-service && go mod tidy

# Node.js пакеты
cd gateway && npm install
cd admin-service && npm install

# Python пакеты
cd ai-service && pip install -r requirements.txt

# Java зависимости
cd database-service && mvn clean install
```

## 🚀 Производительность

### 1. Мониторинг ресурсов
```bash
# Docker статистика
docker stats

# Системные ресурсы
# Windows: Task Manager
# Linux: htop, top
# Mac: Activity Monitor
```

### 2. Оптимизация
```bash
# Увеличение лимитов Docker
# В docker-compose.yml добавить:
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '1.0'
      memory: 1G
```

## 🔧 Устранение проблем

### 1. Порт уже используется
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [PID] /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### 2. Ошибки Docker
```bash
# Очистка Docker
docker system prune -a

# Пересборка образов
docker-compose build --no-cache
```

### 3. Ошибки зависимостей
```bash
# Go
go clean -modcache
go mod download

# Node.js
rm -rf node_modules package-lock.json
npm install

# Python
pip cache purge
pip install -r requirements.txt --force-reinstall
```

## 📚 Дополнительные ресурсы

- [Go Documentation](https://golang.org/doc/)
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Node.js Documentation](https://nodejs.org/docs/)
- [Python Documentation](https://docs.python.org/)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)







