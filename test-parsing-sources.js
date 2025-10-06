const axios = require('axios');

async function testParsingSources() {
  console.log('🧪 Тестируем источники парсинга...');
  
  try {
    console.log('🚀 Запускаем парсинг...');
    const response = await axios.get('http://localhost:3000/api/vacancies?q=дизайнер&maxVacancies=100');
    
    console.log('📊 Статус:', response.status);
    console.log('📊 Найдено вакансий:', response.data.vacancies.length);

    console.log('\n📋 Найденные вакансии по источникам:\n');
    const sources = {};
    response.data.vacancies.forEach(vacancy => {
      const source = vacancy.source || 'Unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
    
    Object.entries(sources).forEach(([source, count]) => {
      console.log(`${source}: ${count} вакансий`);
    });

    // Проверяем Telegram вакансии
    const telegramVacancies = response.data.vacancies.filter(v => 
      v.source && v.source.toLowerCase().includes('telegram')
    );
    
    console.log(`\n📊 Telegram вакансий: ${telegramVacancies.length}`);
    
    if (telegramVacancies.length > 0) {
      console.log('\n🎉 Telegram вакансии найдены!');
      telegramVacancies.slice(0, 3).forEach((vacancy, index) => {
        console.log(`${index + 1}. ${vacancy.title} (${vacancy.source})`);
      });
    } else {
      console.log('\n⚠️ Telegram вакансии не найдены');
    }

    // Проверяем LinkedIn вакансии
    const linkedinVacancies = response.data.vacancies.filter(v => 
      v.source && v.source.toLowerCase().includes('linkedin')
    );
    
    console.log(`\n📊 LinkedIn вакансий: ${linkedinVacancies.length}`);
    
    if (linkedinVacancies.length > 0) {
      console.log('\n🎉 LinkedIn вакансии найдены!');
      linkedinVacancies.slice(0, 3).forEach((vacancy, index) => {
        console.log(`${index + 1}. ${vacancy.title} (${vacancy.source})`);
      });
    } else {
      console.log('\n⚠️ LinkedIn вакансии не найдены');
    }

    console.log('\n🔍 Проверяем админку...');
    const adminResponse = await axios.get('http://localhost:3000/api/admin/pending');
    console.log('📊 Ожидают модерации:', adminResponse.data.vacancies.length);

  } catch (error) {
    console.error('❌ Ошибка при тестировании парсинга:', error.message);
  }
}

testParsingSources();















