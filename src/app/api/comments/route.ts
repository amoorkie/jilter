import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

// GET - получение комментариев для вакансии
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vacancyId = searchParams.get('vacancyId');

    if (!vacancyId) {
      return NextResponse.json(
        { error: 'ID вакансии обязателен' },
        { status: 400 }
      );
    }

    const db = new SQLiteService();
    const comments = db.getCommentsByVacancyId(parseInt(vacancyId));

    return NextResponse.json({
      comments: comments
    });

  } catch (error) {
    console.error('Ошибка при получении комментариев:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST - создание нового комментария
export async function POST(request: NextRequest) {
  try {
    const { vacancyId, content, parentId } = await request.json();

    if (!vacancyId || !content) {
      return NextResponse.json(
        { error: 'ID вакансии и содержимое комментария обязательны' },
        { status: 400 }
      );
    }

    // Получаем пользователя из заголовков (временное решение для тестирования)
    const userId = request.headers.get('x-user-id') || 'test-user-123';
    
    const db = new SQLiteService();
    const commentId = db.createComment(parseInt(vacancyId), userId, content, parentId);

    return NextResponse.json({
      message: 'Комментарий создан',
      commentId: commentId
    });

  } catch (error) {
    console.error('Ошибка при создании комментария:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
