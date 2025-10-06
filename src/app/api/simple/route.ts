// src/app/api/simple/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Простой API работает!',
    timestamp: new Date().toISOString()
  });
}