// Упрощенный парсер без сохранения в БД
import { parseGeekjobVacancies } from './geekjob/parser';
import { parseHHVacancies } from './hh/parser';
import { parseHireHiVacancies } from './hirehi/parser';
import { Vacancy } from './types';

export const parseAllVacancies = async (query: string = "дизайнер", maxVacancies: number = 50): Promise<Vacancy[]> => {
  console.log(`🚀 Запуск парсинга для запроса: "${query}"`);
  console.log(`📊 Максимум вакансий: ${maxVacancies}`);

  try {
    // Распределяем лимит между источниками
    const geekjobLimit = Math.floor(maxVacancies / 3);
    const hhLimit = Math.floor(maxVacancies / 3);
    const hirehiLimit = Math.floor(maxVacancies / 3);

    console.log(`📊 Лимиты: Geekjob=${geekjobLimit}, HH=${hhLimit}, HireHi=${hirehiLimit}`);

    // Парсим все источники параллельно
    const [geekjobVacancies, hhVacancies, hirehiVacancies] = await Promise.all([
      parseGeekjobVacancies(query, geekjobLimit).catch(error => {
        console.error('❌ Ошибка парсинга Geekjob:', error);
        return [];
      }),
      parseHHVacancies(query, 2).catch(error => { // 2 страницы HH
        console.error('❌ Ошибка парсинга HH.ru:', error);
        return [];
      }),
      parseHireHiVacancies(query, hirehiLimit).catch(error => {
        console.error('❌ Ошибка парсинга HireHi:', error);
        return [];
      })
    ]);

    // Добавляем источник к каждой вакансии
    const geekjobWithSource = geekjobVacancies.map(v => ({ ...v, source: 'geekjob' }));
    const hhWithSource = hhVacancies.map(v => ({ ...v, source: 'hh' }));
    const hirehiWithSource = hirehiVacancies.map(v => ({ ...v, source: 'hirehi' }));

    // Объединяем все вакансии
    const allVacancies = [...geekjobWithSource, ...hhWithSource, ...hirehiWithSource];

    console.log(`📊 Результаты парсинга:`);
    console.log(`   Geekjob: ${geekjobVacancies.length} вакансий`);
    console.log(`   HH.ru: ${hhVacancies.length} вакансий`);
    console.log(`   HireHi: ${hirehiVacancies.length} вакансий`);
    console.log(`   Всего: ${allVacancies.length} вакансий`);

    return allVacancies;

  } catch (error) {
    console.error('❌ Критическая ошибка парсинга:', error);
    return [];
  }
};















