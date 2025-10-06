// Тест Telegram парсинга
const { parseTelegramChannels } = require('./src/lib/parsers/telegram/parser');

async function testTelegram() {
  console.log('🧪 Тестируем Telegram парсинг...');
  
  try {
    // Тестируем парсинг каналов
    const vacancies = await parseTelegramChannels(['designhunters'], 5);
    
    console.log(`📊 Найдено вакансий: ${vacancies.length}`);
    
    vacancies.forEach((vacancy, index) => {
      console.log(`\n${index + 1}. ${vacancy.title}`);
      console.log(`   Компания: ${vacancy.company}`);
      console.log(`   Зарплата: ${vacancy.salary}`);
      console.log(`   URL: ${vacancy.url}`);
      console.log(`   Источник: ${vacancy.source}`);
    });
    
    if (vacancies.length === 0) {
      console.log('\n⚠️ Вакансии не найдены. Возможные причины:');
      console.log('   - TELEGRAM_BOT_TOKEN не настроен');
      console.log('   - Канал @designhunters недоступен');
      console.log('   - Нет релевантных сообщений');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testTelegram();















