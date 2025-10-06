# Настройка OAuth провайдеров

## 1. Google OAuth

### Создание проекта в Google Cloud Console
1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API:
   - Перейдите в "APIs & Services" → "Library"
   - Найдите "Google+ API" и включите его

### Создание OAuth 2.0 credentials
1. Перейдите в "APIs & Services" → "Credentials"
2. Нажмите "Create Credentials" → "OAuth 2.0 Client IDs"
3. Выберите "Web application"
4. Добавьте авторизованные URI:
   - **Authorized JavaScript origins**: `http://localhost:3001`
   - **Authorized redirect URIs**: `http://localhost:3001/api/auth/callback/google`

## 2. Yandex OAuth

### Создание приложения в Yandex
1. Перейдите в [Yandex OAuth](https://oauth.yandex.ru/)
2. Нажмите "Создать приложение"
3. Заполните форму:
   - **Название**: Job Filter MVP
   - **Описание**: Поиск вакансий для дизайнеров
   - **Callback URI**: `http://localhost:3001/api/auth/callback/yandex`
   - **Платформы**: Web services

## 3. Настройка переменных окружения

Создайте файл `.env.local` в корне проекта со следующим содержимым:

```env
# NextAuth.js
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Yandex OAuth
YANDEX_CLIENT_ID=your-yandex-client-id
YANDEX_CLIENT_SECRET=your-yandex-client-secret

# Email (временно отключен)
# EMAIL_SERVER_HOST=smtp.gmail.com
# EMAIL_SERVER_PORT=587
# EMAIL_SERVER_USER=your-email@gmail.com
# EMAIL_SERVER_PASSWORD=your-app-password
# EMAIL_FROM=your-email@gmail.com
```

## 4. Генерация NEXTAUTH_SECRET

Для генерации безопасного секрета выполните:

```bash
openssl rand -base64 32
```

Или используйте онлайн генератор: https://generate-secret.vercel.app/32

## 5. Проверка работы

После настройки всех переменных:

1. Перезапустите сервер разработки:
   ```bash
   npm run dev
   ```

2. Перейдите на страницу входа: http://localhost:3001/auth/signin

3. Попробуйте войти через Google или Yandex

## Возможные проблемы

### Google OAuth
- Убедитесь, что Google+ API включен
- Проверьте правильность redirect URI
- Убедитесь, что приложение не в режиме тестирования (если нужно)

### Yandex OAuth
- Убедитесь, что callback URI точно совпадает
- Проверьте, что приложение создано и активно

### Общие проблемы
- Проверьте правильность всех переменных в `.env.local`
- Убедитесь, что файл `.env.local` находится в корне проекта
- Перезапустите сервер после изменения переменных окружения


