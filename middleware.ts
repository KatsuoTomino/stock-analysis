import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // NextAuth.js v5のセッションクッキー名を確認
  const sessionToken = request.cookies.get('authjs.session-token') || 
                       request.cookies.get('__Secure-authjs.session-token') ||
                       request.cookies.get('next-auth.session-token') || 
                       request.cookies.get('__Secure-next-auth.session-token');

  // ログインページは常にアクセス可能
  if (request.nextUrl.pathname === '/login') {
    if (sessionToken) {
      // 既にログインしている場合はメインページにリダイレクト
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 保護されたパスでセッションがない場合はログインページにリダイレクト
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 以下のパスを保護:
     * - / (メインページ)
     * - /stocks/:path* (銘柄関連ページ)
     * - /api/stocks/:path* (銘柄API)
     * - /api/dividends/:path* (配当API)
     * 
     * 注意: /api/auth は除外（NextAuth.jsが処理）
     */
    '/',
    '/stocks/:path*',
    '/api/stocks/:path*',
    '/api/dividends/:path*',
  ],
};
