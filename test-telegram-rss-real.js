// Тест реальных RSS фидов для популярных каналов с вакансиями
const axios = require('axios');
const cheerio = require('cheerio');

async function testRealTelegramRSS() {
  console.log('🧪 Тестируем реальные RSS фиды для каналов с вакансиями...');
  
  // Популярные каналы с вакансиями
  const channels = [
    'designhunters',      // Design Hunters
    'designjobs',         // Design Jobs
    'uxjobs',            // UX Jobs
    'productjobs',       // Product Jobs
    'itjobs',            // IT Jobs
    'devjobs',           // Dev Jobs
    'startupjobs',       // Startup Jobs
    'remotework',        // Remote Work
    'freelancejobs',     // Freelance Jobs
    'marketingjobs'      // Marketing Jobs
  ];
  
  for (const channel of channels) {
    console.log(`\n🔍 Тестируем канал @${channel}:`);
    
    const rssUrls = [
      `https://t.me/s/${channel}/rss`,
      `https://t.me/${channel}/rss`,
      `https://rsshub.app/telegram/channel/${channel}`,
      `https://tgstat.com/rss/${channel}`,
      `https://combot.org/rss/${channel}`
    ];
    
    let foundRSS = false;
    
    for (const url of rssUrls) {
      try {
        console.log(`  📡 Пробуем: ${url}`);
        const response = await axios.get(url, { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.data && response.data.length > 1000) {
          console.log(`    ✅ Статус: ${response.status}`);
          console.log(`    📊 Размер: ${response.data.length} символов`);
          
          const $ = cheerio.load(response.data);
          
          // Ищем элементы RSS
          const items = $('item, entry, .tgme_widget_message');
          console.log(`    📋 Найдено элементов: ${items.length}`);
          
          if (items.length > 0) {
            console.log(`    🎉 RSS работает! Найдено ${items.length} элементов`);
            foundRSS = true;
            break;
          }
        }
        
      } catch (error) {
        console.log(`    ❌ Ошибка: ${error.message}`);
      }
    }
    
    if (!foundRSS) {
      console.log(`    ⚠️ RSS не найден для @${channel}`);
    }
  }
  
  console.log('\n🎯 Тест завершен!');
}

testRealTelegramRSS();















