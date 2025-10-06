// Финальный тест GigaChat API
require('dotenv').config({ path: '.env.local' });
const { Buffer } = require('buffer');

async function testGigaChatFinal() {
  console.log('🧪 Финальный тест GigaChat API...');
  
  const cadataToken = process.env.GIGACHAT_CADATA_TOKEN;
  const providerKey = process.env.GIGACHAT_PROVIDER_KEY;
  
  console.log('🔑 CADATA_TOKEN:', cadataToken ? 'Найден' : 'Не найден');
  console.log('🔑 PROVIDER_KEY:', providerKey ? 'Найден' : 'Не найден');
  
  if (!cadataToken || !providerKey) {
    console.log('❌ Переменные окружения не настроены!');
    return;
  }
  
  try {
    console.log('🔐 Получаем Access Token...');
    
    const tokenResponse = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${providerKey}:`).toString('base64')}`,
      },
      body: 'scope=GIGACHAT_API_PERS',
    });
    
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log('❌ Ошибка получения токена:', tokenResponse.status, errorText);
      return;
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Access Token получен');
    
    // Тестируем API запрос
    console.log('🤖 Тестируем API запрос...');
    
    const apiResponse = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        model: 'GigaChat:latest',
        messages: [
          {
            role: 'user',
            content: 'Привет! Как дела?'
          }
        ],
        temperature: 0.3,
        max_tokens: 100
      })
    });
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('✅ GigaChat API работает!');
      console.log('📝 Ответ:', data.choices[0].message.content);
    } else {
      const errorText = await apiResponse.text();
      console.log('❌ Ошибка API:', apiResponse.status, errorText);
    }
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
}

testGigaChatFinal();
