// Тест всех источников с детальным анализом HTML
const axios = require('axios');
const cheerio = require('cheerio');

async function testAllSources() {
  console.log('🔍 Детальный анализ всех источников');
  
  const sources = [
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
    },
    {
      name: 'HireHi',
      url: 'https://hirehi.ru/?q=дизайнер&page=1'
    },
    {
      name: 'Designer.ru',
      url: 'https://designer.ru/'
    },
    {
      name: 'GetMatch',
      url: 'https://getmatch.ru/vacancies?p=1&sa=150000&l=remote&l=moscow&sp=product_design&pa=all&q=дизайнер'
    }
  ];
  
  for (const source of sources) {
    try {
      console.log(`\n🔍 Анализируем ${source.name}...`);
      console.log(`📡 URL: ${source.url}`);
      
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
        }
      });
      
      console.log(`📊 Размер ответа: ${response.data.length} символов`);
      
      const $ = cheerio.load(response.data);
      
      // Ищем разные селекторы для вакансий
      const vacancySelectors = [
        '.serp-item',
        '.vacancy-card',
        '.vacancy-item',
        '.job-card',
        '[data-vacancy]',
        '.vacancy',
        '.collection-item',
        '.item',
        '.card'
      ];
      
      let foundSelectors = [];
      for (const selector of vacancySelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          foundSelectors.push({ selector, count: elements.length });
        }
      }
      
      if (foundSelectors.length > 0) {
        console.log(`✅ Найдены селекторы:`);
        foundSelectors.forEach(({ selector, count }) => {
          console.log(`   ${selector}: ${count} элементов`);
        });
        
        // Анализируем первый найденный селектор
        const bestSelector = foundSelectors[0];
        const elements = $(bestSelector.selector);
        const firstElement = elements.first();
        
        console.log(`\n📋 HTML первого элемента (${bestSelector.selector}):`);
        console.log(firstElement.html().substring(0, 800) + '...');
        
        // Ищем ссылки на вакансии
        const vacancyLinks = firstElement.find('a[href*="/vacancy/"], a[href*="/job/"], a[href*="/vacancies/"]');
        console.log(`\n🔗 Найдено ссылок на вакансии: ${vacancyLinks.length}`);
        
        vacancyLinks.each((i, link) => {
          const href = $(link).attr('href');
          const text = $(link).text().trim();
          if (href && text) {
            console.log(`   ${i + 1}. "${text}" -> ${href}`);
          }
        });
        
        // Ищем заголовки
        const headings = firstElement.find('h1, h2, h3, h4, h5, h6, .title, .name');
        console.log(`\n📝 Найдено заголовков: ${headings.length}`);
        
        headings.each((i, heading) => {
          const text = $(heading).text().trim();
          if (text) {
            console.log(`   ${i + 1}. "${text}"`);
          }
        });
        
      } else {
        console.log(`❌ Не найдено селекторов для вакансий`);
        
        // Ищем любые ссылки
        const allLinks = $('a');
        console.log(`🔗 Всего ссылок на странице: ${allLinks.length}`);
        
        // Ищем ссылки с дизайнерскими словами
        const designLinks = $('a').filter((i, el) => {
          const text = $(el).text().toLowerCase();
          return text.includes('дизайн') || text.includes('designer') || text.includes('ui') || text.includes('ux');
        });
        
        console.log(`🎨 Ссылки с дизайнерскими словами: ${designLinks.length}`);
        designLinks.each((i, link) => {
          const href = $(link).attr('href');
          const text = $(link).text().trim();
          if (href && text) {
            console.log(`   ${i + 1}. "${text}" -> ${href}`);
          }
        });
      }
      
    } catch (error) {
      console.log(`❌ Ошибка ${source.name}: ${error.message}`);
      if (error.response) {
        console.log(`   Статус: ${error.response.status}`);
        console.log(`   URL: ${error.response.config.url}`);
      }
    }
  }
}

testAllSources();















