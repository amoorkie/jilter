// Улучшенный парсер для дизайнерских вакансий
import { parseAllEmploymentTypes } from './hh-filtered-parser';
import { parseAllWithPagination } from './pagination-parser';
import { updateVacanciesWithRealEmployment } from './real-employment-parser';
import { parseHabrVacancies } from './habr/parser';
import { parseDesignerRuVacancies } from './designer-ru/parser';
import { parseGetMatchVacancies } from './getmatch/parser';
import { parseTelegramChannels } from './telegram/enhanced-parser';
import { parseHHVacancies } from './hh/parser';
import { parseLinkedInVacancies } from './linkedin/parser';

export interface Vacancy {
  id: string;
  title: string;
  company: string;
  salary: string;
  url: string;
  description?: string;
  location?: string;
  source: string;
  publishedAt?: Date;
}

// Ключевые слова для поиска дизайнерских вакансий
const DESIGN_QUERIES = [
  'дизайнер',
  'ui/ux дизайнер',
  'ux/ui дизайнер', 
  'продуктовый дизайнер',
  'графический дизайнер',
  'веб-дизайнер',
  'интерфейсный дизайнер',
  'визуальный дизайнер',
  'motion дизайнер',
  'ux дизайнер',
  'ui дизайнер',
  'дизайнер интерфейсов',
  'дизайнер коммуникаций',
  'арт-директор',
  'creative director',
  'product designer',
  'ui designer',
  'ux designer',
  'visual designer',
  'graphic designer',
  'web designer',
  'interaction designer',
  'motion designer',
  'ux researcher',
  'art director'
];

export async function parseAllDesignVacancies(maxVacancies: number = 200): Promise<Vacancy[]> {
  console.log(`🎯 Начинаем парсинг дизайнерских вакансий со всех источников`);
  console.log(`📊 Целевое количество: ${maxVacancies}`);
  
  const allVacancies: Vacancy[] = [];
  
  try {
    console.log(`\n🔍 Парсинг с основных источников...`);
    
    // Парсим только с быстрых источников
    const [habrVacancies, getmatchVacancies] = await Promise.all([
      parseHabrVacancies('дизайнер', 2).catch(error => {
        console.error(`❌ Ошибка парсинга Хабр Карьера:`, error);
        return [];
      }),
      parseGetMatchVacancies('дизайнер', 1).catch(error => {
        console.error(`❌ Ошибка парсинга GetMatch:`, error);
        return [];
      })
    ]);
    
    // Временно отключаем медленные парсеры
    const hhVacancies: any[] = [];
    const geekjobVacancies: any[] = [];
    const hirehiVacancies: any[] = [];
    const designerRuVacancies: any[] = [];
    
    // Добавляем вакансии от основных источников
    allVacancies.push(...hhVacancies, ...geekjobVacancies, ...hirehiVacancies, ...habrVacancies, ...designerRuVacancies, ...getmatchVacancies);
    
    // Парсим LinkedIn (новый источник)
    try {
      console.log(`\n🔍 Парсинг LinkedIn...`);
      const linkedinVacancies = await parseLinkedInVacancies('дизайнер', 2);
      allVacancies.push(...linkedinVacancies);
      console.log(`📊 LinkedIn: ${linkedinVacancies.length} вакансий`);
    } catch (error) {
      console.log(`⚠️ LinkedIn парсинг пропущен: ${error}`);
    }
    
    console.log(`📊 Основные источники: ${allVacancies.length} вакансий`);
    
  // Парсим Telegram-каналы (улучшенный парсинг)
  try {
    console.log(`\n🔍 Парсинг Telegram-каналов...`);
    const telegramVacancies = await parseTelegramChannels([
      'designhunters',  // ✅ RSS работает (20 элементов)
      'designjobs',     // ✅ RSS работает (20 элементов)  
      'itjobs',         // ✅ RSS работает (20 элементов)
      'startupjobs'     // ✅ RSS работает (20 элементов)
    ], 20);
    allVacancies.push(...telegramVacancies);
    console.log(`📊 Telegram: ${telegramVacancies.length} вакансий`);
  } catch (error) {
    console.log(`⚠️ Telegram парсинг пропущен: ${error}`);
  }
    
    // Если еще не набрали достаточно, пробуем дополнительные запросы
    if (allVacancies.length < maxVacancies) {
      console.log(`\n🔍 Дополнительные поисковые запросы...`);
      
      for (const query of DESIGN_QUERIES.slice(0, 5)) { // Берем только первые 5 запросов
        try {
          const [hhVacancies, habrVacancies] = await Promise.all([
            parseHHVacancies(query, 1).catch(() => []),
            parseHabrVacancies(query, 1).catch(() => [])
          ]);
          
          const queryVacancies = [...hhVacancies, ...habrVacancies];
          console.log(`📊 Запрос "${query}": ${queryVacancies.length} вакансий`);
          
          allVacancies.push(...queryVacancies);
          
          // Если уже набрали достаточно вакансий, прерываем
          if (allVacancies.length >= maxVacancies) {
            console.log(`✅ Набрали ${allVacancies.length} вакансий, прерываем парсинг`);
            break;
          }
          
          // Небольшая пауза между запросами
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (error) {
          console.error(`❌ Ошибка парсинга для запроса "${query}":`, error);
        }
      }
    }
    
  } catch (error) {
    console.error(`❌ Критическая ошибка парсинга:`, error);
  }
  
  // Убираем дубли по URL
  const uniqueVacancies = allVacancies.reduce((acc, vacancy) => {
    const existingIndex = acc.findIndex(v => v.url === vacancy.url);
    if (existingIndex === -1) {
      acc.push(vacancy);
    } else {
      // Если нашли дубль, оставляем более полную версию
      if (vacancy.description && !acc[existingIndex].description) {
        acc[existingIndex] = vacancy;
      }
    }
    return acc;
  }, [] as Vacancy[]);
  
  console.log(`\n🎉 Парсинг завершен!`);
  console.log(`📊 Всего найдено: ${allVacancies.length} вакансий`);
  console.log(`📊 Уникальных: ${uniqueVacancies.length} вакансий`);
  console.log(`📊 Убрано дублей: ${allVacancies.length - uniqueVacancies.length}`);
  
  return uniqueVacancies.slice(0, maxVacancies);
}

// Функция для парсинга с конкретным запросом
export async function parseDesignVacancies(query: string, maxVacancies: number = 50): Promise<Vacancy[]> {
  console.log(`🎯 Парсинг дизайнерских вакансий для запроса: "${query}"`);
  
  try {
    const [hhVacancies, geekjobVacancies, hirehiVacancies] = await Promise.all([
      parseHHVacancies(query, 2).catch(error => {
        console.error(`❌ Ошибка парсинга HH.ru:`, error);
        return [];
      }),
      parseGeekjobVacancies(query, 1).catch(error => {
        console.error(`❌ Ошибка парсинга Geekjob:`, error);
        return [];
      }),
      parseHireHiVacancies(query, 1).catch(error => {
        console.error(`❌ Ошибка парсинга HireHi:`, error);
        return [];
      })
    ]);
    
    const allVacancies = [...hhVacancies, ...geekjobVacancies, ...hirehiVacancies];
    
    // Убираем дубли по URL
    const uniqueVacancies = allVacancies.reduce((acc, vacancy) => {
      const existingIndex = acc.findIndex(v => v.url === vacancy.url);
      if (existingIndex === -1) {
        acc.push(vacancy);
      }
      return acc;
    }, [] as Vacancy[]);
    
    console.log(`📊 Найдено ${allVacancies.length} вакансий, уникальных: ${uniqueVacancies.length}`);
    
    return uniqueVacancies.slice(0, maxVacancies);
    
  } catch (error) {
    console.error(`❌ Ошибка парсинга:`, error);
    return [];
  }
}