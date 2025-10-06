// Система мониторинга и планировщик задач
import { parseAllDesignVacancies } from '../parsers/enhanced-parser';
import { analyzeVacancyWithDeepSeek } from '../ai/deepseek-service';
import { SQLiteService } from '../database/sqlite-service';

export interface MonitoringConfig {
  // Интервалы мониторинга (в миллисекундах)
  fullScanInterval: number; // Полный парсинг (например, 4 часа)
  quickScanInterval: number; // Быстрый парсинг (например, 1 час)
  
  // Лимиты парсинга
  maxVacanciesPerSource: number;
  maxTotalVacancies: number;
  
  // Настройки AI анализа
  enableAIAnalysis: boolean;
  aiAnalysisBatchSize: number;
  
  // Настройки уведомлений
  enableNotifications: boolean;
  notificationThreshold: number; // Минимальное количество новых вакансий для уведомления
}

const DEFAULT_CONFIG: MonitoringConfig = {
  fullScanInterval: 4 * 60 * 60 * 1000, // 4 часа
  quickScanInterval: 60 * 60 * 1000, // 1 час
  maxVacanciesPerSource: 50,
  maxTotalVacancies: 200,
  enableAIAnalysis: true,
  aiAnalysisBatchSize: 10,
  enableNotifications: true,
  notificationThreshold: 5
};

export class VacancyMonitor {
  private config: MonitoringConfig;
  private isRunning: boolean = false;
  private intervals: NodeJS.Timeout[] = [];
  private db: SQLiteService;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.db = new SQLiteService();
  }

  /**
   * Запуск мониторинга
   */
  public start(): void {
    if (this.isRunning) {
      console.log('⚠️ Мониторинг уже запущен');
      return;
    }

    console.log('🚀 Запуск системы мониторинга вакансий');
    console.log(`📊 Конфигурация:`, this.config);

    this.isRunning = true;

    // Полный парсинг каждые 4 часа
    const fullScanInterval = setInterval(() => {
      this.performFullScan();
    }, this.config.fullScanInterval);

    // Быстрый парсинг каждый час
    const quickScanInterval = setInterval(() => {
      this.performQuickScan();
    }, this.config.quickScanInterval);

    this.intervals.push(fullScanInterval, quickScanInterval);

    // Запускаем первый полный парсинг сразу
    this.performFullScan();

    console.log('✅ Мониторинг запущен');
  }

  /**
   * Остановка мониторинга
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Мониторинг не запущен');
      return;
    }

    console.log('🛑 Остановка системы мониторинга');
    
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.isRunning = false;

    console.log('✅ Мониторинг остановлен');
  }

  /**
   * Полный парсинг всех источников
   */
  private async performFullScan(): Promise<void> {
    console.log('\n🔍 Начинаем полный парсинг всех источников');
    const startTime = Date.now();

    try {
      // Парсим вакансии со всех источников
      const vacancies = await parseAllDesignVacancies(this.config.maxTotalVacancies);
      console.log(`📊 Получено ${vacancies.length} вакансий`);

      if (vacancies.length === 0) {
        console.log('⚠️ Новых вакансий не найдено');
        return;
      }

      // Анализируем вакансии с помощью AI
      if (this.config.enableAIAnalysis) {
        await this.analyzeVacanciesWithAI(vacancies);
      }

      // Сохраняем в базу данных
      await this.saveVacanciesToDatabase(vacancies);

      const duration = Date.now() - startTime;
      console.log(`✅ Полный парсинг завершен за ${Math.round(duration / 1000)}с`);

      // Отправляем уведомления если нужно
      if (this.config.enableNotifications && vacancies.length >= this.config.notificationThreshold) {
        await this.sendNotification(vacancies.length);
      }

    } catch (error) {
      console.error('❌ Ошибка полного парсинга:', error);
    }
  }

  /**
   * Быстрый парсинг (только основные источники)
   */
  private async performQuickScan(): Promise<void> {
    console.log('\n⚡ Быстрый парсинг основных источников');
    const startTime = Date.now();

    try {
      // Парсим только с основных источников
      const { parseHHVacancies } = await import('../parsers/hh/parser');
      const { parseHabrVacancies } = await import('../parsers/habr/parser');
      
      const [hhVacancies, habrVacancies] = await Promise.all([
        parseHHVacancies('дизайнер', 1).catch(() => []),
        parseHabrVacancies('дизайнер', 1).catch(() => [])
      ]);

      const vacancies = [...hhVacancies, ...habrVacancies];
      console.log(`📊 Быстрый парсинг: ${vacancies.length} вакансий`);

      if (vacancies.length > 0) {
        // Сохраняем только новые вакансии
        await this.saveNewVacanciesOnly(vacancies);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Быстрый парсинг завершен за ${Math.round(duration / 1000)}с`);

    } catch (error) {
      console.error('❌ Ошибка быстрого парсинга:', error);
    }
  }

  /**
   * AI анализ вакансий
   */
  private async analyzeVacanciesWithAI(vacancies: any[]): Promise<void> {
    console.log(`🤖 Запускаем AI анализ ${vacancies.length} вакансий`);
    
    const batchSize = this.config.aiAnalysisBatchSize;
    const batches = [];
    
    for (let i = 0; i < vacancies.length; i += batchSize) {
      batches.push(vacancies.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 Обрабатываем батч ${i + 1}/${batches.length} (${batch.length} вакансий)`);
      
      await Promise.all(batch.map(async (vacancy) => {
        try {
          const analysis = await analyzeVacancyWithDeepSeek(
            vacancy.title,
            vacancy.description || '',
            vacancy.company
          );
          
          // Добавляем AI анализ к вакансии
          vacancy.aiAnalysis = analysis;
        } catch (error) {
          console.error(`❌ Ошибка AI анализа для вакансии ${vacancy.id}:`, error);
        }
      }));

      // Небольшая пауза между батчами
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ AI анализ завершен`);
  }

  /**
   * Сохранение вакансий в базу данных
   */
  private async saveVacanciesToDatabase(vacancies: any[]): Promise<void> {
    console.log(`💾 Сохраняем ${vacancies.length} вакансий в базу данных`);
    
    let savedCount = 0;
    let skippedCount = 0;

    for (const vacancy of vacancies) {
      try {
        const vacancyData = {
          external_id: vacancy.id,
          source: vacancy.source,
          url: vacancy.url,
          title: vacancy.title,
          company: vacancy.company,
          location: vacancy.location || '',
          description: vacancy.description || '',
          published_at: new Date(vacancy.publishedAt || new Date()).toISOString(),
          ai_specialization: vacancy.aiAnalysis?.specialization || 'design',
          ai_employment: JSON.stringify(vacancy.aiAnalysis?.employment || ['full_time']),
          ai_experience: vacancy.aiAnalysis?.experience || 'middle',
          ai_technologies: JSON.stringify(vacancy.aiAnalysis?.technologies || []),
          ai_salary_min: vacancy.aiAnalysis?.salary?.min,
          ai_salary_max: vacancy.aiAnalysis?.salary?.max,
          ai_salary_currency: vacancy.aiAnalysis?.salary?.currency || 'RUB',
          ai_remote: vacancy.aiAnalysis?.remote || false,
          ai_relevance_score: vacancy.aiAnalysis?.relevanceScore || 0,
          ai_summary: vacancy.aiAnalysis?.summary || '',
          is_approved: false,
          is_rejected: false,
          moderation_notes: '',
          moderated_at: undefined,
          moderated_by: ''
        };

        await this.db.saveVacancy(vacancyData);
        savedCount++;
      } catch (error) {
        if (error.message?.includes('UNIQUE constraint failed')) {
          skippedCount++;
        } else {
          console.error(`❌ Ошибка сохранения вакансии ${vacancy.id}:`, error);
        }
      }
    }

    console.log(`✅ Сохранено: ${savedCount}, пропущено: ${skippedCount}`);
  }

  /**
   * Сохранение только новых вакансий
   */
  private async saveNewVacanciesOnly(vacancies: any[]): Promise<void> {
    console.log(`💾 Проверяем новые вакансии из ${vacancies.length}`);
    
    let newCount = 0;
    
    for (const vacancy of vacancies) {
      try {
        // Проверяем, есть ли уже такая вакансия
        const existing = await this.db.getVacancies('', 'design', [], '', undefined, undefined, undefined, 1, 0);
        const exists = existing.vacancies.some(v => v.url === vacancy.url);
        
        if (!exists) {
          const vacancyData = {
            external_id: vacancy.id,
            source: vacancy.source,
            url: vacancy.url,
            title: vacancy.title,
            company: vacancy.company,
            location: vacancy.location || '',
            description: vacancy.description || '',
            published_at: new Date(vacancy.publishedAt || new Date()).toISOString(),
            ai_specialization: 'design',
            ai_employment: JSON.stringify(['full_time']),
            ai_experience: 'middle',
            ai_technologies: JSON.stringify([]),
            ai_salary_min: undefined,
            ai_salary_max: undefined,
            ai_salary_currency: 'RUB',
            ai_remote: false,
            ai_relevance_score: 0,
            ai_summary: '',
            is_approved: false,
            is_rejected: false,
            moderation_notes: '',
            moderated_at: undefined,
            moderated_by: ''
          };

          await this.db.saveVacancy(vacancyData);
          newCount++;
        }
      } catch (error) {
        console.error(`❌ Ошибка проверки вакансии ${vacancy.id}:`, error);
      }
    }

    console.log(`✅ Новых вакансий: ${newCount}`);
  }

  /**
   * Отправка уведомлений
   */
  private async sendNotification(vacancyCount: number): Promise<void> {
    console.log(`📢 Отправляем уведомление: найдено ${vacancyCount} новых вакансий`);
    
    // Здесь можно добавить интеграцию с Telegram, email, Slack и т.д.
    // Пока просто логируем
    console.log(`📧 Уведомление: Найдено ${vacancyCount} новых дизайнерских вакансий для модерации`);
  }

  /**
   * Получение статистики мониторинга
   */
  public async getStats(): Promise<any> {
    try {
      // Простая статистика без обращения к базе данных
      return {
        isRunning: this.isRunning,
        totalVacancies: 0,
        pendingVacancies: 0,
        approvedVacancies: 0,
        config: this.config,
        message: 'Мониторинг активен'
      };
    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error);
      return {
        isRunning: this.isRunning,
        totalVacancies: 0,
        pendingVacancies: 0,
        approvedVacancies: 0,
        config: this.config,
        error: error.message
      };
    }
  }
}

// Экспорт синглтона
export const vacancyMonitor = new VacancyMonitor();
