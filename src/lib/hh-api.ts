// lib/hh-api.ts

interface Vacancy {
  id: string;
  title: string;
  salary: string;
  company: string;
  url: string;
  experience: string;
  schedule: string;
  employment: string;
  description: string;
  skills: string[];
  area: string;
  publishedAt: string;
  companyLogo?: string;
  companyUrl?: string;
}

interface HHVacancy {
  id: string;
  name: string;
  salary: {
    from: number | null;
    to: number | null;
    currency: string;
  } | null;
  employer: {
    name: string;
    logo_urls?: {
      original?: string;
    };
    alternate_url?: string;
  };
  experience: {
    name: string;
  };
  schedule: {
    name: string;
  };
  employment: {
    name: string;
  };
  snippet: {
    requirement?: string;
    responsibility?: string;
  };
  key_skills: Array<{
    name: string;
  }>;
  area: {
    name: string;
  };
  published_at: string;
  alternate_url: string;
}

interface HHResponse {
  items: HHVacancy[];
}

// Функция для обработки вакансий
function processVacancies(items: HHVacancy[]): Vacancy[] {
  console.log('🔄 processVacancies вызвана с', items.length, 'элементами');
  
  if (!Array.isArray(items)) {
    console.error('❌ processVacancies: items не является массивом:', typeof items);
    return [];
  }
  
  if (items.length === 0) {
    console.log('⚠️ processVacancies: пустой массив items');
    return [];
  }
  
  console.log('📋 Первый элемент для обработки:', {
    id: items[0].id,
    name: items[0].name,
    hasSalary: !!items[0].salary,
    hasEmployer: !!items[0].employer
  });
  
  return items.map((item: HHVacancy, index: number) => {
    let salaryText = 'Не указана';
    
    if (item.salary) {
      const { from, to, currency } = item.salary;
      const currencySymbol = currency === 'RUR' ? '₽' : currency;
      
      if (from && to) {
        salaryText = `${from.toLocaleString('ru-RU')} - ${to.toLocaleString('ru-RU')} ${currencySymbol}`;
      } else if (from) {
        salaryText = `от ${from.toLocaleString('ru-RU')} ${currencySymbol}`;
      } else if (to) {
        salaryText = `до ${to.toLocaleString('ru-RU')} ${currencySymbol}`;
      }
    }

    // Формируем описание из snippet
    const description = [
      item.snippet.responsibility && `Обязанности: ${item.snippet.responsibility}`,
      item.snippet.requirement && `Требования: ${item.snippet.requirement}`
    ].filter(Boolean).join('\n\n');

    // Форматируем дату публикации
    const publishedDate = new Date(item.published_at);
    const publishedAt = publishedDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return {
      id: item.id,
      title: item.name,
      salary: salaryText,
      company: item.employer.name,
      url: item.alternate_url,
      experience: item.experience.name,
      schedule: item.schedule.name,
      employment: item.employment.name,
      description: description || 'Описание не указано',
      skills: item.key_skills.map(skill => skill.name),
      area: item.area.name,
      publishedAt: publishedAt,
      companyLogo: item.employer.logo_urls?.original,
      companyUrl: item.employer.alternate_url,
    };
  });
  
  console.log('✅ processVacancies завершена, обработано', items.length, 'вакансий');
}

export async function fetchVacancies(query: string, salary: boolean = true): Promise<Vacancy[]> {
  console.log('🚀 fetchVacancies вызвана с параметрами:', { query, salary });
  
  try {
    // Формируем URL для запроса к HH.ru API согласно документации
    const baseUrl = 'https://api.hh.ru/vacancies';
    
    // ✅ ИСПРАВЛЕНО: правильные параметры согласно документации HH.ru API
    // Согласно документации: https://github.com/hhru/api
    const searchParams = new URLSearchParams();
    searchParams.append('text', query); // URLSearchParams автоматически кодирует
    searchParams.append('per_page', '100'); // Максимум 100 вакансий за запрос
    searchParams.append('area', '113'); // Россия (113)
    searchParams.append('order_by', 'publication_time'); // Сортировка по времени публикации
    searchParams.append('search_field', 'name'); // Поиск в названии вакансии
    if (salary) {
      searchParams.append('only_with_salary', 'true');
    }

    const fullUrl = `${baseUrl}?${searchParams}`;
    console.log('🔍 Запрос к HH.ru API:', fullUrl);
    console.log('📋 Параметры запроса:', Object.fromEntries(searchParams));
    console.log('📋 Исходный query:', query);
    console.log('📋 Закодированный query:', encodeURIComponent(query));

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
      },
    });

    console.log('📊 Статус ответа:', response.status, response.statusText);
    console.log('📊 Заголовки ответа:', Object.fromEntries(response.headers.entries()));

    // HH.ru API может возвращать 400, но это нормально - просто нет вакансий
    if (!response.ok && response.status !== 400) {
      console.error('❌ HTTP ошибка:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Текст ошибки:', errorText);
      console.error('❌ URL запроса:', fullUrl);
      console.error('❌ Заголовки ответа:', Object.fromEntries(response.headers.entries()));
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    // Если 400 - попробуем без фильтра по зарплате
    if (response.status === 400) {
      console.log('⚠️ Получен 400, пробуем без фильтра по зарплате...');
      
      // ✅ ИСПРАВЛЕНО: правильные параметры для retry (без фильтра по зарплате)
      const retryParams = new URLSearchParams();
      retryParams.append('text', query); // URLSearchParams автоматически кодирует
      retryParams.append('per_page', '100');
      retryParams.append('area', '113'); // Россия
      // ✅ Убираем only_with_salary для retry
      
      const retryUrl = `${baseUrl}?${retryParams}`;
      console.log('🔄 Повторный запрос:', retryUrl);
      console.log('📋 Параметры retry:', Object.fromEntries(retryParams));
      
      const retryResponse = await fetch(retryUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        },
      });
      
      console.log('🔄 Статус повторного запроса:', retryResponse.status, retryResponse.statusText);
      
      if (!retryResponse.ok) {
        console.log('❌ Повторный запрос тоже не удался:', retryResponse.status);
        const retryErrorText = await retryResponse.text();
        console.error('❌ Текст ошибки повторного запроса:', retryErrorText);
        return [];
      }
      
      const retryData: HHResponse = await retryResponse.json();
      console.log('✅ Повторный запрос успешен, найдено вакансий:', retryData.items?.length || 0);
      console.log('📊 Структура данных повторного запроса:', {
        hasItems: !!retryData.items,
        itemsLength: retryData.items?.length,
        firstItem: retryData.items?.[0] ? {
          id: retryData.items[0].id,
          name: retryData.items[0].name,
          employer: retryData.items[0].employer?.name
        } : null
      });
      
      if (!retryData || !Array.isArray(retryData.items)) {
        console.log('❌ Некорректные данные в повторном запросе');
        return [];
      }
      
      const processedVacancies = processVacancies(retryData.items);
      console.log('✅ Обработано вакансий из повторного запроса:', processedVacancies.length);
      return processedVacancies;
    }

    const data: HHResponse = await response.json();
    console.log('📊 Получены данные:', data.items?.length || 0, 'вакансий');
    console.log('📊 Структура данных:', {
      hasItems: !!data.items,
      itemsLength: data.items?.length,
      firstItem: data.items?.[0] ? {
        id: data.items[0].id,
        name: data.items[0].name,
        employer: data.items[0].employer?.name
      } : null
    });

    // Проверяем, что данные корректны
    if (!data || !Array.isArray(data.items)) {
      console.log('❌ Некорректные данные от API');
      return [];
    }

    const vacancies = processVacancies(data.items);
    console.log('✅ Обработано вакансий:', vacancies.length);
    
    if (vacancies.length > 0) {
      console.log('🎉 Первая обработанная вакансия:', {
        id: vacancies[0].id,
        title: vacancies[0].title,
        company: vacancies[0].company,
        salary: vacancies[0].salary
      });
    }
    
    return vacancies;
  } catch (error) {
    console.error('💥 Ошибка при получении вакансий:', error);
    console.error('💥 Стек ошибки:', error instanceof Error ? error.stack : 'Нет стека');
    // Возвращаем пустой массив вместо выброса ошибки
    return [];
  }
}