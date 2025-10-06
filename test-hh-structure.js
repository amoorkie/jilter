// Исследование структуры HH.ru
const axios = require('axios');
const cheerio = require('cheerio');

async function testHHStructure() {
  console.log('🔍 Исследование структуры HH.ru');
  
  try {
    const url = 'https://hh.ru/search/vacancy?text=дизайнер&area=1&ored_clusters=true&enable_snippets=true&salary=&experience=noExperience&schedule=fullDay&employment=full&employment=part&employment=project&employment=volunteer&employment=internship&L_search%20period=3&page=0';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Ищем разные селекторы
    const selectors = [
      '.serp-item',
      '.vacancy-serp-item',
      '.vacancy-card',
      '.vacancy-item',
      '[data-vacancy]',
      '.vacancy'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`✅ Найден селектор: ${selector} (${elements.length} элементов)`);
        
        // Анализируем первый элемент
        const firstElement = elements.first();
        console.log(`📋 HTML первого элемента:`);
        console.log(firstElement.html().substring(0, 500) + '...');
        
        // Ищем ссылки
        const links = firstElement.find('a');
        console.log(`🔗 Найдено ссылок: ${links.length}`);
        
        links.each((i, link) => {
          const href = $(link).attr('href');
          const text = $(link).text().trim();
          if (href && text && href.includes('/vacancy/')) {
            console.log(`   ${i + 1}. "${text}" -> ${href}`);
          }
        });
        
        break; // Останавливаемся на первом найденном селекторе
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testHHStructure();















