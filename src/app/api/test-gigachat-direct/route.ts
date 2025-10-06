// Прямой тест GigaChat API
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Прямой тест GigaChat API...');
    
    const authKey = process.env.GIGACHAT_AUTHORIZATION_KEY;
    console.log('🔑 Ключ авторизации:', authKey ? 'УСТАНОВЛЕН' : 'НЕ УСТАНОВЛЕН');
    
    if (!authKey) {
      return NextResponse.json({
        success: false,
        error: 'GIGACHAT_AUTHORIZATION_KEY не установлен'
      });
    }
    
    // Генерируем RqUID
    const rqUID = crypto.randomUUID();
    console.log('🆔 RqUID:', rqUID);
    
    // URL для получения токена
    const authUrl = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    
    console.log('🌐 Отправляем запрос к:', authUrl);
    console.log('📝 Заголовки:', {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'RqUID': rqUID,
      'Authorization': `Basic ${authKey.substring(0, 20)}...`
    });
    
    // Используем https модуль для обхода проблем с SSL
    const https = require('https');
    const url = require('url');
    
    const response = await new Promise((resolve, reject) => {
      const urlObj = new URL(authUrl);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'RqUID': rqUID,
          'Authorization': `Basic ${authKey}`,
        },
        rejectUnauthorized: false // Отключаем проверку SSL сертификатов
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data))
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write('scope=GIGACHAT_API_PERS');
      req.end();
    });
    
    console.log('📊 Статус ответа:', response.status);
    console.log('📊 Статус текст:', response.statusText);
    
    const responseText = await response.text();
    console.log('📝 Текст ответа:', responseText);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Ошибка API: ${response.status} ${response.statusText}`,
        details: responseText,
        request: {
          url: authUrl,
          rqUID: rqUID,
          authKeyLength: authKey.length
        }
      });
    }
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      return NextResponse.json({
        success: false,
        error: 'Ошибка парсинга JSON ответа',
        rawResponse: responseText
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'GigaChat API работает!',
      token: responseData.access_token ? 'ПОЛУЧЕН' : 'НЕ ПОЛУЧЕН',
      expiresAt: responseData.expires_at,
      fullResponse: responseData
    });
    
  } catch (error) {
    console.error('❌ Ошибка прямого теста GigaChat:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
