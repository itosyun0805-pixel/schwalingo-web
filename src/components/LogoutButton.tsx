'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-white/50 hover:text-white text-sm font-semibold rounded-lg hover:bg-white/10 transition-all"
    >
      <span className="w-5 text-center">↩</span>
      ログアウト
    </button>
  )
}
