# 📱 Полная настройка Telegram парсинга

## 🚨 **Проблема:**
Telegram каналы не показывают сообщения на веб-странице без авторизации. Нужен Telegram Bot API токен.

## 🔧 **Решение 1: Telegram Bot API (Рекомендуется)**

### **Шаг 1: Создайте Telegram бота**

1. Откройте Telegram и найдите **@BotFather**
2. Отправьте команду `/newbot`
3. Введите имя бота: `Job Parser Bot`
4. Введите username: `job_parser_bot` (должен заканчиваться на `_bot`)
5. **Скопируйте полученный токен** (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### **Шаг 2: Добавьте токен в .env.local**

Создайте файл `.env.local` в корне проекта:

```bash
# Telegram Bot API
TELEGRAM_BOT_TOKEN=ваш_токен_сюда
```

### **Шаг 3: Перезапустите сервер**

```bash
npm run dev
```

## 🔧 **Решение 2: RSS фиды (Альтернатива)**

### **Популярные RSS фиды для Telegram:**

1. **RSSHub** - `https://rsshub.app/telegram/channel/designhunters`
2. **Telegram RSS** - `https://t.me/s/designhunters/rss`
3. **Telegram Web** - `https://t.me/designhunters/rss`

### **Настройка RSS парсинга:**

В `src/lib/parsers/telegram/parser.ts` добавьте RSS URL:

```typescript
const rssUrls = [
  'https://rsshub.app/telegram/channel/designhunters',
  'https://t.me/s/designhunters/rss',
  'https://t.me/designhunters/rss'
];
```

## 🔧 **Решение 3: Веб-скрапинг (Ограниченно)**

### **Проблема:**
Telegram каналы показывают только описание канала, а не сообщения.

### **Решение:**
Используйте специализированные сервисы:
- **Telegram Web** - `https://t.me/s/designhunters`
- **Telegram RSS** - `https://t.me/designhunters/rss`

## 📊 **Текущий статус:**

| Метод | Статус | Описание |
|-------|--------|----------|
| **Bot API** | ❌ Не настроен | Нужен токен |
| **RSS** | ⚠️ Ограниченно | Работает для некоторых каналов |
| **Веб-скрапинг** | ❌ Не работает | Telegram блокирует |

## 🎯 **Рекомендации:**

### **Для продакшена:**
1. **Создайте Telegram бота** через @BotFather
2. **Добавьте токен** в `.env.local`
3. **Перезапустите сервер**

### **Для тестирования:**
1. **Используйте RSS фиды** для публичных каналов
2. **Настройте RSSHub** для приватных каналов
3. **Используйте веб-скрапинг** для статических страниц

## 🚀 **Быстрый старт:**

```bash
# 1. Создайте .env.local
echo "TELEGRAM_BOT_TOKEN=ваш_токен_сюда" > .env.local

# 2. Перезапустите сервер
npm run dev

# 3. Проверьте логи
# Должно появиться: "🎯 Начинаем парсинг Telegram-канала @designhunters"
```

## 📋 **Популярные каналы для парсинга:**

| Канал | Username | RSS URL |
|-------|----------|---------|
| **Design Hunters** | @designhunters | `https://t.me/s/designhunters/rss` |
| **Design Jobs** | @designjobs | `https://t.me/s/designjobs/rss` |
| **UX Jobs** | @uxjobs | `https://t.me/s/uxjobs/rss` |
| **Product Jobs** | @productjobs | `https://t.me/s/productjobs/rss` |

## ⚠️ **Важно:**

- **Telegram Bot API** - самый надежный метод
- **RSS фиды** - работают для публичных каналов
- **Веб-скрапинг** - ограниченно, только мета-данные

**После настройки токена Telegram парсинг будет работать автоматически каждые 4 часа!** 🚀















