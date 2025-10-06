// src/app/api/filter-suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const minUsers = parseInt(searchParams.get('minUsers') || '10');
    const userId = searchParams.get('userId') || 'anonymous';

    console.log('🔍 API /api/filter-suggestions GET вызван для пользователя:', userId);

    // Пока возвращаем заглушку, так как Supabase не настроен
    const suggestions = [
      { id: 'react', text: 'React', count: 150, type: 'positive' },
      { id: 'typescript', text: 'TypeScript', count: 120, type: 'positive' },
      { id: 'nodejs', text: 'Node.js', count: 100, type: 'positive' },
      { id: 'python', text: 'Python', count: 90, type: 'positive' },
      { id: 'java', text: 'Java', count: 80, type: 'positive' },
      { id: 'php', text: 'PHP', count: 70, type: 'negative' },
      { id: 'jquery', text: 'jQuery', count: 60, type: 'negative' },
      { id: 'wordpress', text: 'WordPress', count: 50, type: 'negative' }
    ].filter(s => s.count >= minUsers);

    return NextResponse.json({
      suggestions,
      total: suggestions.length
    });

  } catch (error) {
    console.error('❌ Ошибка API /api/filter-suggestions:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении рекомендаций фильтров' },
      { status: 500 }
    );
  }
}
