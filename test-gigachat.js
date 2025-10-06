// Тест GigaChat API
require('dotenv').config({ path: '.env.local' });

async function testGigaChat() {
  console.log('🧪 Тестируем GigaChat API...');
  
  const authKey = process.env.GIGACHAT_AUTH_KEY;
  
  if (!authKey || authKey === 'ВАШ_GIGACHAT_AUTH_КЛЮЧ_ЗДЕСЬ') {
    console.log('❌ GigaChat Auth ключ не настроен!');
    console.log('📝 Получить ключ можно на: https://developers.sber.ru/');
    return;
  }
  
  console.log('🔑 Auth ключ: Найден');
  
  try {
    // Сначала получаем Access Token
    console.log('🔐 Получаем Access Token...');
    const tokenResponse = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': '51a30daf-32fb-4a9c-b32a-8b149fc0c702',
        'Authorization': `Basic ${authKey}`
      },
      body: 'scope=GIGACHAT_API_PERS'
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Ошибка получения токена: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('✅ Access Token получен');
    
    // Теперь используем токен для запроса
    const response = await fetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
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
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ GigaChat API работает!');
      console.log('📝 Ответ:', data.choices[0].message.content);
    } else {
      console.log('❌ Ошибка API:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Детали ошибки:', errorText);
    }
  } catch (error) {
    console.log('❌ Ошибка подключения:', error.message);
  }
}

testGigaChat();
