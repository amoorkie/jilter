-- Создание таблиц для системы мягкой фильтрации вакансий

-- Таблица вакансий с расширенными полями
CREATE TABLE IF NOT EXISTS vacancies (
    id SERIAL PRIMARY KEY,
    source VARCHAR(20) NOT NULL, -- 'geekjob' или 'hh'
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    city VARCHAR(100),
    salary_from INTEGER,
    salary_to INTEGER,
    is_remote BOOLEAN DEFAULT FALSE,
    description_raw TEXT,
    description_normalized TEXT,
    tokens JSONB,
    scraped_at TIMESTAMP DEFAULT NOW(),
    score DECIMAL(3,1) DEFAULT 0,
    matched_tokens JSONB DEFAULT '[]'::jsonb
);

-- Токсичные токены (триггеры для фильтрации)
CREATE TABLE IF NOT EXISTS toxic_tokens (
    id SERIAL PRIMARY KEY,
    phrase_raw TEXT NOT NULL,
    phrase_norm TEXT NOT NULL,
    type VARCHAR(10) DEFAULT 'phrase' CHECK (type IN ('phrase', 'regex')),
    weight INTEGER DEFAULT 1,
    examples JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Пользовательские фильтры
CREATE TABLE IF NOT EXISTS user_filters (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    token_id INTEGER REFERENCES toxic_tokens(id) ON DELETE CASCADE,
    action VARCHAR(10) NOT NULL CHECK (action IN ('hide', 'show')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, token_id)
);

-- Глобальная статистика токенов
CREATE TABLE IF NOT EXISTS global_token_stats (
    id SERIAL PRIMARY KEY,
    token_id INTEGER REFERENCES toxic_tokens(id) ON DELETE CASCADE,
    hides_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    last_used_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(token_id)
);

-- Действия пользователей
CREATE TABLE IF NOT EXISTS user_actions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    vacancy_id INTEGER REFERENCES vacancies(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('hide_vacancy', 'hide_company', 'thumbs_up', 'thumbs_down')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_vacancies_tokens ON vacancies USING GIN (tokens);
CREATE INDEX IF NOT EXISTS idx_vacancies_description_tsvector ON vacancies USING GIN (to_tsvector('russian', description_normalized));
CREATE INDEX IF NOT EXISTS idx_vacancies_description_trgm ON vacancies USING GIN (description_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vacancies_score ON vacancies (score);
CREATE INDEX IF NOT EXISTS idx_vacancies_scraped_at ON vacancies (scraped_at);
CREATE INDEX IF NOT EXISTS idx_vacancies_source ON vacancies (source);

-- Индексы для токсичных токенов
CREATE INDEX IF NOT EXISTS idx_toxic_tokens_phrase_norm ON toxic_tokens (phrase_norm);
CREATE INDEX IF NOT EXISTS idx_toxic_tokens_type ON toxic_tokens (type);

-- Индексы для пользовательских фильтров
CREATE INDEX IF NOT EXISTS idx_user_filters_user_id ON user_filters (user_id);
CREATE INDEX IF NOT EXISTS idx_user_filters_token_id ON user_filters (token_id);

-- Индексы для статистики
CREATE INDEX IF NOT EXISTS idx_global_token_stats_token_id ON global_token_stats (token_id);
CREATE INDEX IF NOT EXISTS idx_global_token_stats_hides_count ON global_token_stats (hides_count);

-- Индексы для действий пользователей
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_vacancy_id ON user_actions (vacancy_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_action ON user_actions (action);

