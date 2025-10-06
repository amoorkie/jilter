import { NextRequest, NextResponse } from 'next/server';
import { SQLiteService } from '@/lib/database/sqlite-service';
import bcrypt from 'bcryptjs';

// Админские учетные данные (в реальном приложении должны быть в переменных окружения)
const ADMIN_CREDENTIALS = {
  login: 'admin',
  password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
  name: 'Администратор',
  role: 'admin'
};

export async function POST(request: NextRequest) {
  try {
    const { login, password } = await request.json();

    if (!login || !password) {
      return NextResponse.json(
        { error: 'Логин и пароль обязательны' },
        { status: 400 }
      );
    }

    // Проверяем учетные данные админа
    if (login !== ADMIN_CREDENTIALS.login) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Неверный логин или пароль' },
        { status: 401 }
      );
    }

    // Создаем токен админа (в реальном приложении используйте JWT)
    const adminToken = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Сохраняем сессию админа в базе данных
    const db = new SQLiteService();
    
    // Создаем или обновляем запись админа в базе
    try {
      const existingAdmin = db.getUserByEmail('admin@system.local');
      if (existingAdmin) {
        db.updateUserLastLogin(existingAdmin.id);
      } else {
        // Создаем запись админа в базе
        db.createUser({
          id: 'admin-user-001',
          email: 'admin@system.local',
          name: ADMIN_CREDENTIALS.name,
          provider: 'admin',
          provider_id: 'admin',
          password: ADMIN_CREDENTIALS.password,
          is_active: true
        });
      }
    } catch (error) {
      console.error('Ошибка при работе с админом в базе:', error);
    }

    return NextResponse.json({
      message: 'Успешный вход в админку',
      token: adminToken,
      admin: {
        id: 'admin-user-001',
        login: ADMIN_CREDENTIALS.login,
        name: ADMIN_CREDENTIALS.name,
        role: ADMIN_CREDENTIALS.role
      }
    });

  } catch (error) {
    console.error('Ошибка при входе в админку:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

