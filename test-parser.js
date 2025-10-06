// Простой тест парсера
const { parseAllVacancies } = require('./src/lib/parsers/unified-parser.ts');

async function testParser() {
  try {
    console.log('🔍 Тестируем парсер...');
    const vacancies = await parseAllVacancies('javascript', 10);
    console.log('✅ Результат:', vacancies.length, 'вакансий');
    console.log('📋 Первая вакансия:', vacancies[0]);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testParser();
