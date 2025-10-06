// Быстрый парсер только для Habr (для тестирования)
import { parseHabrVacancies } from './habr/parser';

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

export async function parseFastDesignVacancies(maxVacancies: number = 20): Promise<Vacancy[]> {
  console.log(`🚀 Быстрый парсинг только Habr (максимум ${maxVacancies} вакансий)`);
  
  try {
    // Парсим только Habr (самый быстрый источник)
    const habrVacancies = await parseHabrVacancies('дизайнер', 1);
    console.log(`📊 Habr: ${habrVacancies.length} вакансий`);
    
    return habrVacancies.slice(0, maxVacancies);
  } catch (error) {
    console.error(`❌ Ошибка быстрого парсинга:`, error);
    return [];
  }
}







