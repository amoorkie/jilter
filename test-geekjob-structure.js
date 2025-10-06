// Исследование структуры Geekjob
const axios = require('axios');
const cheerio = require('cheerio');

async function testGeekjobStructure() {
  console.log('🔍 Исследование структуры Geekjob');
  
  try {
    const url = 'https://geekjob.ru/?q=дизайнер&page=1';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
      }
    });
    
    console.log(`📊 Размер ответа: ${response.data.length} символов`);
    
    const $ = cheerio.load(response.data);
    
    // Ищем разные селекторы
    const selectors = [
      '.collection-item',
      '.vacancy-card',
      '.vacancy-item',
      '.job-card',
      '[data-vacancy]',
      '.vacancy',
      '.item'
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
          if (href && text) {
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

testGeekjobStructure();















