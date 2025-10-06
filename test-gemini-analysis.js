// Тест Gemini анализа вакансии
require('dotenv').config({ path: '.env.local' });

async function testGeminiAnalysis() {
  console.log('🧪 Тестируем Gemini анализ вакансии...');
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === 'ВАШ_GEMINI_КЛЮЧ_ЗДЕСЬ') {
    console.log('❌ Gemini API ключ не настроен!');
    return;
  }
  
  // Тестовая вакансия
  const testVacancy = {
    title: "UI/UX Designer",
    company: "Tech Company",
    description: "Ищем UI/UX дизайнера для работы над мобильными приложениями. Требования: опыт работы с Figma, знание принципов UX, портфолио. Условия: удаленная работа, гибкий график, конкурентная зарплата."
  };
  
  const prompt = `Проанализируй вакансию "${testVacancy.title}" от "${testVacancy.company}".

Описание: ${testVacancy.description}

Верни JSON с полями:
{
  "fullDescription": "описание",
  "requirements": "требования", 
  "tasks": "задачи",
  "conditions": "условия",
  "benefits": "льготы",
  "technologies": ["технологии"],
  "experienceLevel": "junior|middle|senior|lead|unknown",
  "employmentType": "full_time|part_time|project|freelance|internship|volunteer|unknown",
  "remoteWork": true|false,
  "salaryRange": {"min": число, "max": число, "currency": "RUB"}
}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          topP: 1,
          topK: 32
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const geminiResponse = data.candidates[0].content.parts[0].text.trim();
      
      console.log('✅ Gemini анализ работает!');
      console.log('📝 Полный ответ:');
      console.log(geminiResponse);
      
      // Пробуем распарсить JSON (убираем markdown блоки)
      try {
        let cleanResponse = geminiResponse;
        if (cleanResponse.includes('```json')) {
          cleanResponse = cleanResponse.replace(/```json\n?/, '').replace(/```\n?$/, '');
        }
        if (cleanResponse.includes('```')) {
          cleanResponse = cleanResponse.replace(/```\n?/, '').replace(/```\n?$/, '');
        }
        
        const parsedResponse = JSON.parse(cleanResponse.trim());
        console.log('\n🎯 Структурированные данные:');
        console.log('📋 Полное описание:', parsedResponse.fullDescription?.substring(0, 100) + '...');
        console.log('📋 Требования:', parsedResponse.requirements?.substring(0, 100) + '...');
        console.log('📋 Задачи:', parsedResponse.tasks?.substring(0, 100) + '...');
        console.log('📋 Условия:', parsedResponse.conditions?.substring(0, 100) + '...');
        console.log('📋 Льготы:', parsedResponse.benefits?.substring(0, 100) + '...');
        console.log('📋 Технологии:', parsedResponse.technologies);
        console.log('📋 Уровень опыта:', parsedResponse.experienceLevel);
        console.log('📋 Тип занятости:', parsedResponse.employmentType);
        console.log('📋 Удаленная работа:', parsedResponse.remoteWork);
        console.log('📋 Зарплата:', parsedResponse.salaryRange);
      } catch (parseError) {
        console.log('❌ Ошибка парсинга JSON:', parseError.message);
        console.log('📝 Сырой ответ:', geminiResponse);
      }
    } else {
      console.log('❌ Ошибка API:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('📝 Детали ошибки:', errorText);
    }
  } catch (error) {
    console.log('❌ Ошибка подключения:', error.message);
  }
}

testGeminiAnalysis();
