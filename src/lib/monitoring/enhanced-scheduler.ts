// Улучшенная система мониторинга и планировщик задач
import { spawn } from 'child_process';
import path from 'path';
import { SQLiteService } from '../database/sqlite-service';

export interface EnhancedMonitoringConfig {
  // Интервалы мониторинга (в миллисекундах)
  fullScanInterval: number; // Полный парсинг (например, 4 часа)
  quickScanInterval: number; // Быстрый парсинг (например, 1 час)
  healthCheckInterval: number; // Проверка здоровья системы (например, 15 минут)
  
  // Лимиты парсинга
  maxPagesPerSource: number;
  maxVacanciesPerRun: number;
  
  // Настройки парсинга
  enableCaching: boolean;
  cacheTimeoutMinutes: number;
  enablePlaywright: boolean; // Использовать Playwright для HH.ru
  
  // Настройки мониторинга
  enableHealthMonitoring: boolean;
  alertThresholds: {
    maxResponseTime: number; // максимальное время ответа в секундах
    minSuccessRate: number; // минимальный процент успешных запросов
    maxConsecutiveFailures: number; // максимальное количество неудач подряд
  };
  
  // Настройки уведомлений
  enableNotifications: boolean;
  notificationThreshold: number; // Минимальное количество новых вакансий для уведомления
  
  // Источники для парсинга
  enabledSources: string[];
}

const DEFAULT_ENHANCED_CONFIG: EnhancedMonitoringConfig = {
  fullScanInterval: 4 * 60 * 60 * 1000, // 4 часа
  quickScanInterval: 60 * 60 * 1000, // 1 час
  healthCheckInterval: 15 * 60 * 1000, // 15 минут
  maxPagesPerSource: 3,
  maxVacanciesPerRun: 200,
  enableCaching: true,
  cacheTimeoutMinutes: 30,
  enablePlaywright: false,
  enableHealthMonitoring: true,
  alertThresholds: {
    maxResponseTime: 10.0,
    minSuccessRate: 80.0,
    maxConsecutiveFailures: 5
  },
  enableNotifications: true,
  notificationThreshold: 5,
  enabledSources: ['habr', 'hh']
};

export interface ParsingStats {
  runtime: number;
  totalFound: number;
  totalSaved: number;
  totalFiltered: number;
  totalCached: number;
  successRate: number;
  bySource: Record<string, {
    found: number;
    saved: number;
    filtered: number;
    avgQuality: number;
  }>;
  cacheStats: {
    hitRatio: number;
    activeEntries: number;
    cacheSize: number;
  };
  healthStatus: {
    overallStatus: string;
    activeAlerts: number;
    successRate: number;
  };
}

export class EnhancedVacancyMonitor {
  private config: EnhancedMonitoringConfig;
  private isRunning: boolean = false;
  private intervals: NodeJS.Timeout[] = [];
  private db: SQLiteService;
  private lastHealthCheck: Date | null = null;
  private consecutiveFailures: number = 0;

  constructor(config: Partial<EnhancedMonitoringConfig> = {}) {
    this.config = { ...DEFAULT_ENHANCED_CONFIG, ...config };
    this.db = new SQLiteService();
  }

  /**
   * Запуск улучшенного мониторинга
   */
  public start(): void {
    if (this.isRunning) {
      console.log('⚠️ Улучшенный мониторинг уже запущен');
      return;
    }

    console.log('🚀 Запуск улучшенной системы мониторинга вакансий');
    console.log(`📊 Конфигурация:`, {
      ...this.config,
      enabledSources: this.config.enabledSources.join(', '),
      caching: this.config.enableCaching ? `${this.config.cacheTimeoutMinutes}min` : 'disabled',
      playwright: this.config.enablePlaywright ? 'enabled' : 'disabled'
    });

    this.isRunning = true;

    // Полный парсинг каждые 4 часа
    const fullScanInterval = setInterval(() => {
      this.performEnhancedFullScan();
    }, this.config.fullScanInterval);

    // Быстрый парсинг каждый час
    const quickScanInterval = setInterval(() => {
      this.performEnhancedQuickScan();
    }, this.config.quickScanInterval);

    // Проверка здоровья системы каждые 15 минут
    const healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    this.intervals.push(fullScanInterval, quickScanInterval, healthCheckInterval);

    // Запускаем первую проверку здоровья и полный парсинг
    this.performHealthCheck();
    setTimeout(() => this.performEnhancedFullScan(), 5000); // Через 5 секунд

    console.log('✅ Улучшенный мониторинг запущен');
  }

  /**
   * Остановка мониторинга
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Мониторинг не запущен');
      return;
    }

    console.log('🛑 Остановка улучшенной системы мониторинга');
    
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.isRunning = false;

    console.log('✅ Улучшенный мониторинг остановлен');
  }

  /**
   * Улучшенный полный парсинг с использованием Python системы
   */
  private async performEnhancedFullScan(): Promise<void> {
    console.log('\n🔍 Начинаем улучшенный полный парсинг всех источников');
    const startTime = Date.now();

    try {
      const stats = await this.runUltimateParser({
        query: 'дизайнер',
        pages: this.config.maxPagesPerSource,
        sources: this.config.enabledSources,
        extractDetails: true,
        usePlaywright: this.config.enablePlaywright,
        cacheTtl: this.config.cacheTimeoutMinutes * 60
      });

      if (stats.error) {
        throw new Error(stats.error);
      }

      console.log(`📊 Результаты полного парсинга:`);
      console.log(`   Найдено: ${stats.totalFound}`);
      console.log(`   Сохранено: ${stats.totalSaved}`);
      console.log(`   Отфильтровано: ${stats.totalFiltered}`);
      console.log(`   Успешность: ${stats.successRate}%`);
      console.log(`   Время: ${stats.runtime}с`);

      // Сбрасываем счетчик неудач при успешном парсинге
      this.consecutiveFailures = 0;

      // Отправляем уведомления если нужно
      if (this.config.enableNotifications && stats.totalSaved >= this.config.notificationThreshold) {
        await this.sendEnhancedNotification(stats);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Улучшенный полный парсинг завершен за ${Math.round(duration / 1000)}с`);

    } catch (error) {
      this.consecutiveFailures++;
      console.error('❌ Ошибка улучшенного полного парсинга:', error.message);
      
      // Проверяем пороги для алертов
      if (this.consecutiveFailures >= this.config.alertThresholds.maxConsecutiveFailures) {
        await this.sendAlert('consecutive_failures', `${this.consecutiveFailures} consecutive parsing failures`);
      }
    }
  }

  /**
   * Улучшенный быстрый парсинг
   */
  private async performEnhancedQuickScan(): Promise<void> {
    console.log('\n⚡ Улучшенный быстрый парсинг основных источников');
    const startTime = Date.now();

    try {
      const stats = await this.runUltimateParser({
        query: 'дизайнер',
        pages: 1, // Только первая страница для быстрого парсинга
        sources: ['habr'], // Только самый быстрый источник
        extractDetails: false, // Без детального извлечения для скорости
        usePlaywright: false,
        cacheTtl: this.config.cacheTimeoutMinutes * 60
      });

      if (stats.error) {
        throw new Error(stats.error);
      }

      console.log(`📊 Быстрый парсинг: найдено ${stats.totalFound}, сохранено ${stats.totalSaved}`);

      const duration = Date.now() - startTime;
      console.log(`✅ Улучшенный быстрый парсинг завершен за ${Math.round(duration / 1000)}с`);

    } catch (error) {
      console.error('❌ Ошибка улучшенного быстрого парсинга:', error.message);
    }
  }

  /**
   * Проверка здоровья системы
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.config.enableHealthMonitoring) {
      return;
    }

    console.log('\n🏥 Проверка здоровья системы парсинга');
    
    try {
      // Запускаем проверку здоровья через Python систему
      const healthStats = await this.getSystemHealth();
      
      this.lastHealthCheck = new Date();
      
      console.log(`🏥 Статус системы: ${healthStats.overallStatus}`);
      console.log(`📊 Успешность: ${healthStats.successRate}%`);
      console.log(`⚠️  Активных алертов: ${healthStats.activeAlerts}`);

      // Проверяем пороги и отправляем алерты при необходимости
      if (healthStats.successRate < this.config.alertThresholds.minSuccessRate) {
        await this.sendAlert('low_success_rate', `Success rate ${healthStats.successRate}% below threshold`);
      }

      if (healthStats.overallStatus === 'critical') {
        await this.sendAlert('system_critical', 'System health is critical');
      }

    } catch (error) {
      console.error('❌ Ошибка проверки здоровья системы:', error.message);
    }
  }

  /**
   * Запуск Ultimate Parser через Python subprocess
   */
  private async runUltimateParser(options: {
    query: string;
    pages: number;
    sources: string[];
    extractDetails: boolean;
    usePlaywright: boolean;
    cacheTtl: number;
  }): Promise<ParsingStats> {
    return new Promise((resolve, reject) => {
      const parsersPath = path.join(process.cwd(), 'parsers');
      const scriptPath = path.join(parsersPath, 'ultimate_unified_parser.py');
      
      const args = [
        scriptPath,
        '--query', options.query,
        '--pages', options.pages.toString(),
        '--sources', ...options.sources,
        '--cache-ttl', options.cacheTtl.toString()
      ];

      if (options.extractDetails) {
        args.push('--extract-details');
      }

      if (options.usePlaywright) {
        args.push('--use-playwright');
      }

      console.log(`🐍 Запускаем Python парсер: python ${args.join(' ')}`);

      const pythonProcess = spawn('python', args, {
        cwd: parsersPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONPATH: parsersPath }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        console.log(`🐍 Python процесс завершен с кодом: ${code}`);
        console.log(`📤 stdout: ${stdout}`);
        if (stderr) console.log(`📤 stderr: ${stderr}`);
        
        if (code === 0) {
          try {
            // Парсим результаты из stdout
            const stats = this.parseParsingResults(stdout);
            resolve(stats);
          } catch (error) {
            console.error(`❌ Ошибка парсинга результатов: ${error.message}`);
            reject(new Error(`Failed to parse results: ${error.message}`));
          }
        } else {
          reject(new Error(`Python parser failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python parser: ${error.message}`));
      });
    });
  }

  /**
   * Парсинг результатов из вывода Python скрипта
   */
  private parseParsingResults(output: string): ParsingStats {
    console.log(`🔍 Парсинг результатов из вывода Python:`);
    console.log(output);
    
    // Ищем JSON в выводе или парсим текстовый отчет
    const lines = output.split('\n');
    
    // Простой парсинг текстового отчета
    let totalFound = 0;
    let totalSaved = 0;
    let totalFiltered = 0;
    let runtime = 0;
    let successRate = 0;

    for (const line of lines) {
      // Парсим строки вида "Found: 25 | Saved: 0 | Filtered: 9"
      if (line.includes('Found:') && line.includes('Saved:') && line.includes('Filtered:')) {
        const foundMatch = line.match(/Found:\s*(\d+)/);
        const savedMatch = line.match(/Saved:\s*(\d+)/);
        const filteredMatch = line.match(/Filtered:\s*(\d+)/);
        
        if (foundMatch) totalFound = parseInt(foundMatch[1]);
        if (savedMatch) totalSaved = parseInt(savedMatch[1]);
        if (filteredMatch) totalFiltered = parseInt(filteredMatch[1]);
      }
      
      // Парсим строку вида "Runtime: 0.1s"
      if (line.includes('Runtime:') && line.includes('s')) {
        const match = line.match(/Runtime:\s*([\d.]+)s/);
        if (match) runtime = parseFloat(match[1]);
      }
      
      // Парсим строки по источникам вида "habr        :  25 found ->   0 saved ( 9 filtered) OK 87.6%"
      if (line.includes('found ->') && line.includes('saved')) {
        const successMatch = line.match(/([\d.]+)%/);
        if (successMatch) {
          const rate = parseFloat(successMatch[1]);
          if (rate > successRate) successRate = rate; // Берем максимальный успех
        }
      }
    }

    // Если не нашли success rate, вычисляем сами
    if (successRate === 0 && totalFound > 0) {
      successRate = ((totalFound - totalFiltered) / totalFound) * 100;
    }

    const result = {
      runtime,
      totalFound,
      totalSaved,
      totalFiltered,
      totalCached: 0,
      successRate,
      bySource: {},
      cacheStats: {
        hitRatio: 0,
        activeEntries: 0,
        cacheSize: 0
      },
      healthStatus: {
        overallStatus: totalSaved > 0 ? 'healthy' : 'warning',
        activeAlerts: totalSaved === 0 ? 1 : 0,
        successRate
      }
    };

    console.log(`📊 Результат парсинга:`, result);
    return result;
  }

  /**
   * Получение статистики здоровья системы
   */
  private async getSystemHealth(): Promise<any> {
    // Простая заглушка - в реальности можно запросить у Python системы
    return {
      overallStatus: this.consecutiveFailures > 0 ? 'degraded' : 'healthy',
      successRate: Math.max(0, 100 - (this.consecutiveFailures * 20)),
      activeAlerts: this.consecutiveFailures > 0 ? 1 : 0
    };
  }

  /**
   * Отправка улучшенных уведомлений
   */
  private async sendEnhancedNotification(stats: ParsingStats): Promise<void> {
    console.log(`📢 Отправляем улучшенное уведомление:`);
    console.log(`   Найдено: ${stats.totalFound} вакансий`);
    console.log(`   Сохранено: ${stats.totalSaved} новых`);
    console.log(`   Успешность: ${stats.successRate}%`);
    console.log(`   Время выполнения: ${stats.runtime}с`);
    
    // Здесь можно добавить интеграцию с Telegram, email, Slack и т.д.
    const message = `🎯 Парсинг завершен!\n` +
                   `📊 Найдено: ${stats.totalFound}\n` +
                   `💾 Сохранено: ${stats.totalSaved}\n` +
                   `🎯 Успешность: ${stats.successRate}%\n` +
                   `⏱️ Время: ${stats.runtime}с`;
    
    console.log(`📧 Уведомление готово к отправке: ${message}`);
  }

  /**
   * Отправка алертов
   */
  private async sendAlert(type: string, message: string): Promise<void> {
    console.log(`🚨 ALERT [${type.toUpperCase()}]: ${message}`);
    
    // Здесь можно добавить интеграцию с системами мониторинга
    // PagerDuty, Slack, Telegram и т.д.
  }

  /**
   * Получение расширенной статистики мониторинга
   */
  public async getEnhancedStats(): Promise<any> {
    try {
      const dbStats = await this.db.getVacancies('', 'design', [], '', undefined, undefined, undefined, 1, 0);
      
      return {
        isRunning: this.isRunning,
        lastHealthCheck: this.lastHealthCheck,
        consecutiveFailures: this.consecutiveFailures,
        totalVacancies: dbStats.total,
        pendingVacancies: dbStats.vacancies.filter(v => !v.is_approved && !v.is_rejected).length,
        approvedVacancies: dbStats.vacancies.filter(v => v.is_approved).length,
        config: this.config,
        systemHealth: await this.getSystemHealth(),
        message: this.isRunning ? 'Улучшенный мониторинг активен' : 'Мониторинг остановлен'
      };
    } catch (error) {
      console.error('❌ Ошибка получения расширенной статистики:', error);
      return {
        isRunning: this.isRunning,
        lastHealthCheck: this.lastHealthCheck,
        consecutiveFailures: this.consecutiveFailures,
        totalVacancies: 0,
        pendingVacancies: 0,
        approvedVacancies: 0,
        config: this.config,
        systemHealth: { overallStatus: 'unknown', successRate: 0, activeAlerts: 0 },
        error: error.message
      };
    }
  }

  /**
   * Ручной запуск парсинга
   */
  public async runManualParsing(options: {
    sources?: string[];
    pages?: number;
    extractDetails?: boolean;
  } = {}): Promise<ParsingStats> {
    console.log('🔧 Запуск ручного парсинга');
    
    return await this.runUltimateParser({
      query: 'дизайнер',
      pages: options.pages || 2,
      sources: options.sources || this.config.enabledSources,
      extractDetails: options.extractDetails !== false,
      usePlaywright: this.config.enablePlaywright,
      cacheTtl: this.config.cacheTimeoutMinutes * 60
    });
  }
}

// Экспорт улучшенного синглтона
export const enhancedVacancyMonitor = new EnhancedVacancyMonitor();
