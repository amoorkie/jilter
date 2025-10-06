// src/lib/cache/redis.ts
// Простая реализация кэша на основе Map для разработки
// В продакшене заменить на Redis

class SimpleCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5 минут

  set(key: string, data: any, ttl: number = this.defaultTTL): void {
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Очистка просроченных элементов
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new SimpleCache();

// Очищаем кэш каждые 10 минут
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

export { cache };

