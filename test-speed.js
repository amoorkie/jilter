const axios = require('axios');

async function testSpeed() {
  console.log('🧪 Тестируем скорость загрузки вакансий...');
  
  const startTime = Date.now();
  
  try {
    const response = await axios.get('http://localhost:3000/api/vacancies?q=дизайнер&maxVacancies=50');
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`📊 Статус: ${response.status}`);
    console.log(`📊 Найдено вакансий: ${response.data.vacancies.length}`);
    console.log(`⏱️ Время загрузки: ${duration}ms`);
    console.log(`📊 Размер ответа: ${JSON.stringify(response.data).length} символов`);
    
    if (duration < 1000) {
      console.log('✅ Быстро! (< 1 секунды)');
    } else if (duration < 5000) {
      console.log('⚠️ Нормально (1-5 секунд)');
    } else {
      console.log('❌ Медленно (> 5 секунд)');
    }
    
    // Проверяем источники
    const sources = {};
    response.data.vacancies.forEach(vacancy => {
      const source = vacancy.source || 'Unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
    
    console.log('\n📋 Вакансии по источникам:');
    Object.entries(sources).forEach(([source, count]) => {
      console.log(`${source}: ${count} вакансий`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testSpeed();














