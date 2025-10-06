// src/app/api/parse-vacancies/route.ts
import { parseAllVacancies } from '@/lib/parsers/unified-parser';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🌐 API route /api/parse-vacancies вызван');
  
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || 'javascript';
    const salary = searchParams.get('salary') === 'true';
    const maxVacancies = parseInt(searchParams.get('maxVacancies') || '200');

    console.log('📋 Параметры API route:', { query, salary, maxVacancies });
    console.log('🔗 Полный URL запроса:', request.url);

    console.log('🚀 Вызываем parseAllVacancies...');
    const vacancies = await parseAllVacancies(query, maxVacancies);
    
    console.log('📊 parseVacancies вернула:', {
      count: vacancies.length,
      firstVacancy: vacancies[0] ? {
        id: vacancies[0].id,
        title: vacancies[0].title,
        company: vacancies[0].company
      } : null
    });
    
    const response = NextResponse.json({ vacancies });
    console.log('✅ API route возвращает ответ с', vacancies.length, 'вакансиями');
    
    return response;
  } catch (error) {
    console.error('💥 API Error:', error);
    console.error('💥 Стек ошибки API:', error instanceof Error ? error.stack : 'Нет стека');
    
    return NextResponse.json(
      { 
        error: 'Ошибка при парсинге вакансий',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      },
      { status: 500 }
    );
  }
}


