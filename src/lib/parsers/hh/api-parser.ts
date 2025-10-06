// src/lib/parsers/hh/api-parser.ts
// Используем официальный API HH.ru вместо парсинга HTML

import axios from 'axios';

export interface HHVacancy {
  id: string;
  name: string;
  salary: {
    from?: number;
    to?: number;
    currency: string;
    gross: boolean;
  } | null;
  employer: {
    id: string;
    name: string;
    logo_urls?: {
      original?: string;
    };
  };
  area: {
    id: string;
    name: string;
  };
  url: string;
  published_at: string;
  snippet: {
    requirement?: string;
    responsibility?: string;
  };
}

export interface HHResponse {
  items: HHVacancy[];
  found: number;
  pages: number;
  per_page: number;
  page: number;
}

export const parseHHVacanciesAPI = async (query: string = "javascript", maxPages: number = 5): Promise<any[]> => {
  const allVacancies: any[] = [];
  
  try {
    console.log(`🔍 Используем официальный API HH.ru для запроса: "${query}"`);
    
    for (let page = 0; page < maxPages; page++) {
      const apiUrl = `https://api.hh.ru/vacancies`;
      
      const params = {
        text: query,
        area: 1, // Москва
        page: page,
        per_page: 20,
        order_by: 'publication_time',
        only_with_salary: false
      };
      
      console.log(`📄 Запрашиваем страницу ${page + 1}...`);
      
      const response = await axios.get(apiUrl, {
        params,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000
      });
      
      const data: HHResponse = response.data;
      
      if (!data.items || data.items.length === 0) {
        console.log(`⚠️ На странице ${page + 1} нет вакансий, прекращаем парсинг`);
        break;
      }
      
      const pageVacancies = data.items.map((vacancy: HHVacancy) => ({
        id: `hh-api-${vacancy.id}`,
        title: vacancy.name,
        salary: vacancy.salary 
          ? `${vacancy.salary.from || ''} - ${vacancy.salary.to || ''} ${vacancy.salary.currency}`.trim()
          : 'Не указана',
        company: vacancy.employer.name,
        url: vacancy.url,
        description: `${vacancy.snippet.requirement || ''} ${vacancy.snippet.responsibility || ''}`.trim() || 'Описание не найдено',
        companyLogo: vacancy.employer.logo_urls?.original,
        companyUrl: `https://hh.ru/employer/${vacancy.employer.id}`,
        location: vacancy.area.name,
        publishedAt: vacancy.published_at
      }));
      
      console.log(`📊 Страница ${page + 1}: найдено ${pageVacancies.length} вакансий`);
      allVacancies.push(...pageVacancies);
      
      // Задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`📊 Всего найдено вакансий через API: ${allVacancies.length}`);
    return allVacancies;
    
  } catch (error) {
    console.error('❌ Ошибка при запросе к API HH.ru:', error);
    return [];
  }
};




