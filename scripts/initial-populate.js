// Скрипт для первоначального заполнения базы данных
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

async function initialPopulate() {
  console.log('🌱 Начальное заполнение базы данных дизайнерскими вакансиями');
  console.log('📅 Парсинг вакансий за последние 3 дня со всех источников\n');
  
  try {
    // Запускаем полный парсинг через API
    console.log('📡 Запускаем полный парсинг...');
    const response = await fetch('http://localhost:3000/api/vacancies?q=дизайнер&maxVacancies=300');
    
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
        console.log('\n📋 Статистика по источникам:');
        const sourceStats = {};
        adminData.vacancies.forEach(vacancy => {
          sourceStats[vacancy.source] = (sourceStats[vacancy.source] || 0) + 1;
        });
        
        Object.entries(sourceStats).forEach(([source, count]) => {
          console.log(`   ${source}: ${count} вакансий`);
        });
        
        console.log('\n🎯 Перейдите на http://localhost:3000/admin для модерации');
        console.log('📊 Рекомендуется одобрить качественные вакансии для наполнения сайта');
      } else {
        console.log('❌ Нет вакансий для модерации');
      }
    } else {
      console.log('❌ Ошибка доступа к админ-панели');
    }
    
    // Запускаем мониторинг
    console.log('\n🚀 Запускаем систему мониторинга...');
    const monitoringResponse = await fetch('http://localhost:3000/api/monitoring/start', {
      method: 'POST'
    });
    
    if (monitoringResponse.ok) {
      console.log('✅ Мониторинг запущен');
      console.log('⏰ Система будет автоматически парсить вакансии каждые 4 часа');
    } else {
      console.log('⚠️ Не удалось запустить мониторинг');
    }
    
    // Получаем статистику
    console.log('\n📊 Получаем статистику системы...');
    const statsResponse = await fetch('http://localhost:3000/api/monitoring/stats');
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('📈 Статистика системы:');
      console.log(`   Всего вакансий: ${statsData.stats?.totalVacancies || 0}`);
      console.log(`   Ожидают модерации: ${statsData.stats?.pendingVacancies || 0}`);
      console.log(`   Одобрены: ${statsData.stats?.approvedVacancies || 0}`);
      console.log(`   Мониторинг активен: ${statsData.stats?.isRunning ? 'Да' : 'Нет'}`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка заполнения базы данных:', error.message);
  }
}

initialPopulate();














