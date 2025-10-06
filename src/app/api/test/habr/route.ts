// Тест Хабр Карьера парсера
import { NextRequest, NextResponse } from 'next/server';
import { parseHabrVacancies } from '@/lib/parsers/habr/parser';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Тестируем Хабр Карьера парсер');
    
    const vacancies = await parseHabrVacancies('дизайнер', 1);
    
    return NextResponse.json({
      source: 'Хабр Карьера',
      vacancies: vacancies,
      count: vacancies.length
    });
    
  } catch (error: any) {
    console.error('❌ Ошибка Хабр Карьера парсера:', error);
    return NextResponse.json(
      { error: 'Ошибка Хабр Карьера парсера', details: error.message },
      { status: 500 }
    );
  }
}















