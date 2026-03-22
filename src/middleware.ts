// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const xForwardedHost = request.headers.get('x-forwarded-host') || '';
  const xOriginalHost = request.headers.get('x-original-host') || '';
  
  // 调试：把所有 host 相关 header 输出到响应头，方便排查
  const response = NextResponse.next();
  response.headers.set('x-debug-host', host);
  response.headers.set('x-debug-forwarded-host', xForwardedHost);
  response.headers.set('x-debug-original-host', xOriginalHost);
  
  return response;
}

export const config = {
  matcher: '/:path*',
};