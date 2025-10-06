// Тест DeepSeek API
require('dotenv').config({ path: '.env.local' });

async function testDeepSeekAPI() {
  console.log('🧪 Тестируем DeepSeek API...');
  
  const apiKey = process.env.DEEPSEEK_API_KEY;
  console.log('🔑 API ключ:', apiKey ? 'Найден' : 'НЕ НАЙДЕН');
  
  if (!apiKey || apiKey === 'sk-your-deepseek-api-key-here') {
    console.log('❌ API ключ не настроен!');
    return;
  }
  
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: 'Привет! Это тест API. Ответь коротко: "API работает!"'
          }
        ],
        max_tokens: 50
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ DeepSeek API работает!');
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

testDeepSeekAPI();














