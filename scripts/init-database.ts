// scripts/init-database.ts
import { supabase } from '../src/lib/database/config';
import fs from 'fs';
import path from 'path';

async function initDatabase() {
  console.log('🚀 Инициализация базы данных...');

  try {
    // 1. Создаем таблицы
    console.log('📋 Создание таблиц...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../src/lib/database/migrations/001_initial_schema.sql'),
      'utf8'
    );

    const { error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (migrationError) {
      console.error('❌ Ошибка создания таблиц:', migrationError);
      return;
    }

    console.log('✅ Таблицы созданы');

    // 2. Заполняем токсичные токены
    console.log('🌱 Заполнение токсичных токенов...');
    const seedSQL = fs.readFileSync(
      path.join(__dirname, '../src/lib/database/seeds/001_toxic_tokens.sql'),
      'utf8'
    );

    const { error: seedError } = await supabase.rpc('exec_sql', {
      sql: seedSQL
    });

    if (seedError) {
      console.error('❌ Ошибка заполнения токенов:', seedError);
      return;
    }

    console.log('✅ Токсичные токены добавлены');

    // 3. Проверяем, что все создалось
    const { data: tokens, error: tokensError } = await supabase
      .from('toxic_tokens')
      .select('count(*)');

    if (tokensError) {
      console.error('❌ Ошибка проверки токенов:', tokensError);
      return;
    }

    console.log(`✅ База данных инициализирована. Токенов: ${tokens?.length || 0}`);

  } catch (error) {
    console.error('❌ Критическая ошибка инициализации:', error);
  }
}

// Запускаем инициализацию
initDatabase();

