// Поиск вакансий на Geekjob
const axios = require('axios');
const cheerio = require('cheerio');

async function testGeekjobVacancies() {
  console.log('🔍 Поиск вакансий на Geekjob');
  
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
    
    // Ищем все ссылки с /vacancy/
    const vacancyLinks = $('a[href*="/vacancy/"]');
    console.log(`🔗 Найдено ссылок на вакансии: ${vacancyLinks.length}`);
    
    vacancyLinks.each((i, link) => {
      const href = $(link).attr('href');
      const text = $(link).text().trim();
      if (href && text) {
        console.log(`   ${i + 1}. "${text}" -> ${href}`);
      }
    });
    
    // Ищем все ссылки с /job/
    const jobLinks = $('a[href*="/job/"]');
    console.log(`🔗 Найдено ссылок на работы: ${jobLinks.length}`);
    
    jobLinks.each((i, link) => {
      const href = $(link).attr('href');
      const text = $(link).text().trim();
      if (href && text) {
        console.log(`   ${i + 1}. "${text}" -> ${href}`);
      }
    });
    
    // Ищем элементы с текстом "дизайнер"
    const designElements = $('*:contains("дизайнер")');
    console.log(`🎨 Найдено элементов с "дизайнер": ${designElements.length}`);
    
    // Ищем элементы с текстом "designer"
    const designerElements = $('*:contains("designer")');
    console.log(`🎨 Найдено элементов с "designer": ${designerElements.length}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testGeekjobVacancies();















