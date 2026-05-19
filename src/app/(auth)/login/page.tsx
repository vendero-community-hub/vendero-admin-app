import { AdminAuthPanel } from '@/components/admin-auth-panel'

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <AdminAuthPanel />
      </div>
    </main>
  )
}
