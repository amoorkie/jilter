import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.headers.get('x-admin-token');
    
    if (!adminToken) {
      return NextResponse.json(
        { error: 'Токен администратора не предоставлен' },
        { status: 401 }
      );
    }

    // Проверяем формат токена
    if (!adminToken.startsWith('admin_')) {
      return NextResponse.json(
        { error: 'Недействительный токен администратора' },
        { status: 401 }
      );
    }

    // В реальном приложении здесь должна быть проверка JWT токена
    // Для простоты просто проверяем формат

    return NextResponse.json({
      valid: true,
      message: 'Токен администратора действителен'
    });

  } catch (error) {
    console.error('Ошибка проверки токена администратора:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

