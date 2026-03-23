// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = 
    request.headers.get('x-forwarded-host') || 
    request.headers.get('host') || '';
  
  // 只对默认 Firebase 域名做重定向，避免对自定义域名产生循环
  if (host === 'quoteflow-app--goodyard-qouteflow.us-central1.hosted.app') {
    const url = request.nextUrl.clone();
    url.host = 'rfq.apperanz.com';
    url.protocol = 'https:';
    url.port = '';
    return NextResponse.redirect(url, 301);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
