// SQLite Database Service
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  password?: string;
  image?: string;
  provider: string;
  provider_id?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
  preferences?: string; // JSON для настроек пользователя
}

export interface VacancyRecord {
  id: number;
  external_id: string;
  source: string;
  url: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  ai_specialization: string;
  ai_employment: string; // JSON array
  ai_experience: string;
  ai_technologies: string; // JSON array
  ai_salary_min?: number;
  ai_salary_max?: number;
  ai_remote: boolean;
  ai_relevance_score: number;
  ai_summary: string;
  is_approved: boolean;
  is_rejected: boolean;
  moderation_notes: string;
  moderated_at?: string;
  moderated_by: string;
  // Новые поля для детальной информации
  full_description?: string;
  edited_description?: string; // Отредактированное описание
  requirements?: string;
  tasks?: string;
  benefits?: string;
  conditions?: string;
  company_logo?: string;
  company_url?: string;
  employment_type?: string;
  experience_level?: string;
  remote_type?: string;
  // Поля для дедупликации
  title_hash?: string;
  company_hash?: string;
  url_hash?: string;
}

export class SQLiteService {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'job_filter.db');
    console.log('🗄️ SQLiteService: путь к базе данных:', dbPath);
    this.db = new Database(dbPath);
    this.initDatabase();
  }

  private initDatabase() {
    // Создаем таблицу вакансий
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS vacancies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        -- Поля для дедупликации
        title_hash TEXT,
        company_hash TEXT,
        url_hash TEXT,
        location TEXT DEFAULT '',
        description TEXT DEFAULT '',
        salary_min INTEGER,
        salary_max INTEGER,
        salary_currency TEXT DEFAULT 'RUB',
        published_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        ai_specialization TEXT DEFAULT 'other',
        ai_employment TEXT DEFAULT '[]',
        ai_experience TEXT DEFAULT 'junior',
        ai_technologies TEXT DEFAULT '[]',
        ai_salary_min INTEGER,
        ai_salary_max INTEGER,
        ai_remote BOOLEAN DEFAULT 0,
        ai_relevance_score REAL DEFAULT 0,
        ai_summary TEXT DEFAULT '',
        is_approved BOOLEAN DEFAULT 0,
        is_rejected BOOLEAN DEFAULT 0,
        moderation_notes TEXT DEFAULT '',
        moderated_at TEXT,
        moderated_by TEXT DEFAULT '',
        full_description TEXT DEFAULT '',
        edited_description TEXT DEFAULT '',
        requirements TEXT DEFAULT '',
        tasks TEXT DEFAULT '',
        benefits TEXT DEFAULT '',
        conditions TEXT DEFAULT '',
        company_logo TEXT DEFAULT '',
        company_url TEXT DEFAULT '',
        employment_type TEXT DEFAULT '',
        experience_level TEXT DEFAULT '',
        remote_type TEXT DEFAULT ''
      )
    `);

    // Создаем таблицу пользователей
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT,
        image TEXT,
        provider TEXT NOT NULL DEFAULT 'email',
        provider_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login TEXT,
        is_active BOOLEAN DEFAULT 1,
        preferences TEXT DEFAULT '{}'
      )
    `);

    // Добавляем поле password если его нет (миграция)
    try {
      this.db.exec(`ALTER TABLE users ADD COLUMN password TEXT`);
    } catch (error) {
      // Поле уже существует, игнорируем ошибку
    }

    // Создаем таблицу комментариев
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        vacancy_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        parent_id TEXT,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vacancy_id) REFERENCES vacancies(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )
    `);

    // Создаем таблицу реакций на комментарии
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        id TEXT PRIMARY KEY,
        comment_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reaction_type TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(comment_id, user_id)
      )
    `);

    // Создаем индексы для быстрого поиска
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_source ON vacancies(source);
      CREATE INDEX IF NOT EXISTS idx_ai_specialization ON vacancies(ai_specialization);
      CREATE INDEX IF NOT EXISTS idx_ai_employment ON vacancies(ai_employment);
      CREATE INDEX IF NOT EXISTS idx_ai_experience ON vacancies(ai_experience);
      CREATE INDEX IF NOT EXISTS idx_ai_remote ON vacancies(ai_remote);
      CREATE INDEX IF NOT EXISTS idx_ai_relevance ON vacancies(ai_relevance_score);
      CREATE INDEX IF NOT EXISTS idx_is_approved ON vacancies(is_approved);
      CREATE INDEX IF NOT EXISTS idx_is_rejected ON vacancies(is_rejected);
      -- Индексы для дедупликации
      CREATE INDEX IF NOT EXISTS idx_title_hash ON vacancies(title_hash);
      CREATE INDEX IF NOT EXISTS idx_company_hash ON vacancies(company_hash);
      CREATE INDEX IF NOT EXISTS idx_url_hash ON vacancies(url_hash);
      CREATE INDEX IF NOT EXISTS idx_title_company ON vacancies(title, company);
      
      -- Индексы для таблицы пользователей
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);
      CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id);
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
      
      -- Индексы для таблицы комментариев
      CREATE INDEX IF NOT EXISTS idx_comments_vacancy_id ON comments(vacancy_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
      CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
      
      -- Индексы для таблицы реакций на комментарии
      CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
      CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_comment_reactions_type ON comment_reactions(reaction_type);
    `);

    // Миграция для добавления полей дедупликации
    this.migrateDatabase();
    
    console.log('✅ SQLite база данных инициализирована');
  }

  private migrateDatabase() {
    try {
      // Проверяем существование полей дедупликации
      const columns = this.db.prepare("PRAGMA table_info(vacancies)").all() as any[];
      const columnNames = columns.map(col => col.name);
      
      if (!columnNames.includes('title_hash')) {
        console.log('🔄 Добавляем поля дедупликации...');
        this.db.exec(`
          ALTER TABLE vacancies ADD COLUMN title_hash TEXT;
          ALTER TABLE vacancies ADD COLUMN company_hash TEXT;
          ALTER TABLE vacancies ADD COLUMN url_hash TEXT;
        `);
        
        // Генерируем хеши для существующих записей
        console.log('🔄 Генерируем хеши для существующих записей...');
        const vacancies = this.db.prepare('SELECT id, title, company, url FROM vacancies').all() as any[];
        
        const updateStmt = this.db.prepare(`
          UPDATE vacancies 
          SET title_hash = ?, company_hash = ?, url_hash = ?
          WHERE id = ?
        `);
        
        vacancies.forEach(vacancy => {
          const hashes = this.generateVacancyHashes({
            title: vacancy.title,
            company: vacancy.company,
            url: vacancy.url
          });
          
          updateStmt.run(hashes.title_hash, hashes.company_hash, hashes.url_hash, vacancy.id);
        });
        
        console.log('✅ Миграция дедупликации завершена');
      }
    } catch (error) {
      console.log('⚠️ Ошибка миграции:', error);
    }
  }

  // Утилиты для дедупликации
  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '') // Убираем знаки препинания
      .replace(/\s+/g, ' ')    // Нормализуем пробелы
      .trim();
  }

  private generateHash(text: string): string {
    const normalized = this.normalizeText(text);
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  private generateVacancyHashes(vacancy: {
    title: string;
    company: string;
    url: string;
  }) {
    return {
      title_hash: this.generateHash(vacancy.title),
      company_hash: this.generateHash(vacancy.company),
      url_hash: this.generateHash(vacancy.url)
    };
  }

  // Проверка на дубликаты
  async findDuplicates(vacancy: {
    title: string;
    company: string;
    url: string;
    source: string;
  }): Promise<VacancyRecord[]> {
    const hashes = this.generateVacancyHashes(vacancy);
    
    const stmt = this.db.prepare(`
      SELECT * FROM vacancies 
      WHERE (title_hash = ? OR company_hash = ? OR url_hash = ?)
      AND source = ?
      ORDER BY created_at DESC
    `);
    
    return stmt.all(hashes.title_hash, hashes.company_hash, hashes.url_hash, vacancy.source);
  }

  // Проверка на точные дубликаты (одинаковые title + company)
  async findExactDuplicates(vacancy: {
    title: string;
    company: string;
    source: string;
  }): Promise<VacancyRecord[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM vacancies 
      WHERE LOWER(title) = LOWER(?)
      AND LOWER(company) = LOWER(?)
      AND source = ?
      ORDER BY created_at DESC
    `);
    
    return stmt.all(vacancy.title, vacancy.company, vacancy.source);
  }

  async saveVacancy(vacancy: Omit<VacancyRecord, 'id' | 'created_at' | 'updated_at'>): Promise<VacancyRecord> {
    // Проверяем на дубликаты (исключая текущий external_id)
    const duplicates = await this.findExactDuplicates({
      title: vacancy.title,
      company: vacancy.company,
      source: vacancy.source
    });

    // Фильтруем дубликаты, исключая записи с тем же external_id
    const realDuplicates = duplicates.filter(dup => dup.external_id !== vacancy.external_id);

    if (realDuplicates.length > 0) {
      console.log(`🔄 Найден дубликат: ${vacancy.title} в ${vacancy.company} (${vacancy.source})`);
      console.log(`🔍 Количество дубликатов: ${realDuplicates.length}`);
      
      // Удаляем все дубликаты
      const deleteStmt = this.db.prepare('DELETE FROM vacancies WHERE id IN (' + realDuplicates.map(() => '?').join(',') + ')');
      const idsToDelete = realDuplicates.map(dup => dup.id);
      deleteStmt.run(...idsToDelete);
      console.log(`🗑️ Удалено ${realDuplicates.length} дубликатов`);
      
      // Создаем новую запись
      console.log(`📝 Создаем новую запись для ${vacancy.title}`);
    }

    // Генерируем хеши для дедупликации
    const hashes = this.generateVacancyHashes({
      title: vacancy.title,
      company: vacancy.company,
      url: vacancy.url
    });

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vacancies (
        external_id, source, url, title, company, location, description,
        salary_min, salary_max, salary_currency, published_at,
        ai_specialization, ai_employment, ai_experience, ai_technologies,
        ai_salary_min, ai_salary_max, ai_remote, ai_relevance_score, ai_summary,
        full_description, requirements, tasks, benefits, conditions,
        company_logo, company_url, employment_type, experience_level, remote_type,
        title_hash, company_hash, url_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      vacancy.external_id,
      vacancy.source,
      vacancy.url,
      vacancy.title,
      vacancy.company,
      vacancy.location,
      vacancy.description,
      vacancy.salary_min,
      vacancy.salary_max,
      vacancy.salary_currency,
      vacancy.published_at,
      vacancy.ai_specialization,
      JSON.stringify(vacancy.ai_employment),
      vacancy.ai_experience,
      JSON.stringify(vacancy.ai_technologies),
      vacancy.ai_salary_min,
      vacancy.ai_salary_max,
      vacancy.ai_remote ? 1 : 0,
      vacancy.ai_relevance_score,
      vacancy.ai_summary,
      vacancy.full_description || '',
      vacancy.requirements || '',
      vacancy.tasks || '',
      vacancy.benefits || '',
      vacancy.conditions || '',
      vacancy.company_logo || '',
      vacancy.company_url || '',
      vacancy.employment_type || '',
      vacancy.experience_level || '',
      vacancy.remote_type || '',
      hashes.title_hash,
      hashes.company_hash,
      hashes.url_hash
    );

    return this.getVacancyById(result.lastInsertRowid as number);
  }

  async updateVacancy(id: number, updates: Partial<VacancyRecord>): Promise<VacancyRecord> {
    const fields = [];
    const values = [];

    // Обновляем только переданные поля, исключая id и external_id
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id' && key !== 'external_id') {
        fields.push(`${key} = ?`);
        if (key === 'ai_employment' || key === 'ai_technologies') {
          values.push(JSON.stringify(value));
        } else if (key === 'ai_remote') {
          values.push(value ? 1 : 0);
        } else {
          values.push(value);
        }
      }
    });

    if (fields.length === 0) {
      return this.getVacancyById(id);
    }

    // Добавляем updated_at
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE vacancies 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getVacancyById(id);
  }

  async getVacancyById(id: number): Promise<VacancyRecord> {
    const stmt = this.db.prepare('SELECT * FROM vacancies WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) {
      throw new Error(`Вакансия с ID ${id} не найдена`);
    }

    return {
      ...row,
      ai_employment: JSON.parse(row.ai_employment),
      ai_technologies: JSON.parse(row.ai_technologies),
      ai_remote: Boolean(row.ai_remote)
    };
  }

  async searchVacancies(filters: {
    query?: string;
    specialization?: string;
    employment?: string[];
    experience?: string;
    remote?: boolean;
    minSalary?: number;
    maxSalary?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ vacancies: VacancyRecord[]; total: number }> {
    let whereConditions = [];
    let params: any[] = [];

    // Поиск по тексту
    if (filters.query) {
      whereConditions.push(`(title LIKE ? OR company LIKE ? OR description LIKE ?)`);
      const searchTerm = `%${filters.query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Фильтр по специализации
    if (filters.specialization) {
      whereConditions.push(`ai_specialization = ?`);
      params.push(filters.specialization);
    }

    // Фильтр по типу занятости
    if (filters.employment && filters.employment.length > 0) {
      const employmentConditions = filters.employment.map(() => `ai_employment LIKE ?`);
      whereConditions.push(`(${employmentConditions.join(' OR ')})`);
      filters.employment.forEach(emp => {
        params.push(`%"${emp}"%`);
      });
    }

    // Фильтр по опыту
    if (filters.experience) {
      whereConditions.push(`ai_experience = ?`);
      params.push(filters.experience);
    }

    // Фильтр по удаленной работе
    if (filters.remote !== undefined) {
      whereConditions.push(`ai_remote = ?`);
      params.push(filters.remote ? 1 : 0);
    }

    // Фильтр по зарплате
    if (filters.minSalary) {
      whereConditions.push(`(ai_salary_min >= ? OR ai_salary_max >= ?)`);
      params.push(filters.minSalary, filters.minSalary);
    }

    if (filters.maxSalary) {
      whereConditions.push(`(ai_salary_max <= ? OR ai_salary_min <= ?)`);
      params.push(filters.maxSalary, filters.maxSalary);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Подсчет общего количества
    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM vacancies ${whereClause}`);
    const countResult = countStmt.get(...params) as { total: number };

    // Получение вакансий
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    
    const searchStmt = this.db.prepare(`
      SELECT * FROM vacancies 
      ${whereClause}
      ORDER BY is_approved DESC, ai_relevance_score DESC, published_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = searchStmt.all(...params, limit, offset) as any[];

    const vacancies = rows.map(row => ({
      ...row,
      ai_employment: JSON.parse(row.ai_employment),
      ai_technologies: JSON.parse(row.ai_technologies),
      ai_remote: Boolean(row.ai_remote)
    }));

    return {
      vacancies,
      total: countResult.total
    };
  }

  async getAllVacancies(): Promise<VacancyRecord[]> {
    const stmt = this.db.prepare('SELECT * FROM vacancies ORDER BY is_approved DESC, ai_relevance_score DESC, published_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      ...row,
      ai_employment: JSON.parse(row.ai_employment),
      ai_technologies: JSON.parse(row.ai_technologies),
      ai_remote: Boolean(row.ai_remote)
    }));
  }

  async deleteVacancy(id: number): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM vacancies WHERE id = ?');
    stmt.run(id);
  }

  async clearDatabase(): Promise<void> {
    this.db.exec('DELETE FROM vacancies');
    console.log('🗑️ База данных очищена');
  }

  // Методы для модерации
  async getPendingVacancies(): Promise<VacancyRecord[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM vacancies 
      WHERE is_approved = 0 AND is_rejected = 0 
      ORDER BY created_at DESC
    `);
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      ...row,
      ai_employment: JSON.parse(row.ai_employment),
      ai_technologies: JSON.parse(row.ai_technologies),
      ai_remote: Boolean(row.ai_remote),
      is_approved: Boolean(row.is_approved),
      is_rejected: Boolean(row.is_rejected)
    }));
  }

  async approveVacancy(id: number, moderator: string, notes?: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE vacancies 
      SET is_approved = 1, is_rejected = 0, moderated_at = ?, moderated_by = ?, moderation_notes = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), moderator, notes || '', id);
  }

  async rejectVacancy(id: number, moderator: string, notes?: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE vacancies 
      SET is_approved = 0, is_rejected = 1, moderated_at = ?, moderated_by = ?, moderation_notes = ?
      WHERE id = ?
    `);
    stmt.run(new Date().toISOString(), moderator, notes || '', id);
  }

  async getApprovedVacancies(): Promise<VacancyRecord[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM vacancies 
      WHERE is_approved = 1 
      ORDER BY ai_relevance_score DESC, published_at DESC
    `);
    const rows = stmt.all() as any[];

    // Оптимизированная обработка без лишних преобразований
    return rows.map(row => {
      // Быстрая проверка и парсинг только если нужно
      let ai_employment = row.ai_employment;
      if (typeof ai_employment === 'string') {
        try {
          ai_employment = JSON.parse(ai_employment);
        } catch {
          ai_employment = [];
        }
      }

      let ai_technologies = row.ai_technologies;
      if (typeof ai_technologies === 'string') {
        try {
          ai_technologies = JSON.parse(ai_technologies);
        } catch {
          ai_technologies = [];
        }
      }

      return {
        ...row,
        ai_employment,
        ai_technologies,
        ai_remote: !!row.ai_remote,
        is_approved: !!row.is_approved,
        is_rejected: !!row.is_rejected
      };
    });
  }

  async getVacancyByExternalId(externalId: string): Promise<VacancyRecord> {
    const stmt = this.db.prepare('SELECT * FROM vacancies WHERE external_id = ?');
    const row = stmt.get(externalId) as any;
    
    if (!row) {
      throw new Error(`Вакансия с external_id ${externalId} не найдена`);
    }

    return {
      ...row,
      ai_employment: JSON.parse(row.ai_employment),
      ai_technologies: JSON.parse(row.ai_technologies),
      ai_remote: Boolean(row.ai_remote)
    };
  }

  deleteVacanciesBySource(source: string): number {
    try {
      const stmt = this.db.prepare('DELETE FROM vacancies WHERE source = ?');
      const result = stmt.run(source);
      console.log(`🗑️ Удалено ${result.changes} вакансий из источника ${source}`);
      return result.changes;
    } catch (error) {
      console.error(`❌ Ошибка при удалении вакансий из источника ${source}:`, error);
      return 0;
    }
  }

  // Методы для работы с пользователями
  createUser(userData: {
    email: string;
    name: string;
    password?: string;
    image?: string;
    provider: string;
    providerId?: string;
  }): UserRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, password, image, provider, provider_id, created_at, updated_at, last_login, is_active, preferences)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      userData.email,
      userData.name,
      userData.password || null,
      userData.image || null,
      userData.provider,
      userData.providerId || null,
      now,
      now,
      now,
      1, // true as integer
      '{}'
    );

    return this.getUserById(id);
  }

  getUserById(id: string): UserRecord {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      throw new Error(`Пользователь с id ${id} не найден`);
    }

    return {
      ...row,
      preferences: row.preferences ? JSON.parse(row.preferences) : {}
    };
  }

  getUserByEmail(email: string): UserRecord | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email) as any;

    if (!row) {
      return null;
    }

    return {
      ...row,
      preferences: row.preferences ? JSON.parse(row.preferences) : {}
    };
  }

  updateUser(id: string, updateData: {
    name?: string;
    image?: string;
    provider?: string;
    providerId?: string;
    lastLogin?: string;
    preferences?: any;
  }): UserRecord {
    const now = new Date().toISOString();
    const setClause = [];
    const values = [];
    
    if (updateData.name !== undefined) {
      setClause.push('name = ?');
      values.push(updateData.name);
    }
    if (updateData.image !== undefined) {
      setClause.push('image = ?');
      values.push(updateData.image);
    }
    if (updateData.provider !== undefined) {
      setClause.push('provider = ?');
      values.push(updateData.provider);
    }
    if (updateData.providerId !== undefined) {
      setClause.push('provider_id = ?');
      values.push(updateData.providerId);
    }
    if (updateData.lastLogin !== undefined) {
      setClause.push('last_login = ?');
      values.push(updateData.lastLogin);
    }
    if (updateData.preferences !== undefined) {
      setClause.push('preferences = ?');
      values.push(JSON.stringify(updateData.preferences));
    }
    
    setClause.push('updated_at = ?');
    values.push(now);
    values.push(id);
    
    const stmt = this.db.prepare(`
      UPDATE users 
      SET ${setClause.join(', ')} 
      WHERE id = ?
    `);
    
    stmt.run(...values);
    
    return this.getUserById(id);
  }

  updateUserLastLogin(id: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE users
      SET last_login = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(now, now, id);
  }

  getAllUsers(): UserRecord[] {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      ...row,
      preferences: row.preferences ? JSON.parse(row.preferences) : {}
    }));
  }

  deleteUser(id: string): boolean {
    try {
      const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
      const result = stmt.run(id);
      return result.changes > 0;
    } catch (error) {
      console.error(`❌ Ошибка при удалении пользователя ${id}:`, error);
      return false;
    }
  }

  // Методы для работы с комментариями
  createComment(vacancyId: number, userId: string, content: string, parentId?: string): string {
    const id = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO comments (id, vacancy_id, user_id, content, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, vacancyId, userId, content, parentId || null, now, now);
    return id;
  }

  getCommentsByVacancyId(vacancyId: number): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        c.*,
        u.name as user_name,
        u.email as user_email
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.vacancy_id = ?
      ORDER BY c.created_at ASC
    `);

    return stmt.all(vacancyId);
  }

  updateCommentReactions(commentId: string, likes: number, dislikes: number): void {
    const stmt = this.db.prepare(`
      UPDATE comments 
      SET likes = ?, dislikes = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(likes, dislikes, new Date().toISOString(), commentId);
  }

  addCommentReaction(commentId: string, userId: string, reactionType: 'like' | 'dislike'): void {
    const id = `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Сначала удаляем существующую реакцию пользователя
    const deleteStmt = this.db.prepare(`
      DELETE FROM comment_reactions 
      WHERE comment_id = ? AND user_id = ?
    `);
    deleteStmt.run(commentId, userId);

    // Добавляем новую реакцию
    const insertStmt = this.db.prepare(`
      INSERT INTO comment_reactions (id, comment_id, user_id, reaction_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertStmt.run(id, commentId, userId, reactionType, now);

    // Обновляем счетчики в таблице комментариев
    this.updateCommentCounters(commentId);
  }

  private updateCommentCounters(commentId: string): void {
    const likesStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM comment_reactions 
      WHERE comment_id = ? AND reaction_type = 'like'
    `);
    const dislikesStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM comment_reactions 
      WHERE comment_id = ? AND reaction_type = 'dislike'
    `);

    const likes = likesStmt.get(commentId) as { count: number };
    const dislikes = dislikesStmt.get(commentId) as { count: number };

    this.updateCommentReactions(commentId, likes.count, dislikes.count);
  }

  deleteComment(commentId: string, userId: string): boolean {
    try {
      // Проверяем, что пользователь является автором комментария
      const checkStmt = this.db.prepare('SELECT user_id FROM comments WHERE id = ?');
      const comment = checkStmt.get(commentId) as { user_id: string };

      if (!comment || comment.user_id !== userId) {
        return false;
      }

      // Удаляем комментарий (каскадное удаление удалит реакции и ответы)
      const stmt = this.db.prepare('DELETE FROM comments WHERE id = ?');
      const result = stmt.run(commentId);
      return result.changes > 0;
    } catch (error) {
      console.error('Ошибка удаления комментария:', error);
      return false;
    }
  }

  // Метод для аутентификации по email и паролю
  async authenticateUser(email: string, password: string): Promise<UserRecord | null> {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE email = ? AND password IS NOT NULL');
      const row = stmt.get(email) as any;

      if (!row) {
        return null;
      }

      // Проверяем пароль
      const isValidPassword = await bcrypt.compare(password, row.password);

      if (!isValidPassword) {
        return null;
      }

      // Обновляем время последнего входа
      this.updateUserLastLogin(row.id);

      return {
        ...row,
        preferences: row.preferences ? JSON.parse(row.preferences) : {}
      };
    } catch (error) {
      console.error(`❌ Ошибка при аутентификации пользователя ${email}:`, error);
      return null;
    }
  }

  close(): void {
    this.db.close();
  }
}

