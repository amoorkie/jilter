# 🚀 Инструкции по деплою Job Filter MVP

## Варианты деплоя

### 1. Docker (Рекомендуется)

#### Требования
- Docker
- Docker Compose

#### Быстрый старт
```bash
# Клонируйте репозиторий
git clone <your-repo-url>
cd job-filter-mvp

# Запустите деплой
./deploy.sh
```

#### Ручной деплой
```bash
# Создайте .env файл
cp .env.example .env
# Отредактируйте .env с вашими настройками

# Создайте директорию для данных
mkdir -p data

# Запустите контейнеры
docker-compose up --build -d

# Проверьте статус
docker-compose ps

# Посмотрите логи
docker-compose logs -f
```

### 2. VPS/Сервер

#### Требования
- Ubuntu 20.04+ / CentOS 7+
- Node.js 18+
- Python 3.8+
- Nginx (опционально)

#### Установка
```bash
# Обновите систему
sudo apt update && sudo apt upgrade -y

# Установите Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установите Python и зависимости
sudo apt install -y python3 python3-pip python3-venv
pip3 install requests beautifulsoup4 playwright better-sqlite3

# Установите браузеры для Playwright
playwright install chromium

# Клонируйте репозиторий
git clone <your-repo-url>
cd job-filter-mvp

# Установите зависимости
npm install

# Создайте .env файл
cp .env.example .env
nano .env

# Соберите приложение
npm run build

# Запустите приложение
npm start
```

#### Настройка Nginx (опционально)
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Vercel (Только фронтенд)

⚠️ **Ограничения**: Vercel не поддерживает Python парсеры и SQLite. Нужно будет использовать внешние API.

```bash
# Установите Vercel CLI
npm i -g vercel

# Деплой
vercel

# Настройте переменные окружения в Vercel Dashboard
```

### 4. Railway

```bash
# Установите Railway CLI
npm install -g @railway/cli

# Логин
railway login

# Инициализация
railway init

# Деплой
railway up
```

## Настройка переменных окружения

Создайте `.env` файл:

```env
# Основные настройки
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key-here

# OAuth провайдеры (опционально)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
YANDEX_CLIENT_ID=your-yandex-client-id
YANDEX_CLIENT_SECRET=your-yandex-client-secret

# Email провайдер (опционально)
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

## Мониторинг и логи

### Docker
```bash
# Посмотреть логи
docker-compose logs -f

# Перезапустить сервисы
docker-compose restart

# Остановить сервисы
docker-compose down
```

### Системные сервисы
```bash
# Создайте systemd сервис
sudo nano /etc/systemd/system/job-filter.service

[Unit]
Description=Job Filter MVP
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/job-filter-mvp
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Включите и запустите сервис
sudo systemctl enable job-filter
sudo systemctl start job-filter
sudo systemctl status job-filter
```

## Безопасность

1. **Измените пароли по умолчанию**:
   - Админ: `admin` / `password`
   - NEXTAUTH_SECRET

2. **Настройте HTTPS** (рекомендуется):
   - Используйте Let's Encrypt
   - Настройте SSL в Nginx

3. **Ограничьте доступ**:
   - Настройте firewall
   - Используйте VPN для админки

4. **Регулярные бэкапы**:
   ```bash
   # Бэкап базы данных
   cp data/job_filter.db backups/job_filter_$(date +%Y%m%d).db
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
python3 -c "import requests, bs4, playwright"

# Переустановите браузеры
playwright install chromium
```

### Проблемы с базой данных
```bash
# Проверьте права доступа
ls -la data/

# Восстановите из бэкапа
cp backups/job_filter_20240101.db data/job_filter.db
```

### Проблемы с портами
```bash
# Проверьте занятые порты
netstat -tulpn | grep :3000

# Освободите порт
sudo fuser -k 3000/tcp
```

## Поддержка

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Проверьте health check: `curl http://localhost:3000/api/health`
4. Создайте issue в репозитории

