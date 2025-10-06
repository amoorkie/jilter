// Тест детального парсера
const { parseVacancyDetails } = require('./src/lib/parsers/detail-parser');

async function testDetailParser() {
  console.log('🧪 Тестируем детальный парсер...');
  
  try {
    // Тестируем с реальной вакансией
    const testUrl = 'https://career.habr.com/vacancies/1000162268';
    const testSource = 'habr';
    
    console.log(`🔍 Парсим: ${testUrl}`);
    const result = await parseVacancyDetails(testUrl, testSource);
    
    console.log('📝 Результат:');
    console.log('fullDescription:', result?.fullDescription?.substring(0, 200) + '...');
    console.log('requirements:', result?.requirements?.substring(0, 100) + '...');
    console.log('tasks:', result?.tasks?.substring(0, 100) + '...');
    console.log('conditions:', result?.conditions?.substring(0, 100) + '...');
    console.log('benefits:', result?.benefits?.substring(0, 100) + '...');
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
}

testDetailParser();





