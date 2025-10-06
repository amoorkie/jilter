// Тест HH.ru парсера
import { NextRequest, NextResponse } from 'next/server';
import { parseHHVacancies } from '@/lib/parsers/hh/parser';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Тестируем HH.ru парсер');
    
    const vacancies = await parseHHVacancies('дизайнер', 1);
    
    return NextResponse.json({
      source: 'HH.ru',
      vacancies: vacancies,
      count: vacancies.length
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка HH.ru парсера:', error);
    return NextResponse.json(
      { error: 'Ошибка HH.ru парсера', details: error.message },
      { status: 500 }
    );
  }
}















