// Тест Telegram RSS парсинга
const axios = require('axios');

async function testTelegramRSS() {
  console.log('🧪 Тестируем Telegram RSS парсинг...');
  
  try {
    // Тестируем RSS URL для популярных каналов
    const channels = [
      'designhunters',
      'designjobs', 
      'uxjobs',
      'productjobs'
    ];
    
    for (const channel of channels) {
      console.log(`\n🔍 Тестируем канал @${channel}:`);
      
      const rssUrls = [
        `https://t.me/s/${channel}/rss`,
        `https://t.me/${channel}/rss`,
        `https://rsshub.app/telegram/channel/${channel}`
      ];
      
      for (const rssUrl of rssUrls) {
        try {
          console.log(`  📡 Пробуем: ${rssUrl}`);
          const response = await axios.get(rssUrl, { timeout: 5000 });
          console.log(`  ✅ Статус: ${response.status}`);
          console.log(`  📊 Размер: ${response.data.length} символов`);
          
          // Проверяем, есть ли RSS контент
          if (response.data.includes('<item>') || response.data.includes('<entry>')) {
            console.log(`  🎯 RSS найден!`);
            break;
          } else {
            console.log(`  ⚠️ RSS пустой или недоступен`);
          }
        } catch (error) {
          console.log(`  ❌ Ошибка: ${error.message}`);
        }
      }
    }
    
    console.log('\n💡 Рекомендации:');
    console.log('  1. Проверьте, что каналы публичные');
    console.log('  2. Попробуйте другие каналы');
    console.log('  3. Настройте TELEGRAM_BOT_TOKEN для полного функционала');
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

testTelegramRSS();















