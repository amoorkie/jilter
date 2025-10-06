// Тест GetMatch парсера
import { NextRequest, NextResponse } from 'next/server';
import { parseGetMatchVacancies } from '@/lib/parsers/getmatch/parser';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Тестируем GetMatch парсер');
    
    const vacancies = await parseGetMatchVacancies('дизайнер', 1);
    
    return NextResponse.json({
      source: 'GetMatch',
      vacancies: vacancies,
      count: vacancies.length
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка GetMatch парсера:', error);
    return NextResponse.json(
      { error: 'Ошибка GetMatch парсера', details: error.message },
      { status: 500 }
    );
  }
}















