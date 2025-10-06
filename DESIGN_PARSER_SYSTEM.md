# 🎨 Система парсинга дизайнерских вакансий

## 📋 Обзор системы

Система предназначена для сбора, анализа и модерации вакансий для дизайнеров с различных источников (HH.ru, Geekjob.ru, HireHi.ru).

## 🔧 Улучшения парсеров

### 1. **Фокус на дизайнерских вакансиях**

#### Ключевые слова для поиска:
- **Русские**: дизайн, дизайнер, дизайнер интерфейсов, ui/ux, ux/ui, продуктовый дизайн, графический дизайнер, веб-дизайнер, интерфейсный дизайнер, визуальный дизайнер, motion-дизайнер, ux-исследователь, арт-директор
- **Английские**: designer, ui designer, ux designer, product designer, visual designer, graphic designer, web designer, interaction designer, motion designer, ux researcher, art director, creative director

#### Проверка релевантности:
```typescript
function isRelevantVacancy(title: string, description: string = ''): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return DESIGN_KEYWORDS.some(keyword => 
    text.includes(keyword.toLowerCase())
  );
}
```

### 2. **Улучшенные парсеры**

#### HH.ru Parser (`src/lib/parsers/hh/parser.ts`)
- ✅ Множественные селекторы для надежности
- ✅ Проверка релевантности по ключевым словам
- ✅ Очистка дублей названий компаний
- ✅ Подробное логирование процесса
- ✅ Ограничение по времени (последние 3 дня)

#### Geekjob Parser (`src/lib/parsers/geekjob/parser.ts`)
- ✅ Адаптивные селекторы
- ✅ Поиск по паттернам зарплаты
- ✅ Фильтрация нерелевантных вакансий
- ✅ Обработка различных структур страниц

#### HireHi Parser (`src/lib/parsers/hirehi/parser.ts`)
- ✅ Умное определение названий вакансий
- ✅ Поиск компаний в тексте
- ✅ Валидация данных
- ✅ Обработка динамических ссылок

### 3. **Enhanced Parser (`src/lib/parsers/enhanced-parser.ts`)**
- ✅ Объединение всех источников
- ✅ Дедупликация по URL
- ✅ Множественные поисковые запросы
- ✅ Параллельная обработка

## 🎯 Админ-панель

### Функциональность:
1. **Просмотр всех вакансий** с фильтрацией по статусу
2. **Поиск** по названию, компании, описанию
3. **Модерация** с кнопками:
   - ✅ **Одобрить** - публикует на сайте
   - ❌ **Отклонить** - скрывает с сайта
   - 📤 **Снять с публикации** - для одобренных вакансий

### Статусы вакансий:
- 🟡 **Ожидает** - новая вакансия, требует модерации
- 🟢 **Опубликовано** - одобрена, показывается на сайте
- 🔴 **Отклонено** - отклонена, не показывается на сайте

### Фильтры:
- **Все** - все вакансии
- **Ожидают** - требуют модерации
- **Опубликованы** - одобренные вакансии
- **Отклонены** - отклоненные вакансии

## 🗄️ База данных

### Структура таблицы `vacancies`:
```sql
CREATE TABLE vacancies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  description TEXT,
  published_at TEXT,
  ai_specialization TEXT DEFAULT 'other',
  ai_employment TEXT DEFAULT '[]',
  ai_experience TEXT DEFAULT 'junior',
  ai_technologies TEXT DEFAULT '[]',
  ai_salary_min INTEGER,
  ai_salary_max INTEGER,
  ai_salary_currency TEXT DEFAULT 'RUB',
  ai_remote BOOLEAN DEFAULT 0,
  ai_relevance_score REAL DEFAULT 0,
  ai_summary TEXT DEFAULT '',
  is_approved BOOLEAN DEFAULT 0,
  is_rejected BOOLEAN DEFAULT 0,
  moderation_notes TEXT DEFAULT '',
  moderated_at TEXT,
  moderated_by TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Workflow

### 1. **Парсинг**
```typescript
// Запуск парсинга дизайнерских вакансий
const vacancies = await parseAllDesignVacancies(200);
```

### 2. **AI Анализ**
```typescript
// Анализ каждой вакансии с помощью DeepSeek
const analysis = await analyzeVacancyWithDeepSeek(
  vacancy.title,
  vacancy.description,
  vacancy.company
);
```

### 3. **Сохранение в БД**
```typescript
// Сохранение с начальным статусом "ожидает модерации"
await db.saveVacancy({
  ...vacancy,
  is_approved: false,
  is_rejected: false
});
```

### 4. **Модерация**
- Админ заходит на `/admin`
- Просматривает вакансии с AI анализом
- Принимает решение: одобрить/отклонить
- Вакансия получает соответствующий статус

### 5. **Публикация**
- Только одобренные вакансии показываются на сайте
- API `/api/vacancies` возвращает только `is_approved = true`

## 📊 Статистика

### Текущие результаты:
- **Источники**: HH.ru, Geekjob.ru, HireHi.ru
- **Ключевые слова**: 25+ дизайнерских терминов
- **Фильтрация**: Релевантность по названию и описанию
- **AI Анализ**: DeepSeek для классификации
- **Модерация**: Ручная проверка качества

### Ожидаемые улучшения:
- 🎯 **Больше релевантных вакансий** (фокус на дизайне)
- 🚫 **Меньше спама** (фильтрация по ключевым словам)
- ⚡ **Быстрее парсинг** (оптимизированные селекторы)
- 🎨 **Лучше качество** (AI анализ + модерация)

## 🔧 Настройка

### Переменные окружения:
```bash
# DeepSeek API (для AI анализа)
QWEN_API_KEY=your_deepseek_api_key

# База данных (SQLite)
DATABASE_URL=file:./data/vacancies.db
```

### Запуск парсинга:
```bash
# Заполнение базы данных
node scripts/seed-database.js

# Ручной парсинг
npm run parse:design
```

## 📈 Мониторинг

### Логи парсинга:
- 🔍 Количество найденных вакансий
- ✅ Релевантные вакансии
- ❌ Отфильтрованные нерелевантные
- 🤖 Результаты AI анализа

### Метрики админки:
- 📊 Общее количество вакансий
- 🟡 Ожидают модерации
- 🟢 Опубликованы
- 🔴 Отклонены

## 🎯 Следующие шаги

1. **Мониторинг качества** - отслеживание релевантности
2. **Автоматизация** - cron для регулярного парсинга
3. **Расширение источников** - добавление новых сайтов
4. **Улучшение AI** - более точная классификация
5. **Аналитика** - статистика по источникам и качеству














