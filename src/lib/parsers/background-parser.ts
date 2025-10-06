import { vacancyService, VacancyRecord } from '@/lib/database/vacancy-service';
import { analyzeVacancy } from '@/lib/ai/gemini-service';
import { parseAllVacancies } from './unified-parser';
import { Employment, Specialization } from '@/lib/types/employment';

// Интерфейс для статистики парсинга
export interface ParsingStats {
  source: string;
  query: string;
  vacanciesFound: number;
  vacanciesParsed: number;
  aiAnalysisSuccess: number;
  aiAnalysisFailed: number;
  parsingDurationMs: number;
  startedAt: Date;
  completedAt: Date;
}

// Интерфейс для конфигурации парсинга
export interface ParsingConfig {
  queries: string[];
  maxPages: number;
  aiEnabled: boolean;
  batchSize: number;
  delayBetweenBatches: number; // в миллисекундах
}

export class BackgroundParser {
  private isRunning: boolean = false;
  private stats: ParsingStats[] = [];

  constructor() {
    this.isRunning = false;
  }

  /**
   * Запускает фоновый парсинг всех источников
   */
  async startBackgroundParsing(config: ParsingConfig): Promise<ParsingStats[]> {
    if (this.isRunning) {
      console.log('⚠️ Парсинг уже запущен');
      return this.stats;
    }

    this.isRunning = true;
    this.stats = [];

    console.log('🚀 Запуск фонового парсинга...');

    try {
      // Парсим каждый запрос
      for (const query of config.queries) {
        console.log(`📋 Парсинг запроса: "${query}"`);
        
        const startTime = Date.now();
        const stats: ParsingStats = {
          source: 'all',
          query,
          vacanciesFound: 0,
          vacanciesParsed: 0,
          aiAnalysisSuccess: 0,
          aiAnalysisFailed: 0,
          parsingDurationMs: 0,
          startedAt: new Date(),
          completedAt: new Date()
        };

        try {
          // Парсим вакансии
          const rawVacancies = await parseAllVacancies(query, config.maxPages);
          stats.vacanciesFound = rawVacancies.length;
          
          console.log(`📊 Найдено ${rawVacancies.length} вакансий для запроса: "${query}"`);

          // Обрабатываем вакансии батчами
          const batches = this.createBatches(rawVacancies, config.batchSize);
          
          for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`🔄 Обработка батча ${i + 1}/${batches.length} (${batch.length} вакансий)`);
            
            await this.processBatch(batch, config.aiEnabled, stats);
            
            // Задержка между батчами
            if (i < batches.length - 1) {
              await this.delay(config.delayBetweenBatches);
            }
          }

          stats.completedAt = new Date();
          stats.parsingDurationMs = Date.now() - startTime;
          
          console.log(`✅ Запрос "${query}" обработан за ${stats.parsingDurationMs}ms`);
          console.log(`📈 Статистика: найдено ${stats.vacanciesFound}, обработано ${stats.vacanciesParsed}, AI успешно ${stats.aiAnalysisSuccess}, AI ошибок ${stats.aiAnalysisFailed}`);
          
        } catch (error) {
          console.error(`❌ Ошибка парсинга запроса "${query}":`, error);
          stats.completedAt = new Date();
          stats.parsingDurationMs = Date.now() - startTime;
        }

        this.stats.push(stats);
        
        // Задержка между запросами
        if (query !== config.queries[config.queries.length - 1]) {
          await this.delay(config.delayBetweenBatches);
        }
      }

      console.log('🎉 Фоновый парсинг завершен!');
      return this.stats;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Обрабатывает батч вакансий
   */
  private async processBatch(
    vacancies: any[],
    aiEnabled: boolean,
    stats: ParsingStats
  ): Promise<void> {
    const promises = vacancies.map(async (vacancy) => {
      try {
        let aiAnalysis;
        
        if (aiEnabled) {
          // AI-анализ вакансии
          aiAnalysis = await analyzeVacancy(
            vacancy.title,
            vacancy.description,
            vacancy.company
          );
          stats.aiAnalysisSuccess++;
        } else {
          // Fallback анализ
          aiAnalysis = this.getFallbackAnalysis(vacancy);
        }

        // Создаем запись для БД
        const vacancyRecord: Omit<VacancyRecord, 'id' | 'created_at' | 'updated_at'> = {
          external_id: vacancy.id || `${vacancy.source}_${Date.now()}_${Math.random()}`,
          title: vacancy.title,
          description: vacancy.description,
          company: vacancy.company,
          location: vacancy.location || '',
          url: vacancy.url,
          source: vacancy.source,
          published_at: vacancy.publishedAt ? new Date(vacancy.publishedAt) : new Date(),
          
          // AI-анализ
          ai_specialization: aiAnalysis.specialization,
          ai_employment: aiAnalysis.employment,
          ai_experience: aiAnalysis.experience,
          ai_technologies: aiAnalysis.technologies,
          ai_salary_min: aiAnalysis.salary.min,
          ai_salary_max: aiAnalysis.salary.max,
          ai_salary_currency: aiAnalysis.salary.currency,
          ai_remote: aiAnalysis.remote,
          ai_requirements: aiAnalysis.requirements,
          ai_benefits: aiAnalysis.benefits,
          ai_relevance_score: aiAnalysis.relevanceScore,
          ai_summary: aiAnalysis.summary,
          
          is_active: true,
          last_parsed_at: new Date()
        };

        // Сохраняем в БД
        await vacancyService.saveVacancy(vacancyRecord);
        stats.vacanciesParsed++;

      } catch (error) {
        console.error(`❌ Ошибка обработки вакансии ${vacancy.title}:`, error);
        stats.aiAnalysisFailed++;
      }
    });

    await Promise.all(promises);
  }

  /**
   * Создает батчи из массива
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Задержка выполнения
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fallback анализ вакансии
   */
  private getFallbackAnalysis(vacancy: any): any {
    return {
      specialization: 'other' as Specialization,
      employment: ['full_time' as Employment],
      experience: 'middle' as const,
      technologies: [],
      salary: { currency: 'RUB' },
      remote: false,
      requirements: [],
      benefits: [],
      relevanceScore: 50,
      summary: 'Анализ недоступен'
    };
  }

  /**
   * Получает статистику парсинга
   */
  getStats(): ParsingStats[] {
    return this.stats;
  }

  /**
   * Проверяет, запущен ли парсинг
   */
  isParsingRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Останавливает парсинг
   */
  stopParsing(): void {
    this.isRunning = false;
    console.log('⏹️ Парсинг остановлен');
  }
}

// Экспорт экземпляра парсера
export const backgroundParser = new BackgroundParser();



