'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Profile = { name: string | null }
type Message = {
  id: string; content: string | null; image_url: string | null
  created_at: string; user_id: string; edited_at: string | null; deleted: boolean
  reply_to_id: string | null; profiles: Profile | null
}
type Channel = { id: string; name: string; description: string | null }

const COLORS = ['bg-green-400','bg-blue-400','bg-purple-400','bg-yellow-400','bg-pink-400','bg-teal-400']
const avatarColor = (uid: string) => COLORS[uid.charCodeAt(0) % COLORS.length]

const fmt = (ts: string) => {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

export default function ChannelPage() {
  const { channel: slug } = useParams<{ channel: string }>()
  const [ch, setCh] = useState<Channel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [msgMap, setMsgMap] = useState<Map<string, Message>>(new Map())
  const [input, setInput] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; name: string; content: string } | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    let rt: ReturnType<typeof supabase.channel>
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)

      // Save email to profile
      await supabase.from('profiles').upsert({ id: user.id, email: user.email }, { onConflict: 'id' })

      const { data: channel } = await supabase.from('channels').select('id, name, description').eq('slug', slug).single()
      if (!channel) return
      setCh(channel)

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, content, image_url, reply_to_id, edited_at, deleted, created_at, user_id, profiles(name)')
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (msgs) {
        const list = msgs as unknown as Message[]
        setMessages(list)
        setMsgMap(new Map(list.map(m => [m.id, m])))
      }

      rt = supabase.channel(`room-${channel.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channel.id}` },
          async (payload) => {
            const { data } = await supabase
              .from('messages')
              .select('id, content, image_url, reply_to_id, edited_at, deleted, created_at, user_id, profiles(name)')
              .eq('id', payload.new.id).single()
            if (data) {
              const m = data as unknown as Message
              setMessages(prev => [...prev, m])
              setMsgMap(prev => new Map(prev).set(m.id, m))
            }
          })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channel.id}` },
          (payload) => {
            setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } as Message : m))
          })
        .subscribe()
    }
    init()
    const closeMenu = () => setMenuOpen(null)
    window.addEventListener('click', closeMenu)
    return () => { if (rt) supabase.removeChannel(rt); window.removeEventListener('click', closeMenu) }
  }, [slug])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const send = async () => {
    if ((!input.trim() && !imageFile) || !userId || !ch || sending) return
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

    await supabase.from('messages').insert({
      channel_id: ch.id, user_id: userId,
      content: input.trim() || null,
      image_url: imageUrl,
      reply_to_id: replyTo?.id || null,
    })
    setInput(''); setReplyTo(null); setImageFile(null); setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
    setSending(false)
  }

  const saveEdit = async () => {
    if (!editingId) return
    await supabase.from('messages').update({ content: editContent, edited_at: new Date().toISOString() }).eq('id', editingId)
    setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content: editContent, edited_at: new Date().toISOString() } : m))
    setEditingId(null)
  }

  const deleteMsg = async (id: string) => {
    await supabase.from('messages').update({ deleted: true, content: null }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, deleted: true, content: null } : m))
    setMenuOpen(null)
  }

  const startReply = (m: Message) => {
    setReplyTo({ id: m.id, name: m.profiles?.name || 'ユーザー', content: m.content || '[画像]' })
    inputRef.current?.focus()
    setMenuOpen(null)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }

  if (!ch) return <div className="flex items-center justify-center h-full"><p className="text-gray-400 text-sm">読み込み中...</p></div>

  let lastDate = ''

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-100 bg-white shrink-0">
        <h2 className="font-black text-gray-900 text-sm"># {ch.name}</h2>
        {ch.description && <p className="text-xs text-gray-400">{ch.description}</p>}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map(m => {
          const isOwn = m.user_id === userId
          const name = m.profiles?.name || 'ユーザー'
          const dateStr = new Date(m.created_at).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
          const showDate = dateStr !== lastDate
          if (showDate) lastDate = dateStr

          const parentMsg = m.reply_to_id ? msgMap.get(m.reply_to_id) : null

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] text-gray-400 font-semibold">{dateStr}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}

              <div className={`flex gap-2.5 group ${isOwn ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1 ${avatarColor(m.user_id)}`}>
                  {name[0].toUpperCase()}
                </div>

                {/* Bubble */}
                <div className={`max-w-[72%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {!isOwn && <p className="text-[10px] text-gray-400 font-semibold px-1">{name}</p>}

                  {/* Reply preview */}
                  {parentMsg && (
                    <div className={`text-[10px] px-2.5 py-1 rounded-lg mb-0.5 border-l-2 border-[#16A34A]/40 bg-gray-50 text-gray-400 max-w-full truncate ${isOwn ? 'self-end' : ''}`}>
                      <span className="font-bold text-gray-500">{parentMsg.profiles?.name || 'ユーザー'}: </span>
                      {parentMsg.deleted ? '削除されたメッセージ' : (parentMsg.content || '[画像]')}
                    </div>
                  )}

                  {m.deleted ? (
                    <div className={`px-3 py-2 rounded-2xl text-xs italic text-gray-400 ${isOwn ? 'bg-gray-50' : 'bg-gray-100'}`}>
                      このメッセージは削除されました
                    </div>
                  ) : editingId === m.id ? (
                    <div className="flex flex-col gap-1.5 w-full min-w-[200px]">
                      <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={2}
                        className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#16A34A] resize-none" autoFocus />
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1">キャンセル</button>
                        <button onClick={saveEdit} className="text-xs bg-[#16A34A] text-white px-3 py-1 rounded-lg font-bold hover:bg-[#166534]">保存</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`relative px-3 py-2 rounded-2xl text-sm break-words ${isOwn ? 'bg-[#16A34A] text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                      {m.content && <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>}
                      {m.image_url && (
                        <img src={m.image_url} alt="image" className="mt-1 max-w-[240px] rounded-xl object-cover cursor-pointer" onClick={() => window.open(m.image_url!, '_blank')} />
                      )}
                      {m.edited_at && <span className={`text-[9px] mt-0.5 ${isOwn ? 'text-white/60' : 'text-gray-400'}`}> (編集済み)</span>}
                    </div>
                  )}

                  <span className="text-[9px] text-gray-300 px-1">{fmt(m.created_at)}</span>
                </div>

                {/* Action menu */}
                {!m.deleted && editingId !== m.id && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 self-center transition-opacity">
                    <button onClick={e => { e.stopPropagation(); startReply(m) }}
                      className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-xs" title="返信">↩</button>
                    {isOwn && (
                      <div className="relative">
                        <button onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === m.id ? null : m.id) }}
                          className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 text-xs">···</button>
                        {menuOpen === m.id && (
                          <div onClick={e => e.stopPropagation()}
                            className={`absolute ${isOwn ? 'right-0' : 'left-0'} bottom-7 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 min-w-[90px]`}>
                            <button onClick={() => { setEditingId(m.id); setEditContent(m.content || ''); setMenuOpen(null) }}
                              className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">✏️ 編集</button>
                            <button onClick={() => deleteMsg(m.id)}
                              className="w-full px-3 py-2 text-left text-xs text-red-500 hover:bg-red-50">🗑️ 削除</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-4 shrink-0">
        {/* Reply banner */}
        {replyTo && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 mb-2">
            <span className="text-[10px] text-[#16A34A] font-bold shrink-0">↩ 返信先:</span>
            <span className="text-[10px] text-gray-600 font-semibold shrink-0">{replyTo.name}</span>
            <span className="text-[10px] text-gray-400 truncate">{replyTo.content}</span>
            <button onClick={() => setReplyTo(null)} className="ml-auto text-gray-300 hover:text-gray-500 shrink-0">✕</button>
          </div>
        )}

        {/* Image preview */}
        {imagePreview && (
          <div className="relative mb-2 w-24">
            <img src={imagePreview} alt="preview" className="w-24 h-24 object-cover rounded-xl" />
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
            placeholder={`#${ch.name} にメッセージを送る`}
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
