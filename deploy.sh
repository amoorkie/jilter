#!/bin/bash

# Скрипт для деплоя Job Filter MVP

echo "🚀 Начинаем деплой Job Filter MVP..."

# Проверяем, что Docker установлен
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Установите Docker и попробуйте снова."
    exit 1
fi

# Проверяем, что Docker Compose установлен
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    exit 1
fi

# Создаем директорию для данных
mkdir -p data

# Создаем .env файл если его нет
if [ ! -f .env ]; then
    echo "📝 Создаем .env файл..."
    cat > .env << EOF
NODE_ENV=production
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
YANDEX_CLIENT_ID=your-yandex-client-id
YANDEX_CLIENT_SECRET=your-yandex-client-secret
EOF
    echo "✅ .env файл создан. Отредактируйте его с вашими настройками."
fi

# Останавливаем существующие контейнеры
echo "🛑 Останавливаем существующие контейнеры..."
docker-compose down

# Собираем и запускаем контейнеры
echo "🔨 Собираем и запускаем контейнеры..."
docker-compose up --build -d

# Ждем запуска
echo "⏳ Ждем запуска приложения..."
sleep 10

# Проверяем статус
echo "📊 Проверяем статус..."
docker-compose ps

# Проверяем здоровье приложения
echo "🏥 Проверяем здоровье приложения..."
if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Приложение успешно запущено!"
    echo "🌐 Откройте http://localhost:3000 в браузере"
else
    echo "❌ Приложение не отвечает. Проверьте логи:"
    echo "docker-compose logs"
fi

echo "🎉 Деплой завершен!"

