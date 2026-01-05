import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Middleware runs on server, can only access cookies
  const token = request.cookies.get('admin_token')?.value;

  // Allow access to login page
  if (request.nextUrl.pathname === '/login') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Allow API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!token && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

