import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">FinanceAI</h1>
          <p className="text-slate-400">Your AI-powered personal finance assistant</p>
        </div>
        <SignIn afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard" />
      </div>
    </div>
  )
}
