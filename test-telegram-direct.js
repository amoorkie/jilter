// Прямой тест Telegram парсинга
const axios = require('axios');

async function testTelegramDirect() {
  console.log('🧪 Тестируем Telegram парсинг напрямую...');
  
  try {
    // Тестируем веб-скрапинг канала
    const channel = 'designhunters';
    const url = `https://t.me/${channel}`;
    
    console.log(`🔍 Тестируем канал @${channel}:`);
    console.log(`🌐 URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    console.log(`✅ Статус: ${response.status}`);
    console.log(`📊 Размер: ${response.data.length} символов`);
    
    // Ищем ключевые слова дизайна
    const designKeywords = ['дизайн', 'дизайнер', 'ui', 'ux', 'designer', 'design'];
    let foundKeywords = 0;
    const foundLines = [];
    
    const lines = response.data.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      for (const keyword of designKeywords) {
        if (lowerLine.includes(keyword) && line.length > 20) {
          foundKeywords++;
          foundLines.push(line.trim());
          console.log(`🎯 Найдено: "${line.trim().substring(0, 100)}..."`);
          break;
        }
      }
    }
    
    console.log(`📊 Найдено ключевых слов: ${foundKeywords}`);
    console.log(`📋 Релевантных строк: ${foundLines.length}`);
    
    if (foundLines.length > 0) {
      console.log('\n💡 Найденные релевантные строки:');
      foundLines.slice(0, 5).forEach((line, index) => {
        console.log(`${index + 1}. ${line.substring(0, 150)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testTelegramDirect();















