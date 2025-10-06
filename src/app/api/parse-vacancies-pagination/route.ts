import { NextRequest, NextResponse } from 'next/server';
import { parseAllWithPagination } from '@/lib/parsers/pagination-parser';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'javascript';
    const maxPages = parseInt(searchParams.get('maxPages') || '5');

    console.log(`🔍 API /api/parse-vacancies-pagination вызван с параметрами:`, {
      query,
      maxPages
    });

    // Парсим все страницы
    const vacancies = await parseAllWithPagination(query, maxPages);

    const response = {
      vacancies,
      total: vacancies.length,
      query,
      maxPages,
      sources: {
        geekjob: vacancies.filter(v => v.source === 'geekjob').length,
        hh: vacancies.filter(v => v.source === 'hh').length
      }
    };

    console.log(`✅ Парсинг с пагинацией завершен: ${vacancies.length} вакансий`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Ошибка API /api/parse-vacancies-pagination:', error);
    return NextResponse.json(
      { error: 'Ошибка при парсинге вакансий с пагинацией' },
      { status: 500 }
    );
  }
}