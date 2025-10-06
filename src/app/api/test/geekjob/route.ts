// Тест Geekjob парсера
import { NextRequest, NextResponse } from 'next/server';
import { parseGeekjobVacancies } from '@/lib/parsers/geekjob/parser';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Тестируем Geekjob парсер');
    
    const vacancies = await parseGeekjobVacancies('дизайнер', 1);
    
    return NextResponse.json({
      source: 'Geekjob',
      vacancies: vacancies,
      count: vacancies.length
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка Geekjob парсера:', error);
    return NextResponse.json(
      { error: 'Ошибка Geekjob парсера', details: error.message },
      { status: 500 }
    );
  }
}















