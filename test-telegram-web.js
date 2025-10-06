// Тест Telegram веб-парсинга
const axios = require('axios');
const cheerio = require('cheerio');

async function testTelegramWeb() {
  console.log('🧪 Тестируем Telegram веб-парсинг...');
  
  try {
    const channels = [
      'designhunters',
      'designjobs',
      'uxjobs'
    ];
    
    for (const channel of channels) {
      console.log(`\n🔍 Тестируем канал @${channel}:`);
      
      try {
        const url = `https://t.me/${channel}`;
        console.log(`  🌐 URL: ${url}`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 10000
        });
        
        console.log(`  ✅ Статус: ${response.status}`);
        console.log(`  📊 Размер: ${response.data.length} символов`);
        
        const $ = cheerio.load(response.data);
        
        // Ищем различные селекторы для сообщений
        const selectors = [
          '.tgme_widget_message',
          '.message',
          '.post',
          '[data-post]',
          '.tgme_widget_message_text'
        ];
        
        for (const selector of selectors) {
          const elements = $(selector);
          console.log(`  🔍 Селектор "${selector}": ${elements.length} элементов`);
          
          if (elements.length > 0) {
            // Показываем первые несколько элементов
            elements.slice(0, 3).each((index, element) => {
              const text = $(element).text().trim();
              if (text) {
                console.log(`    📝 Элемент ${index + 1}: ${text.substring(0, 100)}...`);
              }
            });
          }
        }
        
        // Ищем ключевые слова дизайна
        const designKeywords = ['дизайн', 'дизайнер', 'ui', 'ux', 'designer'];
        let foundKeywords = 0;
        
        for (const keyword of designKeywords) {
          if (response.data.toLowerCase().includes(keyword)) {
            foundKeywords++;
            console.log(`  🎯 Найдено ключевое слово: "${keyword}"`);
          }
        }
        
        console.log(`  📊 Найдено ключевых слов: ${foundKeywords}/${designKeywords.length}`);
        
      } catch (error) {
        console.log(`  ❌ Ошибка: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testTelegramWeb();















