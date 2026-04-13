'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type DmRequest = {
  id: string
  from_user_id: string
  status: string
  created_at: string
  profiles: { name: string | null; avatar_url: string | null } | null
}

type DmRoom = {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  other: { id: string; name: string | null; avatar_url: string | null }
}

const AVATAR_COLORS = ['bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400', 'bg-teal-400']
const avatarColor = (uid: string) => AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length]

export default function MessagesPage() {
  const [rooms, setRooms] = useState<DmRoom[]>([])
  const [requests, setRequests] = useState<DmRequest[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'rooms' | 'requests'>('rooms')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      // Fetch DM rooms
      const { data: roomData } = await supabase
        .from('dm_rooms')
        .select('id, user1_id, user2_id, created_at')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (roomData) {
        const otherIds = roomData.map(r => r.user1_id === user.id ? r.user2_id : r.user1_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', otherIds.length > 0 ? otherIds : ['none'])

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
        setRooms(roomData.map(r => {
          const otherId = r.user1_id === user.id ? r.user2_id : r.user1_id
          const p = profileMap.get(otherId) || { id: otherId, name: null, avatar_url: null }
          return { ...r, other: p }
        }))
      }

      // Fetch pending DM requests TO this user
      const { data: reqData } = await supabase
        .from('dm_requests')
        .select('id, from_user_id, status, created_at, profiles:from_user_id(name, avatar_url)')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (reqData) setRequests(reqData as unknown as DmRequest[])
      setLoading(false)
    }
    init()
  }, [])

  const acceptRequest = async (req: DmRequest) => {
    if (!userId) return
    // Update request status
    await supabase.from('dm_requests').update({ status: 'accepted' }).eq('id', req.id)

    // Create DM room (user1 = smaller uuid for uniqueness)
    const [u1, u2] = [userId, req.from_user_id].sort()
    const { data: room } = await supabase
      .from('dm_rooms')
      .upsert({ user1_id: u1, user2_id: u2 }, { onConflict: 'user1_id,user2_id' })
      .select().single()

    setRequests(prev => prev.filter(r => r.id !== req.id))
    if (room) router.push(`/dashboard/messages/${room.id}`)
  }

  const rejectRequest = async (reqId: string) => {
    await supabase.from('dm_requests').update({ status: 'rejected' }).eq('id', reqId)
    setRequests(prev => prev.filter(r => r.id !== reqId))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400 text-sm">読み込み中...</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h2 className="text-xl font-black text-gray-900 mb-5">メッセージ</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-4">
        <button onClick={() => setTab('rooms')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${tab === 'rooms' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
          トーク
        </button>
        <button onClick={() => setTab('requests')}
          className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors relative ${tab === 'requests' ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
          申請
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'rooms' && (
        rooms.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">💬</p>
            <p className="text-sm">メッセージはまだありません</p>
            <p className="text-xs mt-1 text-gray-300">投稿のユーザーにDMを送れます</p>
          </div>
        ) : (
          <div className="space-y-1">
            {rooms.map(room => {
              const name = room.other.name || 'ユーザー'
              return (
                <Link key={room.id} href={`/dashboard/messages/${room.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                  {room.other.avatar_url
                    ? <img src={room.other.avatar_url} alt={name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                    : <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${avatarColor(room.other.id)}`}>
                        {name[0].toUpperCase()}
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{name}</p>
                    <p className="text-xs text-gray-400 truncate">トークを開く →</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      )}

      {tab === 'requests' && (
        requests.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">📬</p>
            <p className="text-sm">DM申請はありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => {
              const name = req.profiles?.name || 'ユーザー'
              return (
                <div key={req.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-4 border border-gray-100">
                  {req.profiles?.avatar_url
                    ? <img src={req.profiles.avatar_url} alt={name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                    : <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${avatarColor(req.from_user_id)}`}>
                        {name[0].toUpperCase()}
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm">{name}</p>
                    <p className="text-xs text-gray-400">DMを送りたがっています</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => rejectRequest(req.id)}
                      className="px-3 py-1.5 text-xs font-bold text-gray-400 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      拒否
                    </button>
                    <button onClick={() => acceptRequest(req)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#16A34A] rounded-lg hover:bg-[#166534] transition-colors">
                      承認
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
