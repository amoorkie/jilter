# Python Парсеры для Job Filter MVP

## Обзор

Все парсеры переписаны на Python для улучшения стабильности, производительности и надёжности. Python парсеры показывают значительно лучшие результаты по сравнению с Node.js версиями.

## Структура проекта

```
├── parsers/                    # Папка с парсерами
│   ├── hh_parser.py           # HH.ru парсер
│   ├── hirehi_parser.py       # HireHi парсер  
│   ├── habr_parser.py         # Habr Career парсер
│   ├── getmatch_parser.py     # GetMatch парсер
│   ├── geekjob_simple.py      # Geekjob парсер
│   └── unified_parser.py      # Единый парсер для всех источников
├── run_all_parsers.py         # Скрипт запуска всех парсеров
├── schedule_parser.py         # Планировщик автоматического парсинга
├── requirements.txt           # Python зависимости
└── database.db               # SQLite база данных
```

## Установка и настройка

### 1. Установка Python зависимостей

```bash
pip install -r requirements.txt
```

### 2. Проверка работы парсеров

```bash
# Тест одного источника
cd parsers
python unified_parser.py --sources geekjob --pages 1

# Тест нескольких источников
python unified_parser.py --sources hh habr --pages 2

# Полный тест всех источников
python unified_parser.py --pages 3
```

### 3. Запуск через Next.js API

Парсеры интегрированы с Next.js через API endpoint:

```bash
# POST запрос к /api/python-parse
curl -X POST http://localhost:3000/api/python-parse \
  -H "Content-Type: application/json" \
  -d '{
    "query": "дизайнер",
    "pages": 3,
    "sources": ["hh", "habr", "geekjob"],
    "verbose": true
  }'
```

## Использование

### Ручной запуск

```bash
# Запуск всех парсеров
python run_all_parsers.py

# С параметрами
python run_all_parsers.py --query "UI дизайнер" --pages 5 --sources hh habr

# Подробный вывод
python run_all_parsers.py --verbose
```

### Автоматический запуск

```bash
# Запуск планировщика (каждые 4 часа)
python schedule_parser.py
```

### Через админ-панель Next.js

1. Откройте http://localhost:3000/admin
2. Используйте секцию "🐍 Python Парсеры"
3. Настройте параметры и запустите парсинг

## Парсеры

### HH.ru (hh_parser.py)
- ✅ Полное извлечение описаний
- ✅ Структурированные блоки (требования, задачи, условия, льготы)
- ✅ Релевантность по ключевым словам
- ✅ Обработка ошибок и таймаутов

### Habr Career (habr_parser.py)
- ✅ Специализированные селекторы для Habr
- ✅ Извлечение структурированных секций
- ✅ Обработка различных форматов описаний
- ✅ Фильтрация по дизайнерским специализациям

### Geekjob (geekjob_simple.py)
- ✅ Улучшенная обработка HTML структуры
- ✅ Группировка ссылок по ID вакансий
- ✅ Извлечение метаданных (зарплата, локация, дата)
- ✅ Совместимость с Windows (без emoji)

### GetMatch (getmatch_parser.py)
- ✅ Адаптивные селекторы
- ✅ Поиск информации в тексте элементов
- ✅ Обработка различных форматов карточек
- ✅ Извлечение зарплаты и локации

### HireHi (hirehi_parser.py)
- ✅ Гибкие селекторы для различных структур
- ✅ Обработка ссылок и карточек вакансий
- ✅ Извлечение компаний и описаний
- ✅ Дедупликация результатов

## Единый парсер (unified_parser.py)

Объединяет все парсеры в одном интерфейсе:

```bash
# Все источники параллельно
python parsers/unified_parser.py --pages 3

# Выборочные источники
python parsers/unified_parser.py --sources hh habr geekjob --pages 2

# Последовательный парсинг
python parsers/unified_parser.py --no-parallel

# Экспорт в JSON
python parsers/unified_parser.py --export json
```

## База данных

Все парсеры сохраняют данные в SQLite базу `database.db` со следующей структурой:

```sql
CREATE TABLE vacancies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT,
    salary TEXT,
    location TEXT,
    description TEXT,
    full_description TEXT,
    requirements TEXT,
    tasks TEXT,
    benefits TEXT,
    conditions TEXT,
    employment_type TEXT,
    experience_level TEXT,
    remote_type TEXT,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
);
```

## API интеграция

### Next.js API Route: `/api/python-parse`

**POST параметры:**
- `query` (string): Поисковый запрос (по умолчанию: "дизайнер")
- `pages` (number): Количество страниц на источник (по умолчанию: 3)
- `sources` (array): Массив источников ["hh", "hirehi", "habr", "getmatch", "geekjob"]
- `verbose` (boolean): Подробный вывод (по умолчанию: false)

**Ответ:**
```json
{
  "success": true,
  "message": "Python парсинг завершён успешно за 45.2 секунд",
  "stats": {
    "total_found": 67,
    "total_saved": 45,
    "by_source": {
      "hh": {"found": 25, "saved": 18},
      "habr": {"found": 20, "saved": 15},
      "geekjob": {"found": 22, "saved": 12}
    },
    "duration": 45.2
  }
}
```

## Мониторинг и логирование

### Логи
- `parsers/unified_parser.log` - Логи единого парсера
- `scheduler.log` - Логи планировщика
- Каждый парсер создаёт свой лог файл

### Статистика
```bash
# Проверка базы данных
python parsers/check_db.py

# Статистика через API
curl http://localhost:3000/api/admin/pending
```

## Преимущества Python парсеров

1. **Стабильность**: Лучшая обработка ошибок и исключений
2. **Производительность**: Более быстрый парсинг HTML
3. **Надёжность**: Меньше сбоев при парсинге сложных страниц
4. **Гибкость**: Легче добавлять новые источники
5. **Мониторинг**: Подробное логирование и статистика
6. **Масштабируемость**: Параллельный и последовательный режимы

## Решение проблем

### Проблема: Python не найден
```bash
# Windows
python --version
# или
py --version

# Linux/Mac
python3 --version
```

### Проблема: Модули не найдены
```bash
pip install -r requirements.txt
# или
pip3 install -r requirements.txt
```

### Проблема: Кодировка в Windows
- Используйте `geekjob_simple.py` вместо `geekjob_parser.py`
- Все логи настроены на UTF-8

### Проблема: Таймауты
- Увеличьте таймауты в настройках парсеров
- Проверьте интернет-соединение
- Используйте VPN при блокировках

## Развитие

### Добавление нового парсера
1. Создайте файл `parsers/new_source_parser.py`
2. Реализуйте класс с методом `parse_vacancies()`
3. Добавьте импорт в `unified_parser.py`
4. Обновите список источников

### Настройка расписания
Отредактируйте `schedule_parser.py`:
```python
# Каждые 6 часов
schedule.every(6).hours.do(run_parsers)

# В определённое время
schedule.every().day.at("09:00").do(run_parsers)
```

## Поддержка

При возникновении проблем:
1. Проверьте логи в соответствующих файлах
2. Убедитесь в наличии всех зависимостей
3. Проверьте доступность целевых сайтов
4. Используйте `--verbose` для подробной диагностики











