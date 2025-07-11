import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // List of public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/forgot-password'];
  
  // Middleware auth check disabled - AuthWrapper handles authentication
  // const authCookies = request.cookies.getAll().filter(cookie => 
  //   cookie.name.includes('CognitoIdentityServiceProvider') && 
  //   (cookie.name.includes('idToken') || cookie.name.includes('accessToken')) &&
  //   cookie.value && cookie.value.length > 10
  // );
  // const hasAuthToken = authCookies.length > 0;
  
  // Don't redirect away from login page - let the client handle auth state
  // This prevents the middleware from interfering with auth cleanup
  // if (pathname === '/login' && hasAuthToken) {
  //   return NextResponse.redirect(new URL('/', request.url));
  // }
  
  // Allow access to public routes
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Temporarily disable middleware auth check to let AuthWrapper handle it
  // The middleware cookie detection doesn't work well with Amplify's localStorage tokens
  // TODO: Either implement proper server-side auth checking or remove middleware auth
  // if (!hasAuthToken && !publicRoutes.includes(pathname)) {
  //   const loginUrl = new URL('/login', request.url);
  //   return NextResponse.redirect(loginUrl);
  // }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};