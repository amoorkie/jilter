// Простой тест Хабр Карьера
const axios = require('axios');
const cheerio = require('cheerio');

async function testHabrSimple() {
  console.log('🔍 Простой тест Хабр Карьера');
  
  try {
    const url = 'https://career.habr.com/vacancies?type=suitable&q=дизайнер&page=1';
    console.log(`📡 Запрашиваем: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
      }
    });
    
    const $ = cheerio.load(response.data);
    const vacancies = [];
    
    // Ищем карточки вакансий
    const cards = $('.vacancy-card');
    console.log(`📊 Найдено карточек: ${cards.length}`);
    
    cards.each((index, element) => {
      try {
        console.log(`\n🔍 Обрабатываем карточку ${index}`);
        
        // Ищем ссылку на вакансию
        const vacancyLinks = $(element).find('a[href*="/vacancies/"]').not('[href*="/companies/"]');
        console.log(`🔗 Найдено ссылок на вакансии: ${vacancyLinks.length}`);
        
        if (vacancyLinks.length > 0) {
          const titleElement = vacancyLinks.first();
          const title = titleElement.text().trim();
          const url = titleElement.attr('href') || '';
          
          console.log(`📝 Заголовок: "${title}"`);
          console.log(`🔗 URL: "${url}"`);
          
          if (title && url) {
            // Ищем компанию
            const companyLinks = $(element).find('a[href*="/companies/"]');
            const company = companyLinks.length > 0 ? companyLinks.first().text().trim() : 'Не указана';
            
            console.log(`🏢 Компания: "${company}"`);
            
            // Проверяем релевантность
            const isRelevant = title.toLowerCase().includes('дизайн') || 
                             title.toLowerCase().includes('designer') ||
                             title.toLowerCase().includes('ui') ||
                             title.toLowerCase().includes('ux');
            
            if (isRelevant) {
              console.log(`✅ Релевантная вакансия: "${title}"`);
              vacancies.push({
                id: `habr-${index}`,
                title,
                company,
                salary: 'Не указана',
                url: url.startsWith('http') ? url : `https://career.habr.com${url}`,
                source: 'habr'
              });
            } else {
              console.log(`❌ Не релевантная: "${title}"`);
            }
          }
        }
        
        // Ограничиваем количество для теста
        if (index >= 4) {
          return false; // Прерываем цикл
        }
        
      } catch (error) {
        console.error(`❌ Ошибка обработки карточки ${index}:`, error.message);
      }
    });
    
    console.log(`\n🎉 Результат: ${vacancies.length} релевантных вакансий`);
    vacancies.forEach((vacancy, i) => {
      console.log(`${i + 1}. "${vacancy.title}" - ${vacancy.company}`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testHabrSimple();















