# 🚀 Job Filter MVP - Деплой

## Быстрый старт

### 1. Docker (Рекомендуется)

```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd job-filter-mvp

# Запустите деплой
./deploy.sh
```

### 2. Ручной деплой

```bash
# Установите зависимости
npm install

# Создайте .env файл
cp .env.example .env
# Отредактируйте .env с вашими настройками

# Соберите приложение
npm run build

# Запустите приложение
npm start
```

## Настройка

### Переменные окружения

Создайте `.env` файл:

```env
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key-here
```

### Админка

- URL: `https://your-domain.com/admin`
- Логин: `admin`
- Пароль: `password`

⚠️ **Обязательно измените пароль админа в production!**

## Мониторинг

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Логи Docker
```bash
docker-compose logs -f
```

### Статус сервисов
```bash
docker-compose ps
```

## Обновление

```bash
# Остановите сервисы
docker-compose down

# Обновите код
git pull origin main

# Пересоберите и запустите
docker-compose up --build -d
```

## Устранение неполадок

### Проблемы с парсерами
```bash
# Проверьте Python зависимости
docker-compose exec job-filter python3 -c "import requests, bs4, playwright"
```

### Проблемы с базой данных
```bash
# Проверьте права доступа
ls -la data/

# Восстановите из бэкапа
cp backups/job_filter_20240101.db data/job_filter.db
```

## Поддержка

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Проверьте health check: `curl http://localhost:3000/api/health`
4. Создайте issue в репозитории

