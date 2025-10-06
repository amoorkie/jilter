// Простой скрипт для запуска мониторинга через API
const axios = require('axios');

console.log('🚀 Запуск автоматического мониторинга вакансий...');

async function startMonitoring() {
  try {
    // Запускаем мониторинг
    const response = await axios.post('http://localhost:3000/api/monitoring/start');
    console.log('✅ Мониторинг запущен:', response.data.message);
    
    // Проверяем статус
    const stats = await axios.get('http://localhost:3000/api/monitoring/stats');
    console.log('📊 Статус мониторинга:', stats.data.stats);
    
    console.log('\n🎯 Автоматический мониторинг активен!');
    console.log('📅 Расписание:');
    console.log('  - Быстрый парсинг: каждые 60 минут');
    console.log('  - Полный парсинг: каждые 4 часа');
    console.log('  - Период сбора: последние 3 дня');
    console.log('  - Telegram парсинг: включен');
    
    // Показываем статус каждые 30 секунд
    setInterval(async () => {
      try {
        const stats = await axios.get('http://localhost:3000/api/monitoring/stats');
        const { isRunning, totalVacancies, pendingVacancies } = stats.data.stats;
        console.log(`📊 Статус: ${isRunning ? 'Активен' : 'Остановлен'} | Вакансий: ${totalVacancies} | Ожидают модерации: ${pendingVacancies}`);
      } catch (error) {
        console.log('⚠️ Ошибка получения статуса:', error.message);
      }
    }, 30000);
    
  } catch (error) {
    console.error('❌ Ошибка запуска мониторинга:', error.message);
    process.exit(1);
  }
}

// Обработка завершения
process.on('SIGINT', () => {
  console.log('\n🛑 Остановка мониторинга...');
  process.exit(0);
});

startMonitoring();















