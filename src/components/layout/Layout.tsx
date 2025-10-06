'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from './Header'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname()
  
  // Не показываем хедер на страницах админки и аутентификации
  const hideHeader = pathname.startsWith('/admin') || 
                    pathname.startsWith('/auth')

  return (
    <div className="min-h-screen bg-gray-50">
      {!hideHeader && <Header />}
      <main className={hideHeader ? '' : 'pt-0'}>
        {children}
      </main>
    </div>
  )
}


