// test-fixed-api.js - тест исправленного API
const testFixedAPI = async () => {
  try {
    console.log('🔍 Тестируем исправленный API...');
    
    // Тест с разными запросами
    const queries = ['дизайнер', 'javascript', 'python', 'разработчик'];
    
    for (const query of queries) {
      console.log(`\n🔍 Тестируем запрос: "${query}"`);
      
      const response = await fetch(`http://localhost:3000/api/vacancies?query=${encodeURIComponent(query)}&salary=false`);
      const data = await response.json();
      
      console.log(`📊 Статус: ${response.status}, Найдено: ${data.vacancies?.length || 0}`);
      
      if (data.vacancies && data.vacancies.length > 0) {
        console.log(`🎉 Первая вакансия: ${data.vacancies[0].title}`);
        console.log(`🏢 Компания: ${data.vacancies[0].company}`);
        console.log(`💰 Зарплата: ${data.vacancies[0].salary}`);
        break; // Если нашли вакансии, останавливаемся
      } else {
        console.log('❌ Вакансии не найдены');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
};

testFixedAPI();
























