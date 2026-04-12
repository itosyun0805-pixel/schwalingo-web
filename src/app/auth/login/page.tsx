'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-5/12 bg-[#1E3A2A] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full bg-[#16A34A]/20 blur-3xl" />
        <div className="absolute bottom-[-80px] left-[-80px] w-64 h-64 rounded-full bg-[#16A34A]/10 blur-3xl" />
        <div className="relative z-10 text-center">
          <div className="text-white font-black text-3xl mb-3">SchwaLingo</div>
          <p className="text-white/50 text-sm leading-relaxed">あなたの語学スキルで、<br />社会とつながる。</p>
        </div>
      </div>

      <div className="flex-1 bg-[#F7FDF9] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden text-center mb-8">
            <div className="text-2xl font-black text-[#16A34A]">SchwaLingo</div>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-1">おかえりなさい</h2>
          <p className="text-gray-400 text-sm mb-8">アカウントにログイン</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">メールアドレス</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent text-sm bg-white"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">パスワード</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent text-sm bg-white"
                placeholder="パスワード" />
            </div>
            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-xl">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#16A34A] text-white rounded-xl font-bold text-sm hover:bg-[#166534] transition-colors disabled:opacity-50 shadow-lg shadow-green-500/20">
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            アカウントをお持ちでない方は{' '}
            <Link href="/auth/signup" className="text-[#16A34A] font-bold hover:underline">新規登録</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
