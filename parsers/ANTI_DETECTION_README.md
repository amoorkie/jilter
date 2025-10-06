# 🛡️ Система обхода блокировок для продакшена

Комплексная система для обхода блокировок при парсинге вакансий в продакшене.

## 🚀 Возможности

- **Ротация прокси-серверов** - автоматическое переключение между прокси
- **Ротация User-Agent** - имитация различных браузеров
- **Случайные задержки** - имитация человеческого поведения
- **Управление сессиями** - поддержание долгосрочных сессий
- **Обработка капчи** - интеграция с сервисами решения капчи
- **Browser automation** - использование Playwright для сложных случаев
- **Детекция блокировок** - автоматическое определение блокировок
- **Статистика и мониторинг** - отслеживание эффективности

## 📦 Установка

### 1. Установка зависимостей

```bash
pip install requests beautifulsoup4 playwright
playwright install chromium
```

### 2. Настройка прокси

#### Вариант 1: Переменные окружения
```bash
export PROXY_LIST="proxy1.example.com:8080,proxy2.example.com:3128:user:pass"
```

#### Вариант 2: Файл с прокси
Создайте файл `proxies.txt`:
```
# Формат: host:port:username:password (опционально)
192.168.1.100:8080
10.0.0.1:3128:user:pass
proxy1.example.com:8080
proxy2.example.com:3128:username:password
```

### 3. Настройка конфигурации

Создайте файл `anti_detection_config.json`:
```json
{
  "request_delays": {
    "min": 2.0,
    "max": 5.0,
    "jitter": 1.0
  },
  "proxy_rotation": {
    "enabled": true,
    "rotation_interval": 5,
    "health_check_interval": 60
  },
  "user_agent_rotation": {
    "enabled": true,
    "rotation_interval": 3
  },
  "session_management": {
    "enabled": true,
    "session_lifetime": 3600,
    "max_requests_per_session": 30
  },
  "captcha_handling": {
    "enabled": true,
    "max_attempts": 3,
    "cooldown_period": 600
  },
  "browser_automation": {
    "enabled": true,
    "headless": true,
    "timeout": 30000
  }
}
```

## 🔧 Использование

### Базовое использование

```python
from anti_detection_system import AntiDetectionSystem, RequestMethod
import asyncio

async def main():
    # Создание системы обхода блокировок
    anti_detection = AntiDetectionSystem()
    
    # Выполнение запроса
    success, content, info = await anti_detection.make_request(
        "https://example.com",
        method=RequestMethod.REQUESTS
    )
    
    if success:
        print(f"Успешно: {info['status_code']}")
    else:
        print("Запрос не удался")

asyncio.run(main())
```

### Интеграция с парсерами

```python
from habr_parser import HabrParser
import asyncio

async def main():
    # Создание парсера с системой обхода блокировок
    parser = HabrParser(use_anti_detection=True)
    
    # Парсинг вакансий
    vacancies = await parser.parse_vacancies(
        query='дизайнер',
        pages=3,
        extract_details=True
    )
    
    print(f"Найдено {len(vacancies)} вакансий")

asyncio.run(main())
```

## 🎯 Стратегии обхода блокировок

### 1. Ротация прокси
- Автоматическое переключение между прокси
- Проверка здоровья прокси
- Блокировка неработающих прокси

### 2. Имитация браузеров
- Ротация User-Agent
- Реалистичные заголовки
- Поддержка различных браузеров

### 3. Человеческое поведение
- Случайные задержки между запросами
- Поддержание сессий
- Реалистичные паттерны запросов

### 4. Browser automation
- Использование Playwright для сложных случаев
- Обработка JavaScript
- Имитация реального браузера

## 📊 Мониторинг и статистика

```python
# Получение статистики
stats = anti_detection.get_stats()
print(f"Успешность: {stats['success_rate']:.1f}%")
print(f"Заблокированных запросов: {stats['blocked_requests']}")
print(f"Ротаций прокси: {stats['proxy_rotations']}")
```

## 🚨 Обработка ошибок

### Детекция блокировок
- HTTP 403, 429, 503
- Содержимое с индикаторами блокировки
- Cloudflare защита
- Капча

### Автоматические действия
- Переключение прокси
- Ротация User-Agent
- Переключение на Playwright
- Увеличение задержек

## 🔒 Безопасность

### Рекомендации
- Используйте качественные прокси
- Не превышайте разумные лимиты запросов
- Соблюдайте robots.txt
- Уважайте Terms of Service

### Настройки безопасности
```json
{
  "request_delays": {
    "min": 3.0,
    "max": 7.0,
    "jitter": 2.0
  },
  "proxy_rotation": {
    "rotation_interval": 3
  }
}
```

## 🧪 Тестирование

```bash
# Запуск тестов
python test_anti_detection.py

# Тестирование с конкретными настройками
PROXY_LIST="proxy1:8080,proxy2:3128" python test_anti_detection.py
```

## 📈 Оптимизация для продакшена

### 1. Масштабирование
- Использование пула прокси
- Распределение нагрузки
- Мониторинг производительности

### 2. Надежность
- Резервные прокси
- Автоматическое восстановление
- Логирование ошибок

### 3. Стоимость
- Оптимизация использования прокси
- Кэширование результатов
- Батчинг запросов

## 🆘 Устранение неполадок

### Частые проблемы

1. **Все прокси заблокированы**
   - Проверьте качество прокси
   - Увеличьте задержки
   - Используйте резидентные прокси

2. **Высокий процент блокировок**
   - Уменьшите частоту запросов
   - Улучшите ротацию User-Agent
   - Используйте более качественные прокси

3. **Медленная работа**
   - Оптимизируйте настройки задержек
   - Используйте быстрые прокси
   - Включите кэширование

### Логи и отладка

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Включение детального логирования
anti_detection = AntiDetectionSystem()
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи
2. Убедитесь в правильности настройки прокси
3. Проверьте конфигурацию
4. Обратитесь к документации

## 🔄 Обновления

Система регулярно обновляется для поддержки новых методов обхода блокировок. Следите за обновлениями и обновляйте зависимости.








