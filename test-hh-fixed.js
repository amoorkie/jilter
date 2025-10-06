// test-hh-fixed.js - тест с исправленным User-Agent
const testHHAPIFixed = async () => {
  try {
    console.log('🔍 Тестируем HH.ru API с исправленным User-Agent...');
    
    const url = 'https://api.hh.ru/vacancies?text=дизайнер&per_page=10&area=113';
    console.log('📡 URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    console.log('📊 Статус:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('📊 Найдено вакансий:', data.items?.length || 0);
      
      if (data.items && data.items.length > 0) {
        console.log('🎉 Первая вакансия:', data.items[0].name);
        console.log('🏢 Компания:', data.items[0].employer.name);
        console.log('💰 Зарплата:', data.items[0].salary ? 'Есть' : 'Нет');
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Ошибка:', errorText);
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
  }
};

testHHAPIFixed();

