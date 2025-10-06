// Простой тест Geekjob
const axios = require('axios');
const cheerio = require('cheerio');

async function testGeekjobSimple() {
  console.log('🔍 Простой тест Geekjob');
  
  try {
    const url = 'https://geekjob.ru/?q=дизайнер&page=1';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
      }
    });
    
    const $ = cheerio.load(response.data);
    const vacancies = [];
    
    // Ищем ссылки на вакансии
    const vacancyLinks = $('a[href*="/vacancy/"]');
    console.log(`📊 Найдено ссылок на вакансии: ${vacancyLinks.length}`);
    
    vacancyLinks.each((index, link) => {
      try {
        const title = $(link).text().trim();
        const url = $(link).attr('href') || '';
        
        if (title && url) {
          console.log(`\n🔍 Обрабатываем вакансию ${index}: "${title}"`);
          
          // Проверяем релевантность
          const isRelevant = title.toLowerCase().includes('дизайн') || 
                           title.toLowerCase().includes('designer') ||
                           title.toLowerCase().includes('ui') ||
                           title.toLowerCase().includes('ux');
          
          if (isRelevant) {
            console.log(`✅ Релевантная вакансия: "${title}"`);
            vacancies.push({
              id: `geekjob-${index}`,
              title,
              company: 'Не указана', // Пока не ищем компанию
              salary: 'Не указана',
              url: url.startsWith('http') ? url : `https://geekjob.ru${url}`,
              source: 'geekjob'
            });
          } else {
            console.log(`❌ Не релевантная: "${title}"`);
          }
        }
        
        // Ограничиваем количество для теста
        if (index >= 9) {
          return false; // Прерываем цикл
        }
        
      } catch (error) {
        console.error(`❌ Ошибка обработки ссылки ${index}:`, error.message);
      }
    });
    
    console.log(`\n🎉 Результат: ${vacancies.length} релевантных вакансий`);
    vacancies.forEach((vacancy, i) => {
      console.log(`${i + 1}. "${vacancy.title}"`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testGeekjobSimple();















