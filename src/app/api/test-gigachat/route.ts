// API для тестирования GigaChat
import { NextRequest, NextResponse } from 'next/server';
import { GigaChatService } from '@/lib/ai/gigachat-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Тестируем GigaChat API...');
    
    // Проверяем переменные окружения
    const authKey = process.env.GIGACHAT_AUTHORIZATION_KEY;
    console.log('🔍 GIGACHAT_AUTHORIZATION_KEY:', authKey ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН');
    console.log('📝 Длина ключа:', authKey?.length || 0);
    console.log('📝 Первые 20 символов:', authKey?.substring(0, 20) + '...' || 'НЕТ');
    
    if (!authKey) {
      return NextResponse.json({
        success: false,
        error: 'GIGACHAT_AUTHORIZATION_KEY не установлен',
        env: {
          NODE_ENV: process.env.NODE_ENV,
          hasAuthKey: !!authKey,
          keyLength: authKey?.length || 0
        }
      });
    }
    
    // Создаем сервис
    const service = new GigaChatService();
    
    // Тестируем простой анализ
    const testText = 'Требуется UI/UX дизайнер. Обязанности: создание интерфейсов. Требования: опыт 2 года.';
    console.log('📝 Тестируем анализ текста:', testText);
    
    console.log('🔄 Вызываем analyzeVacancy...');
    const result = await service.analyzeVacancy(testText);
    console.log('📊 Результат analyzeVacancy:', result);
    
    return NextResponse.json({
      success: true,
      message: 'GigaChat тест завершен',
      result: result,
      env: {
        hasAuthKey: !!authKey,
        keyLength: authKey.length,
        keyPrefix: authKey.substring(0, 20) + '...'
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка тестирования GigaChat:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
