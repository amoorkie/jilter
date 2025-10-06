# Используем официальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем директорию для данных
RUN mkdir -p data

# Устанавливаем Python и необходимые пакеты для парсеров
RUN apk add --no-cache \
    python3 \
    py3-pip \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Устанавливаем Python зависимости
RUN pip3 install --no-cache-dir \
    requests \
    beautifulsoup4 \
    playwright \
    better-sqlite3

# Устанавливаем браузеры для Playwright
RUN playwright install chromium

# Собираем приложение
RUN npm run build

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]

