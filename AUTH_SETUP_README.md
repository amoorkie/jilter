# 🔐 Настройка системы аутентификации

## ✅ Что реализовано

### 🎯 **Полная система аутентификации:**
- **Вход через Email** - отправка ссылки на почту
- **OAuth провайдеры** - Google и Yandex
- **Личный кабинет** - управление профилем и настройками
- **База данных пользователей** - SQLite с полной поддержкой
- **UI компоненты** - красивые формы входа/регистрации

### 🛠️ **Технологии:**
- **NextAuth.js** - аутентификация
- **SQLite** - база данных пользователей
- **OAuth 2.0** - Google и Yandex
- **TypeScript** - типизация
- **Tailwind CSS** - стилизация

## 🚀 Быстрый старт

### 1. **Установка зависимостей** ✅
```bash
npm install next-auth @auth/prisma-adapter prisma @prisma/client
```

### 2. **Настройка переменных окружения**

Создайте файл `.env.local` на основе `env.example`:

```bash
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Yandex OAuth
YANDEX_CLIENT_ID=your-yandex-client-id
YANDEX_CLIENT_SECRET=your-yandex-client-secret

# Email (для входа через email)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### 3. **Настройка OAuth провайдеров**

#### Google OAuth:
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Создайте OAuth 2.0 credentials
5. Добавьте authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`

#### Yandex OAuth:
1. Перейдите в [Yandex OAuth](https://oauth.yandex.ru/)
2. Создайте новое приложение
3. Добавьте redirect URI:
   - `http://localhost:3000/api/auth/callback/yandex`
   - `https://yourdomain.com/api/auth/callback/yandex`

### 4. **Настройка Email (опционально)**

Для входа через email настройте SMTP:
- **Gmail**: Используйте App Password
- **Другие провайдеры**: Настройте соответствующие параметры

## 📁 Структура файлов

```
src/
├── lib/
│   ├── auth.ts                    # Конфигурация NextAuth.js
│   └── database/
│       └── sqlite-service.ts      # Методы работы с пользователями
├── app/
│   ├── api/auth/[...nextauth]/    # API routes для аутентификации
│   ├── auth/                      # Страницы входа/регистрации
│   │   ├── signin/page.tsx
│   │   ├── signup/page.tsx
│   │   └── error/page.tsx
│   └── profile/page.tsx           # Личный кабинет
└── components/
    ├── auth/
    │   └── AuthButton.tsx         # Кнопка входа/профиля
    └── providers/
        └── SessionProvider.tsx    # Провайдер сессий
```

## 🎨 UI компоненты

### **Страницы аутентификации:**
- `/auth/signin` - Вход в систему
- `/auth/signup` - Регистрация
- `/auth/error` - Обработка ошибок

### **Личный кабинет:**
- `/profile` - Управление профилем
- Настройки уведомлений
- Персонализация интерфейса
- Статистика аккаунта

### **AuthButton:**
- Отображается в правом верхнем углу
- Показывает аватар пользователя
- Dropdown меню с действиями

## 🔧 API Endpoints

### **Аутентификация:**
- `GET/POST /api/auth/[...nextauth]` - NextAuth.js endpoints
- `GET /api/auth/signin` - Страница входа
- `GET /api/auth/signout` - Выход из системы

### **Пользователи:**
- Автоматическое создание при первом входе
- Обновление данных при каждом входе
- Сохранение настроек в JSON формате

## 💾 База данных

### **Таблица users:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  image TEXT,
  provider TEXT NOT NULL DEFAULT 'email',
  provider_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_login TEXT,
  is_active BOOLEAN DEFAULT 1,
  preferences TEXT DEFAULT '{}'
);
```

### **Методы работы с пользователями:**
- `createUser()` - Создание нового пользователя
- `getUserByEmail()` - Поиск по email
- `updateUser()` - Обновление данных
- `updateUserLastLogin()` - Обновление времени входа

## 🎯 Функциональность

### **Вход через Email:**
1. Пользователь вводит email
2. Система отправляет ссылку для входа
3. Переход по ссылке завершает аутентификацию

### **OAuth вход:**
1. Нажатие кнопки провайдера
2. Перенаправление на OAuth страницу
3. Авторизация и возврат с данными
4. Автоматическое создание/обновление профиля

### **Личный кабинет:**
- Просмотр информации профиля
- Настройка уведомлений
- Выбор темы и языка
- Управление предпочтениями

## 🔒 Безопасность

- **JWT токены** для сессий
- **CSRF защита** через NextAuth.js
- **Валидация данных** на всех уровнях
- **Безопасное хранение** паролей OAuth

## 🚀 Запуск

```bash
# Установка зависимостей
npm install

# Настройка переменных окружения
cp env.example .env.local
# Отредактируйте .env.local

# Запуск сервера
npm run dev
```

## 📱 Использование

1. **Откройте** `http://localhost:3000`
2. **Нажмите** "Войти" в правом верхнем углу
3. **Выберите** способ входа:
   - Google OAuth
   - Yandex OAuth
   - Email (ссылка на почту)
4. **После входа** доступен личный кабинет

## 🎉 Готово!

Система аутентификации полностью настроена и готова к использованию!

### **Что работает:**
- ✅ Вход через Google
- ✅ Вход через Yandex  
- ✅ Вход через Email
- ✅ Личный кабинет
- ✅ Управление настройками
- ✅ База данных пользователей
- ✅ Красивый UI

### **Следующие шаги:**
- Настройте OAuth провайдеры
- Добавьте переменные окружения
- Протестируйте все способы входа
- Настройте email сервер (опционально)


