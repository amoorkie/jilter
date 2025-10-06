// Тест сохранения вакансии с полями
require('dotenv').config({ path: '.env.local' });

async function testSaveVacancy() {
  console.log('🧪 Тестируем сохранение вакансии с полями...');
  
  try {
    const { SQLiteService } = require('./src/lib/database/sqlite-service');
    const db = new SQLiteService();
    
    const testVacancy = {
      external_id: 'test-123',
      source: 'test',
      url: 'https://example.com',
      title: 'Test Designer',
      company: 'Test Company',
      location: 'Moscow',
      description: 'Test description',
      salary_min: 100000,
      salary_max: 200000,
      salary_currency: 'RUB',
      published_at: new Date().toISOString(),
      ai_specialization: 'design',
      ai_employment: ['full_time'],
      ai_experience: 'middle',
      ai_technologies: ['Figma', 'Photoshop'],
      ai_salary_min: 100000,
      ai_salary_max: 200000,
      ai_remote: true,
      ai_relevance_score: 0.9,
      ai_summary: 'Test summary',
      full_description: 'Test full description',
      requirements: 'Test requirements',
      tasks: 'Test tasks',
      conditions: 'Test conditions',
      benefits: 'Test benefits',
      company_logo: '',
      company_url: '',
      employment_type: 'full_time',
      experience_level: 'middle',
      remote_type: 'remote'
    };
    
    console.log('💾 Сохраняем тестовую вакансию...');
    const savedVacancy = await db.saveVacancy(testVacancy);
    console.log('✅ Вакансия сохранена с ID:', savedVacancy.id);
    
    console.log('📝 Проверяем сохраненные поля:');
    console.log('full_description:', savedVacancy.full_description);
    console.log('requirements:', savedVacancy.requirements);
    console.log('tasks:', savedVacancy.tasks);
    console.log('conditions:', savedVacancy.conditions);
    console.log('benefits:', savedVacancy.benefits);
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
    console.log('📝 Детали:', error.stack);
  }
}

testSaveVacancy();






