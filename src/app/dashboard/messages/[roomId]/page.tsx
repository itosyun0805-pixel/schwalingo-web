'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type DmMessage = {
  id: string
  user_id: string
  content: string | null
  image_url: string | null
  created_at: string
}

type Profile = { name: string | null; avatar_url: string | null }

const AVATAR_COLORS = ['bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400', 'bg-teal-400']
const avatarColor = (uid: string) => AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length]
const fmt = (ts: string) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function DmRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [otherProfile, setOtherProfile] = useState<Profile & { id: string } | null>(null)
  const [input, setInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let rt: ReturnType<typeof supabase.channel>
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      // Verify room membership
      const { data: room } = await supabase.from('dm_rooms').select('user1_id, user2_id').eq('id', roomId).single()
      if (!room || (room.user1_id !== user.id && room.user2_id !== user.id)) {
        router.push('/dashboard/messages'); return
      }

      // Fetch other user's profile
      const otherId = room.user1_id === user.id ? room.user2_id : room.user1_id
      const { data: profile } = await supabase.from('profiles').select('name, avatar_url').eq('id', otherId).single()
      setOtherProfile({ id: otherId, ...(profile || { name: null, avatar_url: null }) })

      // Fetch messages
      const { data: msgs } = await supabase
        .from('dm_messages')
        .select('id, user_id, content, image_url, created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (msgs) setMessages(msgs)

      // Realtime
      rt = supabase.channel(`dm-room-${roomId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `room_id=eq.${roomId}` },
          (payload) => {
            setMessages(prev => {
              if (prev.find(m => m.id === payload.new.id)) return prev
              return [...prev, payload.new as DmMessage]
            })
          })
        .subscribe()

      setLoading(false)
    }
    init()
    return () => { if (rt) supabase.removeChannel(rt) }
  }, [roomId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const send = async () => {
    if ((!input.trim() && !imageFile) || !userId || sending) return
    setSending(true)

    let imageUrl: string | null = null
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('chat-images').upload(path, imageFile)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path)
        imageUrl = publicUrl
      }
    }

    await supabase.from('dm_messages').insert({
      room_id: roomId, user_id: userId,
      content: input.trim() || null,
      image_url: imageUrl,
    })
    setInput(''); setImageFile(null); setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
    setSending(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400 text-sm">読み込み中...</p>
    </div>
  )

  const otherName = otherProfile?.name || 'ユーザー'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white shrink-0 flex items-center gap-3">
        <Link href="/dashboard/messages" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">←</Link>
        {otherProfile?.avatar_url
          ? <img src={otherProfile.avatar_url} alt={otherName} className="w-8 h-8 rounded-full object-cover" />
          : <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${otherProfile ? avatarColor(otherProfile.id) : 'bg-gray-300'}`}>
              {otherName[0].toUpperCase()}
            </div>
        }
        <div>
          <p className="font-black text-gray-900 text-sm">{otherName}</p>
          <p className="text-[10px] text-gray-400">ダイレクトメッセージ</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
        {messages.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm">メッセージを送ってみましょう 👋</p>
          </div>
        )}
        {messages.map(m => {
          const isOwn = m.user_id === userId
          return (
            <div key={m.id} className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
              {!isOwn && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 ${otherProfile ? avatarColor(otherProfile.id) : 'bg-gray-300'}`}>
                  {otherName[0].toUpperCase()}
                </div>
              )}
              <div className={`max-w-[72%] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-2 rounded-2xl text-sm break-words ${isOwn ? 'bg-[#16A34A] text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                  {m.content && <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                  {m.image_url && (
                    <img src={m.image_url} alt="image" className="mt-1 max-w-[200px] rounded-xl object-cover cursor-pointer"
                      onClick={() => window.open(m.image_url!, '_blank')} />
                  )}
                </div>
                <span className="text-[9px] text-gray-300 px-1">{fmt(m.created_at)}</span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 shrink-0">
        {imagePreview && (
          <div className="relative mb-2 w-20">
            <img src={imagePreview} alt="preview" className="w-20 h-20 object-cover rounded-xl" />
            <button onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = '' }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-600 text-white rounded-full flex items-center justify-center text-[10px]">✕</button>
          </div>
        )}
        <div className="flex gap-2 items-end bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm focus-within:border-[#16A34A] transition-colors">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="text-gray-400 hover:text-[#16A34A] transition-colors shrink-0 pb-1" title="画像を送る">🖼️</button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`${otherName} にメッセージ`}
            rows={1}
            className="flex-1 text-sm text-gray-800 outline-none resize-none max-h-32 bg-transparent leading-relaxed"
            style={{ height: 'auto' }}
            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }}
          />
          <button onClick={send} disabled={(!input.trim() && !imageFile) || sending}
            className="shrink-0 px-3 py-1.5 bg-[#16A34A] text-white rounded-xl text-xs font-bold hover:bg-[#166534] disabled:opacity-40 transition-colors">
            {sending ? '...' : '送信'}
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-1 text-right">Enterで送信 · Shift+Enterで改行</p>
      </div>
    </div>
  )
}
