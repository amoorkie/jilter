import { NextRequest, NextResponse } from 'next/server';

export function checkAdminAuth(request: NextRequest): boolean {
  // В реальном приложении здесь должна быть проверка JWT токена
  // Для простоты проверяем наличие токена в заголовках
  const adminToken = request.headers.get('x-admin-token');
  
  if (!adminToken) {
    return false;
  }

  // Проверяем формат токена
  if (!adminToken.startsWith('admin_')) {
    return false;
  }

  return true;
}

export function requireAdminAuth(request: NextRequest): NextResponse | null {
  if (!checkAdminAuth(request)) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  
  return null;
}

