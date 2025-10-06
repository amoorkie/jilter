// test-api-simple.js - простой тест API
const testAPI = async () => {
  try {
    console.log('🔍 Тестируем API route...');
    
    // Тест с простым запросом
    const response = await fetch('http://localhost:3000/api/vacancies?query=javascript&salary=false');
    const data = await response.json();
    
    console.log('📊 Статус:', response.status);
    console.log('📊 Данные:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
};

testAPI();
























