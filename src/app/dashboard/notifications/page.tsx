'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Notification = {
  id: string
  type: 'like' | 'comment' | 'follow'
  read: boolean
  created_at: string
  post_id: string | null
  from_user_id: string
  profiles: { name: string | null; avatar_url: string | null } | null
}

const AVATAR_COLORS = ['bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400', 'bg-teal-400']
const avatarColor = (uid: string) => AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length]

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}日前` : new Date(ts).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

const typeIcon = (type: string) => ({ like: '❤️', comment: '💬', follow: '👤' }[type] || '🔔')
const typeLabel = (type: string, name: string) => ({
  like: `${name}さんがいいねしました`,
  comment: `${name}さんがコメントしました`,
  follow: `${name}さんがフォローしました`,
}[type] || '')

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data } = await supabase
        .from('notifications')
        .select('id, type, read, created_at, post_id, from_user_id, profiles:from_user_id(name, avatar_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) setNotifications(data as unknown as Notification[])

      // Mark all as read
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-sm">読み込み中...</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-black text-gray-900 mb-5">通知</h2>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">🔔</p>
          <p className="text-sm">通知はありません</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map(n => {
            const name = n.profiles?.name || 'ユーザー'
            const avatarUrl = n.profiles?.avatar_url
            return (
              <div key={n.id}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors ${n.read ? 'bg-white hover:bg-gray-50' : 'bg-green-50 hover:bg-green-100/70'}`}>
                {/* Avatar */}
                <div className="relative shrink-0">
                  {avatarUrl
                    ? <img src={avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover" />
                    : <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${avatarColor(n.from_user_id)}`}>
                        {name[0].toUpperCase()}
                      </div>
                  }
                  <span className="absolute -bottom-0.5 -right-0.5 text-sm">{typeIcon(n.type)}</span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">{typeLabel(n.type, name)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                </div>

                {/* Unread dot */}
                {!n.read && <div className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
