import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/login(.*)',
  '/signup(.*)',
  '/forgot-password(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/accept-org-invite(.*)',
  '/organization-invitation(.*)',
  '/invite(.*)',
  '/invite/accept(.*)',
  '/invite/callback(.*)',
  '/test-invitation(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  
  // Check if this is an organization invitation
  const url = new URL(req.url)
  const isOrgInvitation = (url.pathname.startsWith('/accept-org-invite') || 
                          url.pathname.startsWith('/organization-invitation')) && 
                         url.searchParams.has('__clerk_ticket')
  
  // If user is signed in and trying to accept an invitation, 
  // let our custom page handle it
  if (isOrgInvitation && userId) {
    // Don't process the invitation automatically
    return
  }
  
  // Protect all routes except public ones
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}