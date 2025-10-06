import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Начало входа пользователя');
    const { email, password } = await request.json();
    console.log('📧 Email:', email);

    // Валидация
    if (!email || !password) {
      console.log('❌ Валидация не пройдена: не все поля заполнены');
      return NextResponse.json(
        { error: 'Email и пароль обязательны' },
        { status: 400 }
      );
    }

    console.log('🗄️ Инициализация базы данных...');
    const db = new SQLiteService();

    // Аутентифицируем пользователя
    console.log('🔍 Аутентификация пользователя...');
    const user = await db.authenticateUser(email, password);
    
    if (!user) {
      console.log('❌ Аутентификация не удалась');
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    console.log('✅ Пользователь аутентифицирован:', user.id);

    // Убираем пароль из ответа
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'Успешный вход',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Ошибка при входе:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
