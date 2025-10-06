// Тест Telegram парсинга через API
const axios = require('axios');

async function testTelegramAPI() {
  console.log('🧪 Тестируем Telegram парсинг через API...');
  
  try {
    // Запускаем парсинг
    console.log('🚀 Запускаем парсинг...');
    const response = await axios.get('http://localhost:3000/api/vacancies?q=дизайнер&maxVacancies=10');
    
    console.log(`📊 Статус: ${response.status}`);
    console.log(`📊 Найдено вакансий: ${response.data.vacancies?.length || 0}`);
    
    if (response.data.vacancies && response.data.vacancies.length > 0) {
      console.log('\n📋 Найденные вакансии:');
      response.data.vacancies.forEach((vacancy, index) => {
        console.log(`\n${index + 1}. ${vacancy.title}`);
        console.log(`   Компания: ${vacancy.company}`);
        console.log(`   Зарплата: ${vacancy.salary}`);
        console.log(`   Источник: ${vacancy.source}`);
        if (vacancy.source.includes('Telegram')) {
          console.log('   🎯 Telegram вакансия!');
        }
      });
    }
    
    // Проверяем админку
    console.log('\n🔍 Проверяем админку...');
    const adminResponse = await axios.get('http://localhost:3000/api/admin/pending');
    console.log(`📊 Ожидают модерации: ${adminResponse.data.vacancies?.length || 0}`);
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
    if (error.response) {
      console.error('📊 Статус ответа:', error.response.status);
      console.error('📊 Данные:', error.response.data);
    }
  }
}

testTelegramAPI();















