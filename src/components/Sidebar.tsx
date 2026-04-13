'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LogoutButton from './LogoutButton'

type Channel = { id: string; name: string; slug: string }

export default function Sidebar() {
  const pathname = usePathname()
  const [channels, setChannels] = useState<Channel[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [dmRequests, setDmRequests] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    let rt: any
    let notifRt: any
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (p?.is_admin) setIsAdmin(true)

      const load = async () => {
        const { data } = await supabase.from('channels').select('id, name, slug').order('created_at')
        if (data) setChannels(data)
      }
      await load()

      // Unread notifications count
      const loadNotifs = async () => {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)
        setUnreadNotifs(count || 0)
      }
      await loadNotifs()

      // Pending DM requests count
      const loadDmReqs = async () => {
        const { count } = await supabase
          .from('dm_requests')
          .select('*', { count: 'exact', head: true })
          .eq('to_user_id', user.id)
          .eq('status', 'pending')
        setDmRequests(count || 0)
      }
      await loadDmReqs()

      rt = supabase
        .channel('sidebar-channels')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, load)
        .subscribe()

      notifRt = supabase
        .channel('sidebar-notifs')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          () => { setUnreadNotifs(prev => prev + 1) })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_requests', filter: `to_user_id=eq.${user.id}` },
          () => { setDmRequests(prev => prev + 1) })
        .subscribe()
    }
    init()
    return () => {
      if (rt) supabase.removeChannel(rt)
      if (notifRt) supabase.removeChannel(notifRt)
    }
  }, [])

  // Reset notification count when navigating to notifications page
  useEffect(() => {
    if (pathname === '/dashboard/notifications') setUnreadNotifs(0)
    if (pathname === '/dashboard/messages') setDmRequests(0)
  }, [pathname])

  const active = (href: string, exact = false) => {
    if (exact) return pathname === href
    if (href === '/dashboard/chat') return pathname === href
    if (href.startsWith('/dashboard/chat/')) return pathname === href
    return pathname.startsWith(href) && !pathname.startsWith('/dashboard/chat')
  }

  const nl = (href: string, label: string, exact = false, badge?: number) => (
    <Link href={href} className={`flex items-center justify-between px-3 py-1.5 rounded text-sm transition-colors ${
      active(href, exact) ? 'bg-white/20 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/10'
    }`}>
      <span>{label}</span>
      {badge && badge > 0 ? (
        <span className="w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shrink-0">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  )

  return (
    <aside className="w-52 bg-[#1E3A2A] flex flex-col shrink-0 h-screen sticky top-0">
      <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between hover:bg-white/5 cursor-pointer">
        <span className="text-white font-black text-base">SchwaLingo</span>
        <span className="text-white/30 text-xs">▾</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-2 mb-3 space-y-0.5">
          {nl('/dashboard', 'ホーム', true)}
          {nl('/dashboard/notifications', '🔔 通知', false, unreadNotifs)}
          {nl('/dashboard/messages', '💬 メッセージ', false, dmRequests)}
          {nl('/dashboard/flashcards', 'フラッシュカード')}
          {nl('/dashboard/videos', '動画学習')}
          {nl('/dashboard/events', 'イベント')}
          {nl('/dashboard/profile', 'プロフィール')}
          {isAdmin && nl('/dashboard/admin', '⚙️ 管理')}
        </div>

        <div className="px-2">
          <Link href="/dashboard/chat" className={`flex items-center justify-between px-3 py-1 mb-0.5 rounded hover:bg-white/10 transition-colors group ${pathname === '/dashboard/chat' ? 'bg-white/10' : ''}`}>
            <span className="text-white/40 text-[11px] font-bold uppercase tracking-wider group-hover:text-white/60 transition-colors">チャンネル</span>
          </Link>
          {channels.map(ch => {
            const href = `/dashboard/chat/${ch.slug}`
            return (
              <Link key={ch.id} href={href} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                pathname === href ? 'bg-white/20 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}>
                <span className="text-white/30">#</span>{ch.name}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="px-2 py-3 border-t border-white/10">
        <LogoutButton />
      </div>
    </aside>
  )
}
