import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * 以下のパスを保護:
     * - / (メインページ)
     * - /stocks/:path* (銘柄関連ページ)
     * - /api/stocks/:path* (銘柄API)
     * - /api/dividends/:path* (配当API)
     */
    '/',
    '/stocks/:path*',
    '/api/stocks/:path*',
    '/api/dividends/:path*',
  ],
};
