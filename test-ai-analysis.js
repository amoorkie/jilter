// Тест AI-анализа вакансии
require('dotenv').config({ path: '.env.local' });

async function testAIAnalysis() {
  console.log('🧪 Тестируем AI-анализ вакансии...');
  
  try {
    const { analyzeVacancyWithAI } = require('./src/lib/ai/vacancy-analyzer');
    
    const testVacancy = {
      title: "UI/UX Designer",
      company: "Tech Company",
      description: "Ищем UI/UX дизайнера для работы над мобильными приложениями. Требования: опыт работы с Figma, знание принципов UX, портфолио. Условия: удаленная работа, гибкий график, конкурентная зарплата."
    };
    
    console.log(`🔍 Анализируем: ${testVacancy.title} от ${testVacancy.company}`);
    
    const result = await analyzeVacancyWithAI(
      testVacancy.title,
      testVacancy.company,
      testVacancy.description,
      'https://example.com'
    );
    
    console.log('✅ AI-анализ завершен!');
    console.log('📝 Результат:');
    console.log('fullDescription:', result.fullDescription?.substring(0, 100) + '...');
    console.log('requirements:', result.requirements?.substring(0, 100) + '...');
    console.log('tasks:', result.tasks?.substring(0, 100) + '...');
    console.log('conditions:', result.conditions?.substring(0, 100) + '...');
    console.log('benefits:', result.benefits?.substring(0, 100) + '...');
    console.log('technologies:', result.technologies);
    console.log('experienceLevel:', result.experienceLevel);
    console.log('employmentType:', result.employmentType);
    console.log('remoteWork:', result.remoteWork);
    console.log('salaryRange:', result.salaryRange);
    
  } catch (error) {
    console.log('❌ Ошибка AI-анализа:', error.message);
    console.log('📝 Детали:', error.stack);
  }
}

testAIAnalysis();





