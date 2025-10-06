// src/app/api/user-actions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { saveUserAction } from '@/lib/database/service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vacancy_id, action, user_id } = body;

    console.log('🔍 API /api/user-actions POST вызван:', { vacancy_id, action, user_id });

    // Сохраняем действие в БД
    const success = await saveUserAction(user_id, vacancy_id, action);

    if (!success) {
      return NextResponse.json(
        { error: 'Ошибка при сохранении действия' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Действие ${action} для вакансии ${vacancy_id} сохранено`
    });

  } catch (error) {
    console.error('❌ Ошибка API /api/user-actions:', error);
    return NextResponse.json(
      { error: 'Ошибка при сохранении действия' },
      { status: 500 }
    );
  }
}
