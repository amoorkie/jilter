// Прямой тест улучшенного Telegram парсера
const axios = require('axios');
const cheerio = require('cheerio');

async function testTelegramDirect() {
  console.log('🧪 Прямой тест улучшенного Telegram парсера...');
  
  const channels = ['designhunters', 'designjobs', 'uxjobs'];
  
  for (const channel of channels) {
    console.log(`\n🔍 Тестируем канал @${channel}:`);
    
    // Тест RSS парсинга
    const rssUrls = [
      `https://t.me/s/${channel}/rss`,
      `https://t.me/${channel}/rss`,
      `https://t.me/s/${channel}`,
      `https://t.me/${channel}`
    ];
    
    for (const url of rssUrls) {
      try {
        console.log(`  📡 Пробуем: ${url}`);
        const response = await axios.get(url, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        console.log(`    ✅ Статус: ${response.status}`);
        console.log(`    📊 Размер: ${response.data.length} символов`);
        
        const $ = cheerio.load(response.data);
        
        // Ищем разные элементы
        const selectors = [
          '.tgme_widget_message',
          '.message',
          '.post',
          '[data-post]',
          'article',
          '.tgme_widget_message_text',
          'item',
          'entry'
        ];
        
        let foundElements = 0;
        for (const selector of selectors) {
          const elements = $(selector);
          if (elements.length > 0) {
            console.log(`    🔍 Селектор "${selector}": ${elements.length} элементов`);
            foundElements += elements.length;
          }
        }
        
        if (foundElements === 0) {
          console.log(`    ⚠️ Элементы не найдены, ищем по тексту...`);
          
          const allText = $.text();
          const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 20);
          
          const designKeywords = ['дизайн', 'дизайнер', 'ui', 'ux', 'designer', 'design'];
          let foundKeywords = 0;
          
          lines.forEach(line => {
            const lowerLine = line.toLowerCase();
            if (designKeywords.some(keyword => lowerLine.includes(keyword))) {
              foundKeywords++;
              if (foundKeywords <= 3) { // Показываем только первые 3
                console.log(`    🎯 Найдено: "${line.substring(0, 100)}..."`);
              }
            }
          });
          
          console.log(`    📊 Найдено ключевых слов: ${foundKeywords}`);
        }
        
      } catch (error) {
        console.log(`    ❌ Ошибка: ${error.message}`);
      }
    }
  }
  
  console.log('\n🎯 Тест завершен!');
}

testTelegramDirect();















