// Тест структуры страниц
const axios = require('axios');
const cheerio = require('cheerio');

async function testPageStructure() {
  console.log('🔍 Тестируем структуру страниц');
  
  const pages = [
    {
      name: 'HH.ru',
      url: 'https://hh.ru/search/vacancy?text=дизайнер&area=1&ored_clusters=true&enable_snippets=true&salary=&experience=noExperience&schedule=fullDay&employment=full&employment=part&employment=project&employment=volunteer&employment=internship&L_search%20period=3&page=0'
    },
    {
      name: 'Хабр Карьера',
      url: 'https://career.habr.com/vacancies?type=suitable&q=дизайнер&page=1'
    },
    {
      name: 'Geekjob',
      url: 'https://geekjob.ru/?q=дизайнер&page=1'
    }
  ];
  
  for (const page of pages) {
    try {
      console.log(`\n🔍 Тестируем ${page.name}...`);
      
      const response = await axios.get(page.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Проверяем разные селекторы
      const selectors = [
        '.serp-item',
        '.vacancy-card',
        '.vacancy-item',
        '.job-card',
        '[data-vacancy]',
        '.vacancy'
      ];
      
      console.log(`📊 Размер страницы: ${response.data.length} символов`);
      
      for (const selector of selectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          console.log(`✅ Найден селектор: ${selector} (${elements.length} элементов)`);
          
          // Проверяем первый элемент
          const firstElement = elements.first();
          const title = firstElement.find('a').first().text().trim();
          if (title) {
            console.log(`   Пример заголовка: "${title}"`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Ошибка ${page.name}: ${error.message}`);
    }
  }
}

testPageStructure();















