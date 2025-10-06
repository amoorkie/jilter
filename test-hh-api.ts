// test-hh-api.ts
import { fetchVacancies } from './src/lib/hh-api';

async function testFetchVacancies() {
  try {
    console.log('Запуск теста fetchVacancies...');
    
    // Вызываем fetchVacancies с параметром "javascript"
    const vacancies = await fetchVacancies("javascript");
    
    // Выводим результат в консоль
    console.log('Результат теста:');
    console.log(`Найдено вакансий: ${vacancies.length}`);
    console.log('Первые 3 вакансии:');
    vacancies.slice(0, 3).forEach((vacancy, index) => {
      console.log(`${index + 1}. ${vacancy.title}`);
      console.log(`   Компания: ${vacancy.company}`);
      console.log(`   Зарплата: ${vacancy.salary}`);
      console.log(`   URL: ${vacancy.url}`);
      console.log('---');
    });
    
    // Тест работает!
    console.log('✅ Тест работает! Функция fetchVacancies успешно выполнилась.');
    
  } catch (error) {
    console.error('❌ Ошибка в тесте:', error);
  }
}

// Запускаем тест
testFetchVacancies();