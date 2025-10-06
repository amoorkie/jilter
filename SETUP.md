# 🚀 Настройка системы мягкой фильтрации

## 📋 Предварительные требования

1. **Node.js** 18+ 
2. **PostgreSQL** или **Supabase**
3. **Redis** (опционально, для продакшена)

## 🗄️ Настройка базы данных

### Вариант 1: Supabase (Рекомендуется)

1. Создайте проект на [supabase.com](https://supabase.com)
2. Скопируйте URL и API ключ
3. Создайте файл `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Запустите инициализацию БД:

```bash
npm run init-db
```

### Вариант 0: Разработка без БД (По умолчанию)

Если вы не хотите настраивать Supabase, приложение будет работать в режиме разработки:

1. Создайте файл `.env.local`:

```bash
# Оставляем пустыми для работы без БД
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

2. Приложение будет использовать моковые данные и старый API парсинга

### Вариант 2: Локальный PostgreSQL

1. Установите PostgreSQL
2. Создайте базу данных:

```sql
CREATE DATABASE job_filter;
```

3. Настройте переменные окружения:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/job_filter
```

4. Запустите миграции:

```bash
npm run init-db
```

## 🚀 Запуск приложения

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Инициализация базы данных
npm run init-db

# Обновление статистики токенов
npm run update-stats
```

## 📊 Структура базы данных

### Основные таблицы:

- **`vacancies`** - вакансии с нормализованными данными
- **`toxic_tokens`** - токсичные фразы для фильтрации
- **`user_filters`** - пользовательские настройки фильтров
- **`global_token_stats`** - глобальная статистика токенов
- **`user_actions`** - действия пользователей

### Индексы:

- GIN индексы для быстрого поиска по JSONB
- tsvector индексы для полнотекстового поиска
- pg_trgm индексы для fuzzy-поиска

## 🔧 API Endpoints

### Получение вакансий
```
GET /api/vacancies?query=javascript&scoreMin=0&source[]=geekjob&source[]=hh
```

### Рекомендации фильтров
```
GET /api/filter-suggestions?minUsers=50
```

### Пользовательские фильтры
```
GET /api/user-filters?userId=anonymous
POST /api/user-filters
```

### Действия пользователей
```
POST /api/user-actions
```

## 📈 Мониторинг и аналитика

### Дашборд аналитики
- URL: `/analytics`
- Показывает статистику использования фильтров
- Топ токсичных фраз
- Распределение качества вакансий

### Обновление статистики
```bash
# Ручное обновление
npm run update-stats

# Автоматическое обновление (cron)
0 */6 * * * npm run update-stats
```

## 🎯 Настройка токсичных токенов

### Добавление новых токенов:

```sql
INSERT INTO toxic_tokens (phrase_raw, phrase_norm, type, weight, examples) 
VALUES ('новая фраза', 'нормализованная фраза', 'phrase', 2, '["пример1", "пример2"]');
```

### Типы токенов:
- **`phrase`** - точное совпадение фразы
- **`regex`** - регулярное выражение

### Веса:
- **1** - слабый сигнал
- **2** - средний сигнал  
- **3** - сильный сигнал

## 🚀 Продакшен

### Кэширование
- В разработке: встроенный Map-based кэш
- В продакшене: Redis

### Масштабирование
- Горизонтальное масштабирование парсеров
- Кэширование результатов API
- Асинхронная обработка статистики

### Мониторинг
- Логирование всех действий пользователей
- Метрики производительности
- Алерты на критические ошибки

## 🔍 Отладка

### Логи
```bash
# Включить подробные логи
DEBUG=job-filter:* npm run dev
```

### Проверка БД
```bash
# Подключение к БД
npm run db:connect

# Проверка статистики
npm run db:stats
```

## 📚 Дополнительные ресурсы

- [Документация Supabase](https://supabase.com/docs)
- [PostgreSQL документация](https://www.postgresql.org/docs/)
- [Next.js документация](https://nextjs.org/docs)
