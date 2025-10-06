# 🎯 Geekjob Parser для Next.js проекта

Эффективный Python парсер для сбора дизайнерских вакансий с Geekjob.ru, интегрированный в ваш Next.js проект.

## 🚀 Быстрый старт

### 1. Установка и настройка

```bash
# Перейдите в папку парсеров
cd parsers

# Установите зависимости
pip install -r requirements.txt

# Запустите автоматическую настройку
python setup_parser.py
```

### 2. Первый запуск

```bash
# Базовый парсинг (10 страниц)
python geekjob_parser.py

# Быстрый тест (1 страница)
python geekjob_parser.py --pages 1 --verbose

# Парсинг UI дизайнеров
python geekjob_parser.py --query "UI дизайнер" --pages 5
```

### 3. Проверка результатов

```bash
# Просмотр базы данных
sqlite3 geekjob_vacancies.db "SELECT title, company FROM vacancies LIMIT 5"

# Экспорт в JSON
python geekjob_parser.py --export json

# Экспорт в CSV
python geekjob_parser.py --export csv
```

## 🔧 Параметры командной строки

```bash
python geekjob_parser.py [OPTIONS]

Основные опции:
  --query TEXT          Поисковый запрос (по умолчанию: дизайнер)
  --pages INTEGER       Количество страниц (по умолчанию: 10)
  --delay FLOAT         Задержка между запросами в секундах (по умолчанию: 1.0)
  --verbose             Подробный вывод
  --export FORMAT       Экспорт в формат: json, csv
  --dry-run             Тестовый запуск без сохранения
  --help                Показать справку
```

## 📊 Интеграция с Next.js

Парсер автоматически сохраняет данные в SQLite базу данных, которая совместима с вашим Next.js проектом.

### Структура базы данных

```sql
CREATE TABLE vacancies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL DEFAULT 'geekjob',
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
    -- ... другие поля
    status TEXT DEFAULT 'pending'
);
```

### Использование в Next.js API

```javascript
// pages/api/parse-geekjob.js
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  try {
    const { stdout } = await execAsync(
      'python parsers/geekjob_parser.py --pages 3',
      { cwd: process.cwd() }
    );
    
    res.status(200).json({ 
      success: true, 
      output: stdout 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

## ⏰ Автоматизация

### Cron (Linux/Mac)

```bash
# Каждые 4 часа
0 */4 * * * cd /path/to/project/parsers && python geekjob_parser.py >> ../cron.log 2>&1
```

### Task Scheduler (Windows)

1. Откройте Task Scheduler
2. Создайте задачу
3. Программа: `python.exe`
4. Аргументы: `C:\path\to\project\parsers\geekjob_parser.py`

## 📈 Мониторинг

### Логи

```bash
# Просмотр логов
tail -f geekjob_parser.log

# Поиск ошибок
grep "ERROR" geekjob_parser.log
```

### Статистика базы данных

```sql
-- Общая статистика
SELECT COUNT(*) as total FROM vacancies WHERE source = 'geekjob';

-- За последние 24 часа
SELECT COUNT(*) FROM vacancies 
WHERE source = 'geekjob' AND created_at > datetime('now', '-1 day');

-- Топ компаний
SELECT company, COUNT(*) as count 
FROM vacancies 
WHERE source = 'geekjob' 
GROUP BY company 
ORDER BY count DESC 
LIMIT 10;
```

## 🛠 Устранение неполадок

### Частые проблемы

**1. Ошибка импорта модулей**
```bash
pip install -r requirements.txt
```

**2. База данных заблокирована**
```bash
# Проверьте процессы
ps aux | grep geekjob_parser
pkill -f geekjob_parser.py
```

**3. Не находит вакансии**
```bash
# Тестовый запуск с отладкой
python geekjob_parser.py --dry-run --verbose --pages 1
```

### Диагностика

```bash
# Проверка зависимостей
python -c "import requests, bs4, lxml; print('✅ Все зависимости установлены')"

# Тест подключения
python -c "import requests; print('Status:', requests.get('https://geekjob.ru').status_code)"
```

## 📞 Поддержка

- **Логи**: `geekjob_parser.log`
- **Справка**: `python geekjob_parser.py --help`
- **Тестирование**: `python setup_parser.py`

---

**Версия**: 1.0.0  
**Дата**: 2025-01-02  
**Совместимость**: Python 3.8+, Next.js 13+

Создано специально для эффективного парсинга дизайнерских вакансий 🎨











