import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

// POST - добавление реакции на комментарий
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { type } = await request.json();
    const { id: commentId } = await params;

    if (!type || !['like', 'dislike'].includes(type)) {
      return NextResponse.json(
        { error: 'Тип реакции должен быть "like" или "dislike"' },
        { status: 400 }
      );
    }

    // Получаем пользователя из заголовков (временное решение для тестирования)
    const userId = request.headers.get('x-user-id') || 'test-user-123';

    const db = new SQLiteService();
    db.addCommentReaction(commentId, userId, type as 'like' | 'dislike');

    return NextResponse.json({
      message: 'Реакция добавлена'
    });

  } catch (error) {
    console.error('Ошибка при добавлении реакции:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
