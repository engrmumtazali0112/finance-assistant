'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, MessageCircle, CreditCard, Target, TrendingUp } from 'lucide-react'

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/chat', icon: MessageCircle, label: 'Assistant' },
  { href: '/dashboard/transactions', icon: CreditCard, label: 'Transactions' },
  { href: '/dashboard/budget', icon: Target, label: 'Budgets' },
  { href: '/dashboard/trends', icon: TrendingUp, label: 'Trends' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
      <div className="px-5 py-5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-lg">FinanceAI</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Account</span>
        </div>
      </div>
    </aside>
  )
}
