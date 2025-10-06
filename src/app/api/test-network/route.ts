// Тест сетевого подключения
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🌐 Тестируем сетевое подключение...');
    
    // Тестируем доступность разных URL
    const testUrls = [
      'https://httpbin.org/get',
      'https://api.github.com',
      'https://gigachat.devices.sberbank.ru/api/v1/models',
      'https://ngw.devices.sberbank.ru:9443/api/v2/oauth'
    ];
    
    const results = [];
    
    for (const url of testUrls) {
      try {
        console.log(`🔍 Тестируем: ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        results.push({
          url,
          status: response.status,
          ok: response.ok,
          error: null
        });
        
        console.log(`✅ ${url}: ${response.status}`);
      } catch (error) {
        results.push({
          url,
          status: null,
          ok: false,
          error: error.message
        });
        
        console.log(`❌ ${url}: ${error.message}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Тест сетевого подключения завершен',
      results
    });
    
  } catch (error) {
    console.error('❌ Ошибка тестирования сети:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}







