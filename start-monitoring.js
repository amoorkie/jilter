// Скрипт для запуска автоматического мониторинга
const { VacancyMonitor } = require('./src/lib/monitoring/scheduler.ts');

console.log('🚀 Запуск автоматического мониторинга вакансий...');

// Создаем мониторинг с настройками
const monitor = new VacancyMonitor({
  fullScanInterval: 4 * 60 * 60 * 1000, // 4 часа
  quickScanInterval: 60 * 60 * 1000, // 1 час
  maxVacanciesPerSource: 50,
  maxTotalVacancies: 200,
  enableAIAnalysis: false, // Отключаем AI для ускорения
  aiAnalysisBatchSize: 10,
  enableNotifications: true,
  notificationThreshold: 5
});

// Запускаем мониторинг
monitor.start();

console.log('✅ Автоматический мониторинг запущен!');
console.log('📅 Расписание:');
console.log('  - Быстрый парсинг: каждые 60 минут');
console.log('  - Полный парсинг: каждые 4 часа');
console.log('  - Период сбора: последние 3 дня');

// Обработка завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка мониторинга...');
  monitor.stop();
  process.exit(0);
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('❌ Критическая ошибка:', error);
  monitor.stop();
  process.exit(1);
});
