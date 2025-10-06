#!/usr/bin/env ts-node
/**
 * Тестовый скрипт для Node.js парсера Geekjob
 */

import { parseGeekjobVacancies } from './src/lib/parsers/geekjob/parser';
import { SQLiteService } from './src/lib/database/sqlite-service';

async function testNodeJSParser() {
  console.log('=== ТЕСТ NODE.JS ПАРСЕРА ===');
  console.log('Запуск парсера Geekjob...');
  
  const startTime = Date.now();
  
  try {
    // Запускаем парсер на 2 страницах
    const vacancies = await parseGeekjobVacancies('дизайнер', 2);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n📊 Результаты Node.js парсера:`);
    console.log(`   Найдено вакансий: ${vacancies.length}`);
    console.log(`   Время выполнения: ${duration.toFixed(2)} секунд`);
    
    if (vacancies.length > 0) {
      console.log(`\n📋 Найденные вакансии:`);
      vacancies.forEach((vacancy, index) => {
        console.log(`${index + 1}. ${vacancy.title}`);
        console.log(`   Компания: ${vacancy.company}`);
        console.log(`   URL: ${vacancy.url}`);
        console.log(`   Описание: ${vacancy.description?.substring(0, 100)}...`);
        console.log('');
      });
      
      // Сохраняем в базу данных
      console.log('💾 Сохранение в базу данных...');
      const db = new SQLiteService();
      
      let savedCount = 0;
      for (const vacancy of vacancies) {
        try {
          const vacancyData = {
            external_id: vacancy.id,
            source: 'geekjob-nodejs',
            url: vacancy.url,
            title: vacancy.title,
            company: vacancy.company,
            salary: vacancy.salary,
            location: vacancy.location,
            description: vacancy.description,
            full_description: vacancy.full_description,
            requirements: vacancy.requirements,
            tasks: vacancy.tasks,
            benefits: vacancy.benefits,
            conditions: vacancy.conditions,
            published_at: new Date().toISOString(),
            status: 'pending'
          };
          
          const saved = db.saveVacancy(vacancyData);
          if (saved) savedCount++;
        } catch (error) {
          console.error(`Ошибка сохранения вакансии: ${error}`);
        }
      }
      
      console.log(`✅ Сохранено ${savedCount} из ${vacancies.length} вакансий`);
    } else {
      console.log('⚠️ Вакансии не найдены');
    }
    
  } catch (error) {
    console.error('❌ Ошибка парсинга:', error);
  }
}

// Запуск теста
testNodeJSParser().catch(console.error);











