import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query = '', 
      maxVacancies = 200, 
      employmentTypes = [] 
    } = body;

    console.log('🔍 Поиск вакансий:', { query, maxVacancies, employmentTypes });

    // Получаем одобренные вакансии из базы данных
    const db = new SQLiteService();
    const vacancies = await db.getApprovedVacancies();

    console.log(`📊 Найдено вакансий: ${vacancies.length}`);

    // Фильтруем по запросу если есть
    let filteredVacancies = vacancies;
    if (query.trim()) {
      const searchQuery = query.toLowerCase();
      filteredVacancies = vacancies.filter(vacancy => 
        (vacancy.title && vacancy.title.toLowerCase().includes(searchQuery)) ||
        (vacancy.company && vacancy.company.toLowerCase().includes(searchQuery)) ||
        (vacancy.description && vacancy.description.toLowerCase().includes(searchQuery))
      );
    }

    // Ограничиваем количество
    const limitedVacancies = filteredVacancies.slice(0, maxVacancies);

    // Преобразуем данные в формат для фронтенда
    const formattedVacancies = limitedVacancies.map(vacancy => ({
      id: vacancy.id.toString(),
      title: vacancy.title,
      company: vacancy.company,
      source: vacancy.source,
      url: vacancy.url,
      salary: vacancy.salary_min ? `${vacancy.salary_min} - ${vacancy.salary_max || 'не указано'} ${vacancy.salary_currency || 'руб.'}` : 'не указана',
      description: vacancy.edited_description || vacancy.full_description || vacancy.description,
      isRemote: vacancy.ai_remote || false,
      employmentTypes: vacancy.ai_employment ? 
        (typeof vacancy.ai_employment === 'string' ? 
          JSON.parse(vacancy.ai_employment) : 
          vacancy.ai_employment) : [],
      publishedAt: vacancy.published_at,
      createdAt: vacancy.created_at
    }));

    return NextResponse.json({
      success: true,
      vacancies: formattedVacancies,
      total: formattedVacancies.length,
      query,
      employmentTypes
    });

  } catch (error: any) {
    console.error('❌ Ошибка поиска вакансий:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка поиска вакансий',
        details: error.message
      },
      { status: 500 }
    );
  }
}