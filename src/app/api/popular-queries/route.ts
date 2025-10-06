// src/app/api/popular-queries/route.ts
import { NextResponse } from 'next/server';
import { POPULAR_QUERIES } from '@/lib/config/popular-queries';

export async function GET() {
  try {
    // Пока возвращаем статичный список
    // В будущем здесь будет логика получения из аналитики
    const popularQueries = POPULAR_QUERIES.slice(0, 50); // Ограничиваем до 50
    
    return NextResponse.json({
      queries: popularQueries,
      total: popularQueries.length
    });

  } catch (error) {
    console.error('❌ Ошибка API /api/popular-queries:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении популярных запросов' },
      { status: 500 }
    );
  }
}
