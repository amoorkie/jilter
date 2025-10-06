import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    const db = new SQLiteService();
    const user = db.getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Убираем пароль из ответа
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Ошибка при получении профиля пользователя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId, preferences } = await request.json();

    if (!userId || !preferences) {
      return NextResponse.json(
        { error: 'ID пользователя и настройки обязательны' },
        { status: 400 }
      );
    }

    const db = new SQLiteService();
    const updatedUser = db.updateUser(userId, {
      preferences: preferences
    });

    // Убираем пароль из ответа
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      message: 'Настройки сохранены',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


