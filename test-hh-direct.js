// test-hh-direct.js - прямой тест HH.ru API
const testHHAPI = async () => {
  try {
    console.log('🔍 Тестируем прямой запрос к HH.ru API...');
    
    const url = 'https://api.hh.ru/vacancies?text=дизайнер&per_page=10&area=113';
    console.log('📡 URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JobFilter/1.0 (contact@example.com)',
      },
    });
    
    console.log('📊 Статус:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Найдено вакансий:', data.items?.length || 0);
      
      if (data.items && data.items.length > 0) {
        console.log('🎉 Первая вакансия:', data.items[0].name);
        console.log('🏢 Компания:', data.items[0].employer.name);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка:', errorText);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
};

testHHAPI();

