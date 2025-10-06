import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Начало регистрации пользователя');
    const { email, password, name } = await request.json();
    console.log('📧 Email:', email, 'Имя:', name);

    // Валидация
    if (!email || !password || !name) {
      console.log('❌ Валидация не пройдена: не все поля заполнены');
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      console.log('❌ Валидация не пройдена: пароль слишком короткий');
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    console.log('🗄️ Инициализация базы данных...');
    const db = new SQLiteService();

    // Проверяем, существует ли пользователь
    console.log('🔍 Проверка существующего пользователя...');
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      console.log('❌ Пользователь уже существует');
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      );
    }

    // Хешируем пароль
    console.log('🔒 Хеширование пароля...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Создаем пользователя
    console.log('👤 Создание пользователя...');
    const user = db.createUser({
      email,
      name,
      password: hashedPassword,
      provider: 'email'
    });

    console.log('✅ Пользователь создан:', user.id);

    // Убираем пароль из ответа
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'Пользователь успешно создан',
      user: userWithoutPassword
    });

  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
