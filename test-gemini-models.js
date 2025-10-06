// Проверка доступных моделей Gemini
require('dotenv').config({ path: '.env.local' });

async function testGeminiModels() {
  console.log('🧪 Проверяем доступные модели Gemini...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'ВАШ_GEMINI_КЛЮЧ_ЗДЕСЬ') {
    console.log('❌ Gemini API ключ не настроен!');
    return;
  }
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Доступные модели:');
      data.models.forEach(model => {
        console.log(`- ${model.name} (${model.displayName || 'Без названия'})`);
      });
    } else {
      console.log('❌ Ошибка API:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Детали ошибки:', errorText);
    }
  } catch (error) {
    console.log('❌ Ошибка подключения:', error.message);
  }
}

testGeminiModels();





