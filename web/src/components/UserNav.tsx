'use client'

import { useSession, signOut } from 'next-auth/react'
import { User, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function UserNav() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-[var(--surface-tertiary)] rounded-full animate-pulse"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/auth/login"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
        >
          Sign In
        </Link>
        <Link
          href="/auth/signup"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          Sign Up
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-white" />
        </div>
        <div className="hidden md:block">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {session.user?.name ?? ''}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {(session.user as { major?: string })?.major ?? ''} • {(session.user as { year?: string })?.year ?? ''}
          </p>
        </div>
      </div>

      <button
        onClick={() => signOut()}
        className="flex items-center space-x-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 rounded-lg hover:bg-[var(--surface-tertiary)] transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden md:inline">Sign Out</span>
      </button>
    </div>
  )
}
