#!/usr/bin/env tsx

import { backgroundParser } from '../src/lib/parsers/background-parser';
import { vacancyService } from '../src/lib/database/vacancy-service';

// Конфигурация парсинга
const PARSING_CONFIG = {
  queries: [
    // ТОП-5 самых важных запросов для дизайнеров
    'ui дизайнер', 'ux дизайнер', 'дизайнер', 'figma', 'photoshop'
  ],
  maxPages: 1, // ТОЛЬКО 1 страница на каждый ресурс для максимальной скорости
  aiEnabled: false,
  batchSize: 20, // Меньший батч для скорости
  delayBetweenBatches: 50 // Минимальная задержка
};

async function startBackgroundParsing() {
  console.log('🚀 Запуск фонового парсера...');
  console.log('📋 Конфигурация:', PARSING_CONFIG);
  
  try {
    // Проверяем подключение к БД
    const activeCount = await vacancyService.getActiveVacanciesCount();
    console.log(`📊 Текущее количество вакансий в БД: ${activeCount}`);
    
    // Запускаем парсинг
    const stats = await backgroundParser.startBackgroundParsing(PARSING_CONFIG);
    
    console.log('🎉 Парсинг завершен!');
    console.log('📈 Статистика:');
    
    stats.forEach((stat, index) => {
      console.log(`\n📋 Запрос ${index + 1}: "${stat.query}"`);
      console.log(`  ⏱️  Время: ${stat.parsingDurationMs}ms`);
      console.log(`  📊 Найдено: ${stat.vacanciesFound}`);
      console.log(`  ✅ Обработано: ${stat.vacanciesParsed}`);
      console.log(`  🧠 AI успешно: ${stat.aiAnalysisSuccess}`);
      console.log(`  ❌ AI ошибок: ${stat.aiAnalysisFailed}`);
    });
    
    // Финальная статистика
    const finalCount = await vacancyService.getActiveVacanciesCount();
    const sourceStats = await vacancyService.getSourceStats();
    
    console.log('\n📊 Финальная статистика БД:');
    console.log(`  📈 Всего вакансий: ${finalCount}`);
    console.log(`  📊 По источникам:`);
    sourceStats.forEach(stat => {
      console.log(`    - ${stat.source}: ${stat.count} (последний парсинг: ${stat.last_parsed})`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка фонового парсинга:', error);
    throw error;
  } finally {
    await vacancyService.close();
  }
}

// Запуск скрипта
if (require.main === module) {
  startBackgroundParsing()
    .then(() => {
      console.log('🎉 Скрипт завершен успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

export { startBackgroundParsing };
