// Детальный тест Хабр Карьера
const axios = require('axios');
const cheerio = require('cheerio');

async function testHabrDetailed() {
  console.log('🔍 Детальный тест Хабр Карьера');
  
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
    
    console.log(`📊 Размер ответа: ${response.data.length} символов`);
    
    const $ = cheerio.load(response.data);
    
    // Ищем все возможные селекторы
    const selectors = [
      '.vacancy-card',
      '.vacancy-item',
      '.job-card',
      '[data-vacancy]',
      '.vacancy',
      '.post',
      '.card',
      '.item'
    ];
    
    for (const selector of selectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`\n✅ Найден селектор: ${selector} (${elements.length} элементов)`);
        
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
        
        // Ищем заголовки
        const headings = firstElement.find('h1, h2, h3, h4, h5, h6');
        console.log(`📝 Найдено заголовков: ${headings.length}`);
        
        headings.each((i, heading) => {
          const text = $(heading).text().trim();
          if (text) {
            console.log(`   ${i + 1}. "${text}"`);
          }
        });
        
        break; // Останавливаемся на первом найденном селекторе
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testHabrDetailed();















