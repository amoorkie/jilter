// Прямой тест парсеров
const { parseTelegramChannels } = require('./src/lib/parsers/telegram/enhanced-parser');
const { parseLinkedInVacancies } = require('./src/lib/parsers/linkedin/parser');

async function testDirectParsers() {
  console.log('🧪 Прямой тест парсеров...');
  
  try {
    // Тест Telegram парсера
    console.log('\n🔍 Тестируем Telegram парсер...');
    const telegramVacancies = await parseTelegramChannels([
      'designhunters',
      'designjobs',
      'itjobs',
      'startupjobs'
    ], 10);
    
    console.log(`📊 Telegram: ${telegramVacancies.length} вакансий`);
    if (telegramVacancies.length > 0) {
      telegramVacancies.slice(0, 3).forEach((vacancy, index) => {
        console.log(`${index + 1}. ${vacancy.title} (${vacancy.source})`);
      });
    }
    
    // Тест LinkedIn парсера
    console.log('\n🔍 Тестируем LinkedIn парсер...');
    const linkedinVacancies = await parseLinkedInVacancies('дизайнер', 2);
    
    console.log(`📊 LinkedIn: ${linkedinVacancies.length} вакансий`);
    if (linkedinVacancies.length > 0) {
      linkedinVacancies.slice(0, 3).forEach((vacancy, index) => {
        console.log(`${index + 1}. ${vacancy.title} (${vacancy.source})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании парсеров:', error.message);
  }
}

testDirectParsers();















