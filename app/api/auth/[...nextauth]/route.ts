import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        token: { label: 'Token', type: 'text' }, // For magic link/invite login
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        const email = credentials.email.trim().toLowerCase()

        // 1. If it's a magic link/invite login via token
        if (credentials.token) {
          const profile = await prisma.profile.findFirst({
            where: {
              email,
              magicLinkToken: credentials.token,
              magicLinkExpires: { gte: new Date() },
              isActive: true,
            },
          })

          if (!profile) return null

          // Clear the token so it cannot be reused
          await prisma.profile.update({
            where: { id: profile.id },
            data: {
              magicLinkToken: null,
              magicLinkExpires: null,
            },
          })

          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            teamRole: profile.teamRole,
          }
        }

        // 2. Normal email/password login
        if (credentials.password) {
          const profile = await prisma.profile.findUnique({
            where: { email },
          })

          if (!profile || !profile.passwordHash || !profile.isActive) {
            return null
          }

          const isValid = bcrypt.compareSync(credentials.password, profile.passwordHash)
          if (!isValid) return null

          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            teamRole: profile.teamRole,
          }
        }

        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.teamRole = (user as any).teamRole
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).teamRole = token.teamRole;
        (session.user as any).name = token.name;
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
