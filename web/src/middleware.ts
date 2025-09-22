import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Force HTTPS in production (defense-in-depth; Vercel already terminates TLS)
    try {
      const proto = req.headers.get('x-forwarded-proto')
      const host = req.headers.get('host')
      if (process.env.NODE_ENV === 'production' && host && proto && proto !== 'https') {
        const url = new URL(req.nextUrl)
        url.protocol = 'https:'
        url.host = host
        return NextResponse.redirect(url)
      }
    } catch (_) {
      // no-op on middleware errors
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    }
  }
)

export const config = {
  matcher: [
    '/forms-processor',
    '/api/google/process-forms',
    '/api/groups/create',
    '/api/groups',
    '/api/major/predict'
  ]
}
