// Скрипт для заполнения базы данных свежими вакансиями
const fs = require('fs');
const path = require('path');

// Загружаем переменные
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.log('⚠️ Не удалось загрузить .env.local:', error.message);
  }
}

loadEnvFile();

async function seedDatabase() {
  console.log('🌱 Заполнение базы данных свежими вакансиями...\n');
  
  try {
    // Запускаем парсинг через API
    console.log('📡 Запускаем парсинг вакансий...');
    const response = await fetch('http://localhost:3000/api/vacancies?q=дизайнер&maxVacancies=100');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Получено ${data.vacancies?.length || 0} вакансий`);
    
    // Проверяем админ-панель
    console.log('\n👨‍💼 Проверяем админ-панель...');
    const adminResponse = await fetch('http://localhost:3000/api/admin/pending');
    
    if (adminResponse.ok) {
      const adminData = await adminResponse.json();
      console.log(`✅ В админ-панели: ${adminData.vacancies?.length || 0} вакансий ожидают модерации`);
      
      if (adminData.vacancies && adminData.vacancies.length > 0) {
        console.log('\n📋 Первые 3 вакансии для модерации:');
        adminData.vacancies.slice(0, 3).forEach((vacancy, index) => {
          console.log(`   ${index + 1}. ${vacancy.title} - ${vacancy.company}`);
          console.log(`      Специализация: ${vacancy.ai_specialization}`);
          console.log(`      Занятость: ${vacancy.ai_employment?.join(', ')}`);
          console.log(`      Удаленно: ${vacancy.ai_remote ? 'Да' : 'Нет'}`);
        });
        
        console.log('\n🎯 Перейдите на http://localhost:3000/admin для модерации');
      } else {
        console.log('❌ Нет вакансий для модерации');
      }
    } else {
      console.log('❌ Ошибка доступа к админ-панели');
    }
    
  } catch (error) {
    console.error('❌ Ошибка заполнения базы данных:', error.message);
  }
}

seedDatabase();














