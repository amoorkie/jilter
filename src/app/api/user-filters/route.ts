// src/app/api/user-filters/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'anonymous';

    console.log('🔍 API /api/user-filters GET вызван для пользователя:', userId);

    // Пока возвращаем заглушку, так как Supabase не настроен
    const userFilters = {
      enabledTokens: [],
      disabledTokens: [],
      customFilters: []
    };

    return NextResponse.json(userFilters);

  } catch (error) {
    console.error('❌ Ошибка API /api/user-filters:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении фильтров пользователя' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tokenId, action } = body;

    console.log('🔍 API /api/user-filters POST вызван:', { userId, tokenId, action });

    // Пока возвращаем успешный ответ, так как Supabase не настроен
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Ошибка API /api/user-filters POST:', error);
    return NextResponse.json(
      { error: 'Ошибка при обновлении фильтров пользователя' },
      { status: 500 }
    );
  }
}