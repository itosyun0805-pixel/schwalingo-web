'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Profile = { name: string | null; avatar_url: string | null }
type Comment = { id: string; content: string; created_at: string; user_id: string; profiles: Profile | null }
type Post = {
  id: string; user_id: string; content: string; image_urls: string[]; created_at: string
  language_tag: string | null
  profiles: Profile | null
  post_likes: { user_id: string }[]
  post_comments: Comment[]
}

const AVATAR_COLORS = ['bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-yellow-400', 'bg-pink-400', 'bg-teal-400']
const avatarColor = (uid: string) => AVATAR_COLORS[uid.charCodeAt(0) % AVATAR_COLORS.length]

const LANGUAGES = ['英語', '中国語', '韓国語', 'スペイン語', 'フランス語', 'ドイツ語', 'その他']
const LANG_FLAGS: Record<string, string> = {
  '英語': '🇬🇧', '中国語': '🇨🇳', '韓国語': '🇰🇷',
  'スペイン語': '🇪🇸', 'フランス語': '🇫🇷', 'ドイツ語': '🇩🇪', 'その他': '🌐'
}

const timeAgo = (ts: string) => {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'たった今'
  if (m < 60) return `${m}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}日前`
  const dt = new Date(ts)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

const Avatar = ({ uid, name, avatarUrl, size = 9 }: { uid: string; name: string; avatarUrl?: string | null; size?: number }) => {
  const sz = `w-${size} h-${size}`
  if (avatarUrl) return <img src={avatarUrl} alt={name} className={`${sz} rounded-full object-cover shrink-0`} />
  return (
    <div className={`${sz} rounded-full flex items-center justify-center text-white font-bold shrink-0 text-sm ${avatarColor(uid)}`}>
      {(name || 'U')[0].toUpperCase()}
    </div>
  )
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'all' | 'following'>('all')
  const [langFilter, setLangFilter] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [langTag, setLangTag] = useState<string>('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setUserId(user.id)
      const [{ data: p }, { data: follows }] = await Promise.all([
        supabase.from('profiles').select('name, avatar_url').eq('id', user.id).single(),
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
      ])
      setUserProfile(p)
      setFollowingIds(new Set((follows || []).map((f: any) => f.following_id)))
      await loadPosts()
      setLoading(false)
    }
    init()
    const handleClick = () => setMenuOpen(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  const loadPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('id, content, image_urls, language_tag, created_at, user_id, profiles(name, avatar_url), post_likes(user_id), post_comments(id, content, created_at, user_id, profiles(name, avatar_url))')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setPosts(data as unknown as Post[])
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImageFile(null); setImagePreview(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const createPost = async () => {
    if (!content.trim() || !userId || posting) return
    setPosting(true)
    let imageUrls: string[] = []
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('post-images').upload(path, imageFile)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path)
        imageUrls = [publicUrl]
      }
    }
    const { data } = await supabase
      .from('posts')
      .insert({ user_id: userId, content: content.trim(), image_urls: imageUrls, language_tag: langTag || null })
      .select('id, content, image_urls, language_tag, created_at, user_id, profiles(name, avatar_url), post_likes(user_id), post_comments(id, content, created_at, user_id, profiles(name, avatar_url))')
      .single()
    if (data) setPosts(prev => [data as unknown as Post, ...prev])
    setContent(''); setLangTag(''); removeImage(); setPosting(false)
  }

  const toggleLike = async (post: Post) => {
    if (!userId) return
    const liked = post.post_likes.some(l => l.user_id === userId)
    if (liked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', userId)
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, post_likes: p.post_likes.filter(l => l.user_id !== userId) } : p))
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: userId })
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, post_likes: [...p.post_likes, { user_id: userId! }] } : p))
      // Notification
      if (post.user_id !== userId) {
        await supabase.from('notifications').insert({ user_id: post.user_id, from_user_id: userId, type: 'like', post_id: post.id })
      }
    }
  }

  const addComment = async (postId: string) => {
    const text = commentTexts[postId]?.trim()
    if (!text || !userId) return
    const { data } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, content: text })
      .select('id, content, created_at, user_id, profiles(name, avatar_url)')
      .single()
    if (data) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, post_comments: [...p.post_comments, data as unknown as Comment] } : p))
      setCommentTexts(prev => ({ ...prev, [postId]: '' }))
      // Notification
      const post = posts.find(p => p.id === postId)
      if (post && post.user_id !== userId) {
        await supabase.from('notifications').insert({ user_id: post.user_id, from_user_id: userId, type: 'comment', post_id: postId })
      }
    }
  }

  const startEdit = (post: Post) => {
    setEditingId(post.id); setEditContent(post.content); setMenuOpen(null)
  }

  const saveEdit = async () => {
    if (!editingId || !editContent.trim()) return
    setEditSaving(true)
    await supabase.from('posts').update({ content: editContent.trim() }).eq('id', editingId)
    setPosts(prev => prev.map(p => p.id === editingId ? { ...p, content: editContent.trim() } : p))
    setEditingId(null); setEditSaving(false)
  }

  const deletePost = async (postId: string) => {
    if (!confirm('この投稿を削除しますか？')) return
    await supabase.from('posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setMenuOpen(null)
  }

  const toggleFollow = async (targetId: string) => {
    if (!userId || targetId === userId) return
    const isFollowing = followingIds.has(targetId)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', targetId)
      setFollowingIds(prev => { const n = new Set(prev); n.delete(targetId); return n })
    } else {
      await supabase.from('follows').insert({ follower_id: userId, following_id: targetId })
      setFollowingIds(prev => new Set([...prev, targetId]))
      // Notification
      await supabase.from('notifications').insert({ user_id: targetId, from_user_id: userId, type: 'follow' })
    }
  }

  const sendDmRequest = async (targetId: string) => {
    if (!userId || targetId === userId) return
    // Check if room already exists
    const [u1, u2] = [userId, targetId].sort()
    const { data: existingRoom } = await supabase
      .from('dm_rooms')
      .select('id')
      .eq('user1_id', u1).eq('user2_id', u2)
      .single()
    if (existingRoom) { window.location.href = `/dashboard/messages/${existingRoom.id}`; return }

    // Insert DM request (ignore duplicate)
    await supabase.from('dm_requests').upsert(
      { from_user_id: userId, to_user_id: targetId, status: 'pending' },
      { onConflict: 'from_user_id,to_user_id', ignoreDuplicates: true }
    )
    alert('DMリクエストを送りました！承認されるとトークが開始されます。')
  }

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  let displayPosts = tab === 'following'
    ? posts.filter(p => followingIds.has(p.user_id) || p.user_id === userId)
    : posts
  if (langFilter) displayPosts = displayPosts.filter(p => p.language_tag === langFilter)

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">読み込み中...</p></div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Create Post */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex gap-3">
          {userId && <Avatar uid={userId} name={userProfile?.name || 'U'} avatarUrl={userProfile?.avatar_url} />}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) createPost() }}
            placeholder="学習の進捗や気づきをシェアしよう..."
            rows={3}
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-relaxed"
          />
        </div>
        {imagePreview && (
          <div className="relative mt-3 rounded-xl overflow-hidden">
            <img src={imagePreview} alt="preview" className="w-full max-h-64 object-cover rounded-xl" />
            <button onClick={removeImage} className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-sm">✕</button>
          </div>
        )}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-3">
          <div className="flex items-center gap-2">
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-[#16A34A] hover:bg-green-50 text-sm transition-colors">
              <span>🖼️</span><span className="text-xs font-semibold">画像</span>
            </button>
            {/* Language tag selector */}
            <select value={langTag} onChange={e => setLangTag(e.target.value)}
              className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-[#16A34A] bg-white cursor-pointer">
              <option value="">🏷️ 言語タグ</option>
              {LANGUAGES.map(l => <option key={l} value={l}>{LANG_FLAGS[l]} {l}</option>)}
            </select>
          </div>
          <button onClick={createPost} disabled={!content.trim() || posting}
            className="px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-40 transition-colors">
            {posting ? '投稿中...' : '投稿する'}
          </button>
        </div>
      </div>

      {/* Tabs + Language Filter */}
      <div className="space-y-2">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(['all', 'following'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${tab === t ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              {t === 'all' ? 'みんな' : 'フォロー中'}
            </button>
          ))}
        </div>

        {/* Language filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setLangFilter(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${!langFilter ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            すべて
          </button>
          {LANGUAGES.map(l => (
            <button key={l} onClick={() => setLangFilter(langFilter === l ? null : l)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${langFilter === l ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {LANG_FLAGS[l]} {l}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {displayPosts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">{tab === 'following' ? '👥' : '✍️'}</p>
          <p className="text-sm">
            {tab === 'following' ? 'フォロー中のユーザーの投稿がここに表示されます' : 'まだ投稿がありません。最初の投稿をしてみましょう！'}
          </p>
        </div>
      ) : displayPosts.map(post => {
        const name = post.profiles?.name || 'ユーザー'
        const liked = post.post_likes.some(l => l.user_id === userId)
        const open = expanded.has(post.id)
        const isOwn = post.user_id === userId
        const isFollowing = followingIds.has(post.user_id)
        const isEditing = editingId === post.id

        return (
          <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <Avatar uid={post.user_id} name={name} avatarUrl={post.profiles?.avatar_url} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-800 text-sm leading-none">{name}</p>
                    {!isOwn && (
                      <>
                        <button onClick={() => toggleFollow(post.user_id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                            isFollowing
                              ? 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400'
                              : 'border-[#16A34A] text-[#16A34A] hover:bg-[#16A34A] hover:text-white'
                          }`}>
                          {isFollowing ? 'フォロー中' : 'フォロー'}
                        </button>
                        <button onClick={() => sendDmRequest(post.user_id)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors">
                          💬 DM
                        </button>
                      </>
                    )}
                    {post.language_tag && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-[#16A34A] border border-green-100">
                        {LANG_FLAGS[post.language_tag]} {post.language_tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(post.created_at)}</p>
                </div>
                {isOwn && (
                  <div className="relative shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(menuOpen === post.id ? null : post.id) }}
                      className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                      ···
                    </button>
                    {menuOpen === post.id && (
                      <div onClick={e => e.stopPropagation()}
                        className="absolute right-0 top-8 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 min-w-[100px]">
                        <button onClick={() => startEdit(post)}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          ✏️ 編集
                        </button>
                        <button onClick={() => deletePost(post.id)}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 transition-colors">
                          🗑️ 削除
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content / Edit mode */}
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#16A34A] resize-none transition-colors"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)}
                      className="px-4 py-1.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
                      キャンセル
                    </button>
                    <button onClick={saveEdit} disabled={editSaving || !editContent.trim()}
                      className="px-4 py-1.5 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-40 transition-colors">
                      {editSaving ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              )}

              {/* Image */}
              {!isEditing && post.image_urls?.length > 0 && (
                <div className="mt-3 rounded-xl overflow-hidden">
                  <img src={post.image_urls[0]} alt="post" className="w-full object-cover max-h-80 rounded-xl" />
                </div>
              )}

              {/* Actions */}
              {!isEditing && (
                <div className="flex items-center gap-5 pt-4 mt-4 border-t border-gray-50">
                  <button onClick={() => toggleLike(post)}
                    className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${liked ? 'text-[#16A34A]' : 'text-gray-400 hover:text-[#16A34A]'}`}>
                    <span className="text-base">{liked ? '❤️' : '🤍'}</span>
                    <span>{post.post_likes.length}</span>
                  </button>
                  <button onClick={() => toggleExpand(post.id)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                    <span className="text-base">💬</span>
                    <span>{post.post_comments.length}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Comments */}
            {open && !isEditing && (
              <div className="border-t border-gray-50 px-5 py-4 bg-gray-50/50 rounded-b-2xl space-y-3">
                {post.post_comments.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <Avatar uid={c.user_id} name={c.profiles?.name || 'U'} avatarUrl={c.profiles?.avatar_url} size={7} />
                    <div className="flex-1 bg-white rounded-xl px-3 py-2 border border-gray-100">
                      <p className="text-xs font-bold text-gray-700">{c.profiles?.name || 'ユーザー'}</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2.5">
                  {userId && <Avatar uid={userId} name={userProfile?.name || 'U'} avatarUrl={userProfile?.avatar_url} size={7} />}
                  <div className="flex-1 flex gap-2">
                    <input
                      value={commentTexts[post.id] || ''}
                      onChange={e => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComment(post.id) } }}
                      placeholder="コメントを追加..."
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#16A34A] transition-colors"
                    />
                    <button onClick={() => addComment(post.id)} disabled={!commentTexts[post.id]?.trim()}
                      className="px-3 py-1.5 bg-[#16A34A] text-white rounded-xl text-xs font-bold hover:bg-[#166534] disabled:opacity-40 transition-colors">
                      送信
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
