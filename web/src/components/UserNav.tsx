'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { User, LogOut, Music } from 'lucide-react'
import Link from 'next/link'

export default function UserNav() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-4">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center space-x-4">
        <Link
          href="/auth/login"
          className="text-gray-600 hover:text-gray-900 font-medium"
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
          <p className="text-sm font-medium text-gray-900">
            {session.user.name}
          </p>
          <p className="text-xs text-gray-500">
            {session.user.major} • {session.user.year}
          </p>
        </div>
      </div>

      <button
        onClick={() => signOut()}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden md:inline">Sign Out</span>
      </button>
    </div>
  )
}