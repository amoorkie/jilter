import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import YandexProvider from "next-auth/providers/yandex"
// import EmailProvider from "next-auth/providers/email" // Временно отключен
import { SQLiteService } from "./database/sqlite-service"

// Расширяем типы NextAuth для добавления пользовательских полей
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      image?: string
      provider: string
    }
  }
  
  interface User {
    id: string
    email: string
    name: string
    image?: string
    provider: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    provider: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    YandexProvider({
      clientId: process.env.YANDEX_CLIENT_ID!,
      clientSecret: process.env.YANDEX_CLIENT_SECRET!,
    }),
    // EmailProvider временно отключен - требует настройки nodemailer
    // EmailProvider({
    //   server: {
    //     host: process.env.EMAIL_SERVER_HOST,
    //     port: process.env.EMAIL_SERVER_PORT,
    //     auth: {
    //       user: process.env.EMAIL_SERVER_USER,
    //       pass: process.env.EMAIL_SERVER_PASSWORD,
    //     },
    //   },
    //   from: process.env.EMAIL_FROM,
    // }),
  ],
  
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const db = new SQLiteService()
        
        // Проверяем, существует ли пользователь
        const existingUser = await db.getUserByEmail(user.email!)
        
        if (!existingUser) {
          // Создаем нового пользователя
          await db.createUser({
            email: user.email!,
            name: user.name || user.email!.split('@')[0],
            image: user.image || null,
            provider: account?.provider || 'email',
            providerId: account?.providerAccountId || null,
          })
        } else {
          // Обновляем информацию о пользователе
          await db.updateUser(existingUser.id, {
            name: user.name || existingUser.name,
            image: user.image || existingUser.image,
            provider: account?.provider || existingUser.provider,
            providerId: account?.providerAccountId || existingUser.provider_id,
          })
        }
        
        return true
      } catch (error) {
        console.error('Ошибка при входе:', error)
        return false
      }
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.provider = token.provider
      }
      return session
    },
    
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.provider = account?.provider || 'email'
      }
      return token
    },
  },
  
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  
  session: {
    strategy: 'jwt',
  },
  
  secret: process.env.NEXTAUTH_SECRET,
}
