const { EnhancedHabrParser } = require('./src/lib/parsers/habr/enhanced-parser.ts');

async function testEnhancedHabrParser() {
  console.log('🧪 Тестирование улучшенного Habr парсера...');
  
  const parser = new EnhancedHabrParser();
  
  try {
    await parser.init();
    
    // Тестируем парсинг с лимитом 3 вакансии
    console.log('\n🔍 Запускаем парсинг 3 вакансий...');
    const vacancies = await parser.parseDesignVacancies(3);
    
    console.log(`\n📊 Результат: ${vacancies.length} вакансий`);
    
    if (vacancies.length > 0) {
      console.log('\n📋 Первая вакансия:');
      const first = vacancies[0];
      console.log(`  📝 Заголовок: ${first.title}`);
      console.log(`  🏢 Компания: ${first.company}`);
      console.log(`  📍 Локация: ${first.location}`);
      console.log(`  💰 Зарплата: ${first.salary_min ? `${first.salary_min}-${first.salary_max} ${first.salary_currency}` : 'не указана'}`);
      console.log(`  📄 URL: ${first.url}`);
      console.log(`  📝 Описание (первые 200 символов): ${first.description.substring(0, 200)}...`);
      console.log(`  📋 Полное описание: ${first.full_description ? first.full_description.substring(0, 200) + '...' : 'не найдено'}`);
      console.log(`  📋 Требования: ${first.requirements ? first.requirements.substring(0, 100) + '...' : 'не найдены'}`);
      console.log(`  📋 Задачи: ${first.tasks ? first.tasks.substring(0, 100) + '...' : 'не найдены'}`);
      console.log(`  📋 Льготы: ${first.benefits ? first.benefits.substring(0, 100) + '...' : 'не найдены'}`);
      console.log(`  📋 Условия: ${first.conditions ? first.conditions.substring(0, 100) + '...' : 'не найдены'}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  } finally {
    await parser.close();
  }
}

testEnhancedHabrParser().catch(console.error);







