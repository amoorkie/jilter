// Поиск дизайнерских вакансий на Geekjob
const axios = require('axios');
const cheerio = require('cheerio');

async function testGeekjobDesign() {
  console.log('🔍 Поиск дизайнерских вакансий на Geekjob');
  
  try {
    // Пробуем разные запросы
    const queries = [
      'дизайнер',
      'designer',
      'ui',
      'ux',
      'графический дизайнер',
      'продуктовый дизайнер'
    ];
    
    for (const query of queries) {
      console.log(`\n🔍 Поиск по запросу: "${query}"`);
      
      const url = `https://geekjob.ru/?q=${encodeURIComponent(query)}&page=1`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3'
        }
      });
      
      const $ = cheerio.load(response.data);
      const vacancyLinks = $('a[href*="/vacancy/"]');
      
      console.log(`📊 Найдено ссылок на вакансии: ${vacancyLinks.length}`);
      
      let designVacancies = 0;
      vacancyLinks.each((index, link) => {
        const title = $(link).text().trim();
        if (title) {
          const isDesign = title.toLowerCase().includes('дизайн') || 
                          title.toLowerCase().includes('designer') ||
                          title.toLowerCase().includes('ui') ||
                          title.toLowerCase().includes('ux');
          
          if (isDesign) {
            console.log(`   ✅ "${title}"`);
            designVacancies++;
          }
        }
      });
      
      console.log(`🎨 Дизайнерских вакансий: ${designVacancies}`);
      
      if (designVacancies > 0) {
        console.log(`✅ Найдены дизайнерские вакансии для запроса "${query}"`);
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  }
}

testGeekjobDesign();















