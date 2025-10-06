# AI Service (Python)

Сервис обработки текста и AI анализа для Job Filter MVP.

## 🚀 Особенности

- **Анализ релевантности** - проверка вакансий на соответствие дизайнерским специальностям
- **Очистка текста** - удаление HTML, JS, JSON и технических артефактов
- **Форматирование** - структурирование текста вакансий
- **Умная фильтрация** - исключение нерелевантных вакансий
- **OpenAI интеграция** - готовность к подключению GPT API

## 🏗️ Архитектура

```
AI Service
├── app.py              # Flask приложение
├── requirements.txt    # Python зависимости
├── Dockerfile         # Docker конфигурация
└── README.md          # Документация
```

## 🔧 API Endpoints

### Health Check
```http
GET /api/health
```

### Анализ релевантности
```http
POST /api/analyze
Content-Type: application/json

{
  "text": "Ищем UI/UX дизайнера для разработки мобильного приложения"
}
```

### Очистка текста
```http
POST /api/clean
Content-Type: application/json

{
  "text": "<p>Описание вакансии</p><script>alert('test')</script>"
}
```

### Форматирование текста
```http
POST /api/format
Content-Type: application/json

{
  "text": "Полный текст вакансии с требованиями и условиями"
}
```

## 🚀 Запуск

### Локальная разработка
```bash
# Установка зависимостей
pip install -r requirements.txt

# Запуск сервера
python app.py

# Или через gunicorn
gunicorn --bind 0.0.0.0:5000 app:app
```

### Docker
```bash
# Сборка образа
docker build -t job-filter-ai-service .

# Запуск контейнера
docker run -p 5000:5000 job-filter-ai-service
```

## 🔧 Конфигурация

### Переменные окружения
```bash
PORT=5000                                    # Порт сервера
OPENAI_API_KEY=your_openai_api_key_here     # OpenAI API ключ (опционально)
DATABASE_SERVICE_URL=http://localhost:8081  # URL Database Service
```

### Зависимости
- **flask** - веб фреймворк
- **flask-cors** - CORS поддержка
- **requests** - HTTP клиент
- **openai** - OpenAI API (опционально)
- **gunicorn** - WSGI сервер

## 🧠 AI Функции

### Анализ релевантности
Проверяет, подходит ли вакансия для дизайнеров:

**Ключевые слова дизайна:**
- дизайн, design, ui, ux
- веб-дизайн, web design
- графический дизайн, graphic design
- интерфейс, interface
- пользовательский опыт, user experience
- figma, sketch, adobe, photoshop

**Исключающие ключевые слова:**
- мебель, текстиль, одежда, мода
- ювелирный, украшения, бижутерия
- интерьер, декор, ландшафт
- промышленный, машиностроение
- архитектурный, строительный

### Очистка текста
Удаляет из текста:
- HTML теги и атрибуты
- JavaScript код
- CSS стили
- JSON объекты
- URL ссылки
- Email адреса
- Телефонные номера
- Технические ключевые слова

### Форматирование текста
Извлекает структурированную информацию:
- **Заголовок** - название вакансии
- **Компания** - название работодателя
- **Описание** - основное описание
- **Требования** - навыки и опыт
- **Задачи** - обязанности и функции
- **Условия** - льготы и бонусы

## 📊 Производительность

### Ожидаемые показатели
- **Память:** 100-200MB
- **CPU:** 20-30% при активной обработке
- **Время обработки:** 100-500ms на запрос
- **Пропускная способность:** 100-200 запросов/минуту

### Оптимизации
- Кэширование результатов анализа
- Пакетная обработка текстов
- Асинхронная обработка длинных текстов
- Оптимизация регулярных выражений

## 🧪 Тестирование

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Тестирование анализа
```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Ищем UI/UX дизайнера для разработки мобильного приложения"}'
```

### Тестирование очистки
```bash
curl -X POST http://localhost:5000/api/clean \
  -H "Content-Type: application/json" \
  -d '{"text": "<p>Описание</p><script>alert(\"test\")</script>"}'
```

### Тестирование форматирования
```bash
curl -X POST http://localhost:5000/api/format \
  -H "Content-Type: application/json" \
  -d '{"text": "UI/UX дизайнер\nКомпания: TechCorp\nТребования: Figma, Sketch\nЗадачи: Создание интерфейсов"}'
```

## 🔍 Мониторинг

### Логи
- Структурированные логи обработки
- Уровни: INFO, WARN, ERROR
- Контекстная информация о запросах

### Метрики
- Количество обработанных текстов
- Время обработки запросов
- Точность анализа релевантности
- Ошибки обработки

## 🚀 Развертывание

### Docker Compose
```yaml
ai-service:
  build: ./ai-service
  ports:
    - "5000:5000"
  environment:
    - OPENAI_API_KEY=${OPENAI_API_KEY}
    - DATABASE_SERVICE_URL=http://database-service:8081
  depends_on:
    - database-service
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-service
  template:
    metadata:
      labels:
        app: ai-service
    spec:
      containers:
      - name: ai-service
        image: job-filter-ai-service:latest
        ports:
        - containerPort: 5000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: api-key
```

## 🔧 Отладка

### Логи
```bash
# Docker логи
docker logs ai-service

# Локальные логи
# Выводятся в консоль при запуске
```

### Проверка производительности
```bash
# Профилирование памяти
python -m memory_profiler app.py

# Профилирование CPU
python -m cProfile app.py
```

## 📚 Дополнительные ресурсы

- [Flask Documentation](https://flask.palletsprojects.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Python Documentation](https://docs.python.org/)
- [Docker Documentation](https://docs.docker.com/)







