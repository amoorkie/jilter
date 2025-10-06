# Настройка Ollama для локального AI

## Установка Ollama

### Windows:
1. Скачайте Ollama с https://ollama.ai/download
2. Установите и запустите Ollama
3. В терминале выполните:
   ```bash
   ollama pull llama2
   ollama pull codellama
   ```

### Использование:
```bash
# Запуск модели
ollama run llama2

# Или через API
curl http://localhost:11434/api/generate -d '{
  "model": "llama2",
  "prompt": "Привет! Как дела?"
}'
```

## Интеграция в проект

Создайте файл `src/lib/ai/ollama-service.ts`:

```typescript
export async function analyzeVacancyWithOllama(prompt: string): Promise<string> {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama2',
      prompt: prompt,
      stream: false
    })
  });
  
  const data = await response.json();
  return data.response;
}
```

## Преимущества:
- ✅ Полностью бесплатно
- ✅ Работает локально
- ✅ Нет ограничений по региону
- ✅ Приватность данных

## Недостатки:
- ❌ Требует мощный компьютер
- ❌ Медленнее облачных API
- ❌ Ограниченные возможности














