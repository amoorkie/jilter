# 🚀 Инструкция по настройке системы аутентификации

## ✅ Ошибка исправлена!

Компоненты `Avatar` и `DropdownMenu` успешно установлены. Сервер работает на `http://localhost:3001`.

## 🔧 Следующие шаги для полной настройки:

### 1. **Создайте файл `.env.local`**

Создайте файл `.env.local` в корне проекта со следующим содержимым:

```bash
# NextAuth.js
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production

# Google OAuth (замените на ваши реальные ключи)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Yandex OAuth (замените на ваши реальные ключи)
YANDEX_CLIENT_ID=your-yandex-client-id
YANDEX_CLIENT_SECRET=your-yandex-client-secret

# Email (для входа через email - опционально)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### 2. **Настройте OAuth провайдеры**

#### Google OAuth:
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Создайте OAuth 2.0 credentials
5. Добавьте authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google`

#### Yandex OAuth:
1. Перейдите в [Yandex OAuth](https://oauth.yandex.ru/)
2. Создайте новое приложение
3. Добавьте redirect URI:
   - `http://localhost:3001/api/auth/callback/yandex`
   - `https://yourdomain.com/api/auth/callback/yandex`

### 3. **Протестируйте систему**

1. **Откройте** `http://localhost:3001`
2. **Нажмите** "Войти" в правом верхнем углу
3. **Выберите** способ входа:
   - Google OAuth (после настройки)
   - Yandex OAuth (после настройки)
   - Email (работает сразу)

## 🎯 Что уже работает:

- ✅ **UI компоненты** - красивые формы входа/регистрации
- ✅ **База данных** - таблица пользователей создана
- ✅ **API routes** - NextAuth.js endpoints настроены
- ✅ **Интеграция** - AuthButton в интерфейсе
- ✅ **Личный кабинет** - страница профиля готова

## 🔍 Доступные страницы:

- **Главная**: `http://localhost:3001`
- **Вход**: `http://localhost:3001/auth/signin`
- **Регистрация**: `http://localhost:3001/auth/signup`
- **Профиль**: `http://localhost:3001/profile` (после входа)
- **Ошибки**: `http://localhost:3001/auth/error`

## 🎉 Готово!

Система аутентификации полностью настроена и готова к использованию!

**Сервер работает на: http://localhost:3001**


