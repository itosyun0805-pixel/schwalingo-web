'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Attendee = { user_id: string; profiles: { name: string | null; avatar_url: string | null } | null }
type Event = {
  id: string; title: string; description: string | null; date: string; day: string | null
  time: string | null; location: string | null; tag: string | null; level: string | null
  cover_image_url: string | null; capacity: number | null; created_at: string
  event_attendees: Attendee[]
}

const TAG_COLORS: Record<string, string> = {
  'ガイド': 'bg-blue-50 text-blue-600',
  'コミュニティ': 'bg-purple-50 text-purple-600',
  '練習会': 'bg-pink-50 text-pink-600',
  'ビジネス': 'bg-green-50 text-green-600',
  'イベント': 'bg-yellow-50 text-yellow-600',
  '講師': 'bg-orange-50 text-orange-600',
}

const avatarColor = (uid: string) => {
  const colors = ['bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400', 'bg-teal-400']
  return colors[uid.charCodeAt(0) % colors.length]
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('events')
        .select('*, event_attendees(user_id, profiles(name, avatar_url))')
        .eq('id', id)
        .single()

      if (!data) { router.push('/dashboard/events'); return }
      setEvent(data as any)
      setLoading(false)
    }
    init()
  }, [id])

  const isAttending = event?.event_attendees.some(a => a.user_id === userId) ?? false
  const isFull = event?.capacity != null && (event.event_attendees.length >= event.capacity)

  const register = async () => {
    if (!userId || !event || registering) return
    setRegistering(true)
    if (isAttending) {
      await supabase.from('event_attendees').delete().eq('event_id', event.id).eq('user_id', userId)
      setEvent(prev => prev ? { ...prev, event_attendees: prev.event_attendees.filter(a => a.user_id !== userId) } : prev)
    } else {
      const { data } = await supabase
        .from('event_attendees')
        .insert({ event_id: event.id, user_id: userId })
        .select('user_id, profiles(name, avatar_url)')
        .single()
      if (data) setEvent(prev => prev ? { ...prev, event_attendees: [...prev.event_attendees, data as any] } : prev)
    }
    setRegistering(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">読み込み中...</p></div>
  if (!event) return null

  const attendeeCount = event.event_attendees.length

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Cover */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-br from-green-400 to-emerald-600 overflow-hidden">
        {event.cover_image_url && (
          <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <Link href="/dashboard/events"
          className="absolute top-4 left-4 bg-white/90 hover:bg-white text-gray-700 text-sm font-bold px-3 py-1.5 rounded-xl transition-colors">
          ← 戻る
        </Link>
      </div>

      <div className="px-6 py-6">
        {/* Tags */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {event.tag && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${TAG_COLORS[event.tag] || 'bg-gray-50 text-gray-600'}`}>
              {event.tag}
            </span>
          )}
          {event.level && <span className="text-xs text-gray-400 font-semibold">{event.level}</span>}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-gray-900 mb-4 leading-tight">{event.title}</h1>

        {/* Meta */}
        <div className="space-y-2 mb-6">
          {(event.date || event.day) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-lg">📅</span>
              <span className="font-semibold">
                {event.date}{event.day ? ` (${event.day})` : ''}
                {event.time ? ` ${event.time}` : ''}
              </span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-lg">📍</span>
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="text-lg">👥</span>
            <span>
              <span className="font-bold text-[#16A34A]">{attendeeCount}人</span>が参加予定
              {event.capacity && <span className="text-gray-400 ml-1">/ 定員{event.capacity}人</span>}
            </span>
          </div>
        </div>

        {/* Register Button */}
        <button
          onClick={register}
          disabled={registering || (!isAttending && isFull)}
          className={`w-full py-4 rounded-2xl font-black text-base transition-all mb-8 ${
            isAttending
              ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 border-2 border-gray-200'
              : isFull
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-[#16A34A] text-white hover:bg-[#166534] shadow-sm shadow-green-200'
          }`}
        >
          {registering ? '処理中...' : isAttending ? '参加をキャンセルする' : isFull ? '満員です' : '参加を申し込む'}
        </button>

        {/* Description */}
        {event.description && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">詳細</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Attendees */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            参加者 ({attendeeCount}人)
          </p>
          {attendeeCount === 0 ? (
            <p className="text-sm text-gray-400">まだ参加者がいません。最初に申し込みましょう！</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {event.event_attendees.map(a => {
                const name = a.profiles?.name || 'ユーザー'
                return (
                  <div key={a.user_id} className="flex flex-col items-center gap-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${avatarColor(a.user_id)}`}>
                      {name[0].toUpperCase()}
                    </div>
                    <p className="text-[10px] text-gray-500 max-w-[48px] truncate text-center">{name}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
