// Ambient module augmentation for next-auth types
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      major?: string | null
      year?: string | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    major?: string | null
    year?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    major?: string
    year?: string
  }
}
