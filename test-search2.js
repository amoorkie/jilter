// test-search2.js - тест с разными запросами
const testSearches = async () => {
  const queries = ['дизайнер', 'designer', 'разработчик', 'javascript', 'python'];
  
  for (const query of queries) {
    try {
      console.log(`\n🔍 Тестируем поиск "${query}"...`);
      
      const response = await fetch(`http://localhost:3000/api/vacancies?query=${encodeURIComponent(query)}&salary=false`);
      const data = await response.json();
      
      console.log(`📊 Статус: ${response.status}, Найдено: ${data.vacancies?.length || 0}`);
      
      if (data.vacancies && data.vacancies.length > 0) {
        console.log(`🎉 Первая вакансия: ${data.vacancies[0].title}`);
        break; // Если нашли вакансии, останавливаемся
      }
    } catch (error) {
      console.error(`❌ Ошибка для "${query}":`, error.message);
    }
  }
};

testSearches();

