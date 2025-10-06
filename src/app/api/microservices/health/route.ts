// API для проверки здоровья микросервисов
import { NextResponse } from 'next/server';

const SERVICES = [
  { name: 'Parser Service', url: 'http://localhost:8080/api/health' },
  { name: 'Admin Service', url: 'http://localhost:3002/api/health' },
  { name: 'Database Service', url: 'http://localhost:8081/api/health' },
  { name: 'AI Service', url: 'http://localhost:5000/api/health' },
];

export async function GET() {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    services: [] as any[],
    overall: 'healthy'
  };

  for (const service of SERVICES) {
    try {
      const response = await fetch(service.url, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 секунд таймаут
      });
      
      if (response.ok) {
        const data = await response.json();
        healthStatus.services.push({
          name: service.name,
          status: 'UP',
          response: data,
          url: service.url
        });
      } else {
        healthStatus.services.push({
          name: service.name,
          status: 'DOWN',
          error: `HTTP ${response.status}`,
          url: service.url
        });
        healthStatus.overall = 'degraded';
      }
    } catch (error: any) {
      healthStatus.services.push({
        name: service.name,
        status: 'DOWN',
        error: error.message,
        url: service.url
      });
      healthStatus.overall = 'degraded';
    }
  }

  return NextResponse.json(healthStatus);
}
