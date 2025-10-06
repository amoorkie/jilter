// Скрипт для добавления поля tasks в базу данных
const Database = require('better-sqlite3');
const path = require('path');

async function addTasksField() {
  console.log('🔧 Добавляем поле tasks в базу данных...');
  
  try {
    const dbPath = path.join(process.cwd(), 'data', 'vacancies.db');
    const db = new Database(dbPath);
    
    // Проверяем, существует ли поле tasks
    const tableInfo = db.prepare("PRAGMA table_info(vacancies)").all();
    const hasTasksField = tableInfo.some(column => column.name === 'tasks');
    
    if (hasTasksField) {
      console.log('✅ Поле tasks уже существует');
    } else {
      console.log('➕ Добавляем поле tasks...');
      db.exec("ALTER TABLE vacancies ADD COLUMN tasks TEXT DEFAULT ''");
      console.log('✅ Поле tasks добавлено');
    }
    
    db.close();
    console.log('🎉 Готово!');
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
}

addTasksField();






