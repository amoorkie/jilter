// src/lib/parsers/unified-parser.ts
import { parseGeekjobVacancies } from './geekjob';
import { parseHHVacancies } from './hh';
import { parseEnhancedVacancies } from './enhanced-parser';
import { parseAllWithPagination } from './pagination-parser';
import { parseHireHiVacancies } from './hirehi/parser';
import { saveVacancy } from '../database/service';

export interface Vacancy {
  id: string;
  title: string;
  salary: string;
  company: string;
  url: string;
  companyLogo?: string;
  companyUrl?: string;
  source: 'geekjob' | 'hh' | 'hirehi';
  employment?: string[]; // Тип занятости
  score?: number; // Added for soft filtering
  reasons?: string[]; // Added for soft filtering
}

export const parseAllVacancies = async (query: string = "javascript", maxVacancies: number = 200): Promise<Vacancy[]> => {
  console.log(`🔍 Запуск парсинга всех источников для запроса: "${query}"`);
  
  try {
    // Запускаем улучшенный парсинг из всех источников параллельно
    const [geekjobVacancies, hhVacancies, hirehiVacancies] = await Promise.all([
      parseEnhancedVacancies('geekjob', query, Math.floor(maxVacancies / 3)).catch(error => {
        console.error('❌ Ошибка парсинга Geekjob:', error);
        return [];
      }),
      parseEnhancedVacancies('hh', query, Math.floor(maxVacancies / 3)).catch(error => {
        console.error('❌ Ошибка парсинга HH.ru:', error);
        return [];
      }),
      parseHireHiVacancies(query, 3).catch(error => {
        console.error('❌ Ошибка парсинга HireHi:', error);
        return [];
      })
    ]);

    // Добавляем информацию об источнике
    const geekjobWithSource = geekjobVacancies.map(vacancy => ({
      ...vacancy,
      source: 'geekjob' as const
    }));

    const hhWithSource = hhVacancies.map(vacancy => ({
      ...vacancy,
      source: 'hh' as const
    }));

    const hirehiWithSource = hirehiVacancies.map(vacancy => ({
      ...vacancy,
      source: 'hirehi' as const
    }));

    // Объединяем все вакансии
    const allVacancies = [...geekjobWithSource, ...hhWithSource, ...hirehiWithSource];

    console.log(`📊 Результаты парсинга:`);
    console.log(`   Geekjob: ${geekjobVacancies.length} вакансий`);
    console.log(`   HH.ru: ${hhVacancies.length} вакансий`);
    console.log(`   HireHi: ${hirehiVacancies.length} вакансий`);
    console.log(`   Всего: ${allVacancies.length} вакансий`);

    // Сохраняем вакансии в базу данных
    console.log('💾 Сохраняем вакансии в базу данных...');
    const savedVacancies = [];
    
    for (const vacancy of allVacancies) {
      try {
        const savedVacancy = await saveVacancy({
          source: vacancy.source,
          url: vacancy.url,
          title: vacancy.title,
          company: vacancy.company,
          companyUrl: vacancy.companyUrl,
          description: `Вакансия: ${vacancy.title}\nКомпания: ${vacancy.company}\nЗарплата: ${vacancy.salary}`,
          // TODO: Добавить извлечение дополнительных полей из парсеров
        });
        
        if (savedVacancy) {
          savedVacancies.push(savedVacancy);
        }
      } catch (error) {
        console.error(`Ошибка сохранения вакансии ${vacancy.id}:`, error);
      }
    }

    console.log(`✅ Сохранено в БД: ${savedVacancies.length} вакансий`);

    return allVacancies;

  } catch (error) {
    console.error('❌ Критическая ошибка при парсинге:', error);
    return [];
  }
};

/**
 * Парсинг всех вакансий с пагинацией (собирает максимально возможное количество)
 */
export const parseAllVacanciesWithPagination = async (
  query: string = "javascript", 
  maxPages: number = 5
): Promise<Vacancy[]> => {
  console.log(`🔍 Запуск парсинга с пагинацией для запроса: "${query}" (максимум ${maxPages} страниц)`);
  
  try {
    // Используем парсер с пагинацией
    const allVacancies = await parseAllWithPagination(query, maxPages);

    // Сохраняем вакансии в базу данных
    console.log('💾 Сохраняем вакансии в базу данных...');
    const savedVacancies = [];
    
    for (const vacancy of allVacancies) {
      try {
        const savedVacancy = await saveVacancy({
          source: vacancy.source,
          url: vacancy.url,
          title: vacancy.title,
          company: vacancy.company,
          companyUrl: vacancy.companyUrl,
          description: `Вакансия: ${vacancy.title}\nКомпания: ${vacancy.company}\nЗарплата: ${vacancy.salary}`,
        });
        
        if (savedVacancy) {
          savedVacancies.push(savedVacancy);
        }
      } catch (error) {
        console.error(`Ошибка сохранения вакансии ${vacancy.id}:`, error);
      }
    }

    console.log(`✅ Сохранено в БД: ${savedVacancies.length} вакансий`);

    return allVacancies;

  } catch (error) {
    console.error('❌ Критическая ошибка при парсинге с пагинацией:', error);
    return [];
  }
};
