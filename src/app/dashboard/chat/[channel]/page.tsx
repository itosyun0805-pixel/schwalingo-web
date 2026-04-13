'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { name: string | null } | null
}

type ChannelInfo = { id: string; name: string; description: string | null }

export default function ChannelPage() {
  const { channel: slug } = useParams<{ channel: string }>()
  const [ch, setCh] = useState<ChannelInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    let rt: any
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: channel } = await supabase
        .from('channels').select('id, name, description').eq('slug', slug).single()
      if (!channel) return
      setCh(channel)

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, content, created_at, user_id, profiles(name)')
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: true })
        .limit(100)
      if (msgs) setMessages(msgs as unknown as Message[])

      rt = supabase
        .channel(`room-${channel.id}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `channel_id=eq.${channel.id}`
        }, async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('id, content, created_at, user_id, profiles(name)')
            .eq('id', payload.new.id).single()
          if (data) setMessages(prev => [...prev, data as unknown as Message])
        })
        .subscribe()
    }
    init()
    return () => { if (rt) supabase.removeChannel(rt) }
  }, [slug])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || !ch || !userId || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    await supabase.from('messages').insert({ channel_id: ch.id, user_id: userId, content })
    setSending(false)
  }

  const fmt = (ts: string) => {
    const d = new Date(ts)
    const isToday = d.toDateString() === new Date().toDateString()
    return isToday
      ? d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      : `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
  }

  const avatarColor = (uid: string) => {
    const colors = ['bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400', 'bg-teal-400']
    return colors[uid.charCodeAt(0) % colors.length]
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-3 flex items-center gap-2 shrink-0">
        <span className="text-gray-300 font-bold text-base">#</span>
        <span className="font-bold text-gray-900">{ch?.name ?? slug}</span>
        {ch?.description && <span className="text-gray-400 text-xs ml-1 hidden sm:block">— {ch.description}</span>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-[#F7FDF9]">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
            <span className="text-4xl">💬</span>
            <p className="text-sm">まだメッセージがありません</p>
          </div>
        )}
        <div className="max-w-3xl mx-auto space-y-0.5">
          {messages.map((msg, i) => {
            const isOwn = msg.user_id === userId
            const prev = messages[i - 1]
            const gap = prev && new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 300000
            const showHeader = !prev || prev.user_id !== msg.user_id || gap
            const name = msg.profiles?.name || 'ユーザー'

            return (
              <div key={msg.id} className={showHeader ? 'mt-5 first:mt-0' : 'mt-0.5'}>
                {showHeader && (
                  <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isOwn ? 'bg-[#16A34A]' : avatarColor(msg.user_id)}`}>
                      {name[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-gray-600">{isOwn ? 'あなた' : name}</span>
                    <span className="text-[10px] text-gray-400">{fmt(msg.created_at)}</span>
                  </div>
                )}
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${!showHeader ? (isOwn ? 'pr-9' : 'pl-9') : ''}`}>
                  <p className={`max-w-[72%] px-3.5 py-2 rounded-xl text-sm leading-relaxed break-words ${
                    isOwn ? 'bg-[#16A34A] text-white' : 'bg-white border border-gray-100 text-gray-800 shadow-sm'
                  }`}>
                    {msg.content}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={ch ? `#${ch.name} へメッセージ... (Enter で送信)` : ''}
            rows={1}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm resize-none outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] transition-colors placeholder-gray-400"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <button onClick={send} disabled={!input.trim() || sending}
            className="h-[42px] px-4 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-40 transition-colors shrink-0">
            送信
          </button>
        </div>
      </div>
    </div>
  )
}
