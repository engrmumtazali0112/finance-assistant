import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
