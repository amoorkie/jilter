const axios = require('axios');

async function testEnhancedTelegramParsing() {
  console.log('🧪 Тестируем улучшенный Telegram парсинг...');
  
  try {
    console.log('🚀 Запускаем парсинг с улучшенным Telegram парсером...');
    const response = await axios.get('http://localhost:3000/api/vacancies?q=дизайнер&maxVacancies=10');
    
    console.log('📊 Статус:', response.status);
    console.log('📊 Найдено вакансий:', response.data.vacancies.length);

    console.log('\n📋 Найденные вакансии:\n');
    response.data.vacancies.forEach((vacancy, index) => {
      console.log(`${index + 1}. ${vacancy.title}`);
      console.log(`   Компания: ${vacancy.company}`);
      console.log(`   Зарплата: ${vacancy.salary}`);
      console.log(`   Источник: ${vacancy.source}`);
      console.log('');
    });

    // Проверяем Telegram вакансии
    const telegramVacancies = response.data.vacancies.filter(v => 
      v.source && v.source.toLowerCase().includes('telegram')
    );
    
    console.log(`📊 Telegram вакансий: ${telegramVacancies.length}`);
    
    if (telegramVacancies.length > 0) {
      console.log('\n🎉 Telegram вакансии найдены!');
      telegramVacancies.forEach((vacancy, index) => {
        console.log(`${index + 1}. ${vacancy.title} (${vacancy.source})`);
      });
    } else {
      console.log('\n⚠️ Telegram вакансии не найдены');
    }

    console.log('\n🔍 Проверяем админку...');
    const adminResponse = await axios.get('http://localhost:3000/api/admin/pending');
    console.log('📊 Ожидают модерации:', adminResponse.data.vacancies.length);

  } catch (error) {
    console.error('❌ Ошибка при тестировании улучшенного Telegram парсинга:', error.message);
  }
}

testEnhancedTelegramParsing();















