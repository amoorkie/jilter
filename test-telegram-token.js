// Тест Telegram API с токеном
const axios = require('axios');

async function testTelegramAPI() {
  console.log('🧪 Тестируем Telegram API с токеном...');
  
  const token = '7546926574:AAF0ZBOkYE6fgYupINu10Srnz0u6Nk6vLhY';
  
  try {
    // Тестируем получение информации о боте
    console.log('🤖 Проверяем информацию о боте...');
    const botInfo = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    console.log('✅ Бот активен:', botInfo.data.result.first_name);
    
    // Тестируем получение обновлений
    console.log('📨 Проверяем обновления...');
    const updates = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`, {
      params: { limit: 10 }
    });
    
    console.log(`📊 Найдено обновлений: ${updates.data.result.length}`);
    
    if (updates.data.result.length > 0) {
      console.log('📋 Последние обновления:');
      updates.data.result.slice(0, 3).forEach((update, index) => {
        if (update.message) {
          console.log(`${index + 1}. От: ${update.message.from?.first_name || 'Неизвестно'}`);
          console.log(`   Текст: ${update.message.text?.substring(0, 100) || 'Нет текста'}...`);
          console.log(`   Чат: ${update.message.chat?.title || update.message.chat?.first_name || 'Личный'}`);
        }
      });
    } else {
      console.log('⚠️ Нет обновлений. Возможные причины:');
      console.log('   - Бот не добавлен в каналы');
      console.log('   - Каналы не публичные');
      console.log('   - Нет новых сообщений');
    }
    
    // Тестируем получение информации о канале
    console.log('\n🔍 Проверяем канал @designhunters...');
    try {
      const chatInfo = await axios.get(`https://api.telegram.org/bot${token}/getChat`, {
        params: { chat_id: '@designhunters' }
      });
      console.log('✅ Канал доступен:', chatInfo.data.result.title);
      console.log('📊 Тип:', chatInfo.data.result.type);
      console.log('👥 Участников:', chatInfo.data.result.member_count || 'Неизвестно');
    } catch (error) {
      console.log('❌ Канал недоступен:', error.response?.data?.description || error.message);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.response?.data || error.message);
  }
}

testTelegramAPI();















