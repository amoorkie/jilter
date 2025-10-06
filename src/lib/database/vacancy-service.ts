import { Pool, PoolClient } from 'pg';
import { Employment, Specialization } from '@/lib/types/employment';

// Интерфейсы для работы с БД
export interface VacancyRecord {
  id: number;
  external_id: string;
  title: string;
  description: string;
  company: string;
  location: string;
  url: string;
  source: string;
  published_at: Date;
  created_at: Date;
  updated_at: Date;
  
  // AI-анализ
  ai_specialization: Specialization;
  ai_employment: Employment[];
  ai_experience: 'junior' | 'middle' | 'senior' | 'lead';
  ai_technologies: string[];
  ai_salary_min?: number;
  ai_salary_max?: number;
  ai_salary_currency: string;
  ai_remote: boolean;
  ai_requirements: string[];
  ai_benefits: string[];
  ai_relevance_score: number;
  ai_summary: string;
  
  is_active: boolean;
  last_parsed_at: Date;
}

export interface SearchFilters {
  specialization?: Specialization[];
  employment?: Employment[];
  experience?: string[];
  technologies?: string[];
  minSalary?: number;
  maxSalary?: number;
  remote?: boolean;
  sources?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  vacancies: VacancyRecord[];
  total: number;
  hasMore: boolean;
}

// Пул соединений с БД
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/job_filter',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // Устанавливаем кодировку клиента в UTF-8
  client_encoding: 'UTF8',
});

export class VacancyService {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  /**
   * Сохраняет вакансию в БД
   */
  async saveVacancy(vacancy: Omit<VacancyRecord, 'id' | 'created_at' | 'updated_at'>): Promise<VacancyRecord> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO vacancies (
          external_id, title, description, company, location, url, source, published_at,
          ai_specialization, ai_employment, ai_experience, ai_technologies,
          ai_salary_min, ai_salary_max, ai_salary_currency, ai_remote,
          ai_requirements, ai_benefits, ai_relevance_score, ai_summary,
          is_active, last_parsed_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        )
        ON CONFLICT (external_id) DO NOTHING
        RETURNING *
      `;

      const values = [
        vacancy.external_id,
        vacancy.title,
        vacancy.description,
        vacancy.company,
        vacancy.location,
        vacancy.url,
        vacancy.source,
        vacancy.published_at,
        vacancy.ai_specialization,
        vacancy.ai_employment,
        vacancy.ai_experience,
        vacancy.ai_technologies,
        vacancy.ai_salary_min,
        vacancy.ai_salary_max,
        vacancy.ai_salary_currency,
        vacancy.ai_remote,
        vacancy.ai_requirements,
        vacancy.ai_benefits,
        vacancy.ai_relevance_score,
        vacancy.ai_summary,
        vacancy.is_active,
        vacancy.last_parsed_at
      ];

      const result = await client.query(query, values);
      return result.rows[0] as VacancyRecord;
      
    } finally {
      client.release();
    }
  }

  /**
   * Поиск вакансий с фильтрами
   */
  async searchVacancies(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    const client = await this.pool.connect();
    
    try {
      console.log('🔍 vacancyService.searchVacancies вызван с:', { query, filters });
      
      const {
        specialization,
        employment,
        experience,
        technologies,
        minSalary,
        maxSalary,
        remote,
        sources,
        limit = 50,
        offset = 0
      } = filters;

      // Построение WHERE условий
      const conditions: string[] = ['is_active = TRUE'];
      const values: any[] = [];
      let paramIndex = 1;

      // Простой поиск по названию и компании (без учета кодировки)
      if (query.trim()) {
        // Ищем по любому тексту, который содержит запрос
        conditions.push(`(title ILIKE $${paramIndex} OR company ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${query}%`);
        paramIndex += 1;
      }

      // Фильтр по специализации
      if (specialization && specialization.length > 0) {
        conditions.push(`ai_specialization = ANY($${paramIndex})`);
        values.push(specialization);
        paramIndex++;
      }

      // Фильтр по типу занятости
      if (employment && employment.length > 0) {
        conditions.push(`ai_employment && $${paramIndex}`);
        values.push(employment);
        paramIndex++;
      }

      // Фильтр по опыту
      if (experience && experience.length > 0) {
        conditions.push(`ai_experience = ANY($${paramIndex})`);
        values.push(experience);
        paramIndex++;
      }

      // Фильтр по технологиям
      if (technologies && technologies.length > 0) {
        conditions.push(`ai_technologies && $${paramIndex}`);
        values.push(technologies);
        paramIndex++;
      }

      // Фильтр по зарплате
      if (minSalary !== undefined) {
        conditions.push(`(ai_salary_min >= $${paramIndex} OR ai_salary_max >= $${paramIndex})`);
        values.push(minSalary);
        paramIndex++;
      }

      if (maxSalary !== undefined) {
        conditions.push(`(ai_salary_max <= $${paramIndex} OR ai_salary_min <= $${paramIndex})`);
        values.push(maxSalary);
        paramIndex++;
      }

      // Фильтр по удаленной работе
      if (remote !== undefined) {
        conditions.push(`ai_remote = $${paramIndex}`);
        values.push(remote);
        paramIndex++;
      }

      // Фильтр по источникам
      if (sources && sources.length > 0) {
        conditions.push(`source = ANY($${paramIndex})`);
        values.push(sources);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Отладочная информация
      console.log('🔍 Условия поиска:', { conditions, values, whereClause });

      // Запрос для подсчета общего количества
      const countQuery = `
        SELECT COUNT(*) as total
        FROM vacancies
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Основной запрос с сортировкой
      const searchQuery = `
        SELECT *
        FROM vacancies
        ${whereClause}
        ORDER BY 
          ai_relevance_score DESC,
          published_at DESC,
          created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const searchResult = await client.query(searchQuery, values);
      
      console.log('🔍 Поиск завершен:', {
        query,
        total,
        found: searchResult.rows.length,
        conditions: conditions.join(' AND '),
        values
      });

      return {
        vacancies: searchResult.rows as VacancyRecord[],
        total,
        hasMore: offset + limit < total
      };

    } finally {
      client.release();
    }
  }

  /**
   * Получает вакансию по ID
   */
  async getVacancyById(id: number): Promise<VacancyRecord | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM vacancies WHERE id = $1 AND is_active = TRUE';
      const result = await client.query(query, [id]);
      
      return result.rows[0] as VacancyRecord || null;
    } finally {
      client.release();
    }
  }

  /**
   * Получает статистику по источникам
   */
  async getSourceStats(): Promise<Array<{ source: string; count: number; last_parsed: Date }>> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          source,
          COUNT(*) as count,
          MAX(last_parsed_at) as last_parsed
        FROM vacancies 
        WHERE is_active = TRUE
        GROUP BY source
        ORDER BY count DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Получает популярные технологии
   */
  async getPopularTechnologies(limit: number = 20): Promise<Array<{ technology: string; count: number }>> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          unnest(ai_technologies) as technology,
          COUNT(*) as count
        FROM vacancies 
        WHERE is_active = TRUE AND ai_technologies IS NOT NULL
        GROUP BY technology
        ORDER BY count DESC
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Получает статистику по специализациям
   */
  async getSpecializationStats(): Promise<Array<{ specialization: string; count: number }>> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          ai_specialization as specialization,
          COUNT(*) as count
        FROM vacancies 
        WHERE is_active = TRUE AND ai_specialization IS NOT NULL
        GROUP BY ai_specialization
        ORDER BY count DESC
      `;
      
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Очищает старые вакансии
   */
  async cleanupOldVacancies(daysOld: number = 30): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE vacancies 
        SET is_active = FALSE 
        WHERE created_at < NOW() - INTERVAL '${daysOld} days'
        AND is_active = TRUE
      `;
      
      const result = await client.query(query);
      return result.rowCount || 0;
    } finally {
      client.release();
    }
  }

  /**
   * Получает количество активных вакансий
   */
  async getActiveVacanciesCount(): Promise<number> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT COUNT(*) as count FROM vacancies WHERE is_active = TRUE';
      const result = await client.query(query);
      
      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  /**
   * Закрывает соединение с БД
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Экспорт экземпляра сервиса
export const vacancyService = new VacancyService();
