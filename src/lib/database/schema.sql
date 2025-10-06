-- Схема базы данных для системы поиска вакансий
-- Создание таблиц для хранения вакансий с AI-анализом

-- Таблица вакансий
CREATE TABLE IF NOT EXISTS vacancies (
    id SERIAL PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL, -- ID из источника (HH, GeekJob, etc.)
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    url TEXT NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'hh', 'geekjob', 'hirehi'
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- AI-анализ
    ai_specialization VARCHAR(50), -- frontend, backend, etc.
    ai_employment TEXT[], -- массив типов занятости
    ai_experience VARCHAR(20), -- junior, middle, senior, lead
    ai_technologies TEXT[], -- массив технологий
    ai_salary_min INTEGER,
    ai_salary_max INTEGER,
    ai_salary_currency VARCHAR(10) DEFAULT 'RUB',
    ai_remote BOOLEAN DEFAULT FALSE,
    ai_requirements TEXT[], -- массив требований
    ai_benefits TEXT[], -- массив бенефитов
    ai_relevance_score INTEGER DEFAULT 50, -- 0-100
    ai_summary TEXT,
    
    -- Метаданные
    is_active BOOLEAN DEFAULT TRUE,
    last_parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для кэширования поисковых запросов
CREATE TABLE IF NOT EXISTS search_cache (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) UNIQUE NOT NULL, -- MD5 хеш запроса
    query_text TEXT NOT NULL,
    filters JSONB, -- JSON с фильтрами
    results JSONB, -- JSON с результатами
    total_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Таблица для статистики парсинга
CREATE TABLE IF NOT EXISTS parsing_stats (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    query TEXT NOT NULL,
    vacancies_found INTEGER DEFAULT 0,
    vacancies_parsed INTEGER DEFAULT 0,
    ai_analysis_success INTEGER DEFAULT 0,
    ai_analysis_failed INTEGER DEFAULT 0,
    parsing_duration_ms INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Таблица для пользовательских предпочтений
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    preferred_specializations TEXT[],
    preferred_technologies TEXT[],
    preferred_employment TEXT[],
    salary_min INTEGER,
    salary_max INTEGER,
    remote_preference BOOLEAN,
    experience_level VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_vacancies_source ON vacancies(source);
CREATE INDEX IF NOT EXISTS idx_vacancies_ai_specialization ON vacancies(ai_specialization);
CREATE INDEX IF NOT EXISTS idx_vacancies_ai_experience ON vacancies(ai_experience);
CREATE INDEX IF NOT EXISTS idx_vacancies_ai_remote ON vacancies(ai_remote);
CREATE INDEX IF NOT EXISTS idx_vacancies_ai_salary_min ON vacancies(ai_salary_min);
CREATE INDEX IF NOT EXISTS idx_vacancies_ai_salary_max ON vacancies(ai_salary_max);
CREATE INDEX IF NOT EXISTS idx_vacancies_published_at ON vacancies(published_at);
CREATE INDEX IF NOT EXISTS idx_vacancies_created_at ON vacancies(created_at);
CREATE INDEX IF NOT EXISTS idx_vacancies_is_active ON vacancies(is_active);

-- Индекс для полнотекстового поиска
CREATE INDEX IF NOT EXISTS idx_vacancies_fulltext ON vacancies USING gin(
    to_tsvector('russian', title || ' ' || description || ' ' || company)
);

-- Индекс для поиска по технологиям
CREATE INDEX IF NOT EXISTS idx_vacancies_technologies ON vacancies USING gin(ai_technologies);
CREATE INDEX IF NOT EXISTS idx_vacancies_employment ON vacancies USING gin(ai_employment);

-- Индекс для кэша поиска
CREATE INDEX IF NOT EXISTS idx_search_cache_query_hash ON search_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_search_cache_expires_at ON search_cache(expires_at);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_vacancies_updated_at 
    BEFORE UPDATE ON vacancies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



