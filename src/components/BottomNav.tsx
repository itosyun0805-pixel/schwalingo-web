'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Channel = { id: string; name: string; slug: string }

export default function BottomNav() {
  const pathname = usePathname()
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [dmRequests, setDmRequests] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [channels, setChannels] = useState<Channel[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let rt: any
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (p?.is_admin) setIsAdmin(true)

      const { data: ch } = await supabase.from('channels').select('id, name, slug').order('created_at')
      if (ch) setChannels(ch)

      const { count: nc } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
      setUnreadNotifs(nc || 0)

      const { count: dc } = await supabase.from('dm_requests').select('*', { count: 'exact', head: true }).eq('to_user_id', user.id).eq('status', 'pending')
      setDmRequests(dc || 0)

      rt = supabase.channel('bottom-nav')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => setUnreadNotifs(p => p + 1))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_requests', filter: `to_user_id=eq.${user.id}` }, () => setDmRequests(p => p + 1))
        .subscribe()
    }
    init()
    return () => { if (rt) supabase.removeChannel(rt) }
  }, [])

  useEffect(() => {
    if (pathname === '/dashboard/notifications') setUnreadNotifs(0)
    if (pathname === '/dashboard/messages') setDmRequests(0)
    setMenuOpen(false)
  }, [pathname])

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href)

  const navItem = (href: string, icon: React.ReactNode, label: string, badge?: number, exact = false) => (
    <Link href={href} className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors relative ${isActive(href, exact) ? 'text-[#16A34A]' : 'text-gray-400'}`}>
      <div className="relative">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </div>
      <span className="text-[10px] font-semibold">{label}</span>
    </Link>
  )

  return (
    <>
      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex md:hidden shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItem('/dashboard', <HomeIcon />, 'ホーム', undefined, true)}
        {navItem('/dashboard/notifications', <BellIcon />, '通知', unreadNotifs)}
        {navItem('/dashboard/messages', <ChatIcon />, 'DM', dmRequests)}
        {navItem('/dashboard/profile', <UserIcon />, 'プロフィール')}
        {/* More button */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${menuOpen ? 'text-[#16A34A]' : 'text-gray-400'}`}>
          <MenuIcon />
          <span className="text-[10px] font-semibold">メニュー</span>
        </button>
      </nav>

      {/* Backdrop */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Slide-up drawer */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ${menuOpen ? 'translate-y-0' : 'translate-y-full'}`}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-4 pb-8 space-y-1 max-h-[70vh] overflow-y-auto">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2">学習</p>
          <DrawerLink href="/dashboard/flashcards" icon="🃏" label="フラッシュカード" />
          <DrawerLink href="/dashboard/videos" icon="▶️" label="動画学習" />
          <DrawerLink href="/dashboard/events" icon="📅" label="イベント" />

          {channels.length > 0 && (
            <>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 py-2 mt-2">チャンネル</p>
              {channels.map(ch => (
                <DrawerLink key={ch.id} href={`/dashboard/chat/${ch.slug}`} icon="#" label={ch.name} />
              ))}
            </>
          )}

          {isAdmin && (
            <>
              <div className="h-px bg-gray-100 my-2" />
              <DrawerLink href="/dashboard/admin" icon="⚙️" label="管理パネル" />
            </>
          )}
        </div>
      </div>
    </>
  )
}

function DrawerLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href)
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${active ? 'bg-green-50 text-[#16A34A] font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}>
      <span className="text-lg w-6 text-center">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}

// Icons
const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
  </svg>
)
const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
  </svg>
)
const ChatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
  </svg>
)
const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
  </svg>
)
const MenuIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
  </svg>
)
