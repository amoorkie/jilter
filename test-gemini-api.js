// Тест Google Gemini API
require('dotenv').config({ path: '.env.local' });

async function testGeminiAPI() {
  console.log('🧪 Тестируем Google Gemini API...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('🔑 API ключ:', apiKey ? 'Найден' : 'НЕ НАЙДЕН');
  
  if (!apiKey || apiKey === 'ВАШ_GEMINI_КЛЮЧ_ЗДЕСЬ') {
    console.log('❌ Gemini API ключ не настроен!');
    return;
  }
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Привет! Это тест Gemini API. Ответь коротко: "Gemini работает!"'
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 50,
          topP: 1,
          topK: 32
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Gemini API работает!');
      console.log('📝 Ответ:', data.candidates[0].content.parts[0].text);
    } else {
      console.log('❌ Ошибка API:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Детали ошибки:', errorText);
    }
  } catch (error) {
    console.log('❌ Ошибка подключения:', error.message);
  }
}

testGeminiAPI();
