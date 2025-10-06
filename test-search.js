// test-search.js - простой тест поиска
const testSearch = async () => {
  try {
    console.log('🔍 Тестируем поиск "дизайнер"...');
    
    const response = await fetch('http://localhost:3000/api/vacancies?query=дизайнер&salary=false');
    const data = await response.json();
    
    console.log('📊 Статус:', response.status);
    console.log('📊 Данные:', data);
    console.log('✅ Найдено вакансий:', data.vacancies?.length || 0);
    
    if (data.vacancies && data.vacancies.length > 0) {
      console.log('🎉 Первая вакансия:', data.vacancies[0].title);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
};

testSearch();

