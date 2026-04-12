'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const LANGUAGES = ['英語','中国語','韓国語','スペイン語','フランス語','ドイツ語','ポルトガル語','イタリア語','タイ語','ベトナム語','インドネシア語','アラビア語','日本語教育']
const LANG_FLAGS: Record<string, string> = {
  '英語':'🇺🇸','中国語':'🇨🇳','韓国語':'🇰🇷','スペイン語':'🇪🇸','フランス語':'🇫🇷','ドイツ語':'🇩🇪',
  'ポルトガル語':'🇧🇷','イタリア語':'🇮🇹','タイ語':'🇹🇭','ベトナム語':'🇻🇳','インドネシア語':'🇮🇩','アラビア語':'🇸🇦','日本語教育':'🎌'
}

type Deck = { id: string; title: string; language: string; created_at: string; card_count: number; due_count: number }

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [lang, setLang] = useState('英語')
  const [creating, setCreating] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadDecks() }, [])

  const loadDecks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data } = await supabase
      .from('flashcard_decks').select('id, title, language, created_at')
      .eq('user_id', user.id).order('created_at', { ascending: false })

    if (data) {
      const now = new Date().toISOString()
      const withCounts = await Promise.all(data.map(async d => {
        const [{ count: total }, { count: due }] = await Promise.all([
          supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('deck_id', d.id),
          supabase.from('flashcards').select('*', { count: 'exact', head: true }).eq('deck_id', d.id).lte('next_review', now),
        ])
        return { ...d, card_count: total || 0, due_count: due || 0 }
      }))
      setDecks(withCounts)
    }
    setLoading(false)
  }

  const createDeck = async () => {
    if (!title.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('flashcard_decks')
      .insert({ user_id: user.id, title: title.trim(), language: lang })
      .select().single()
    if (data) router.push(`/dashboard/flashcards/${data.id}`)
    setCreating(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">読み込み中...</p></div>

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-black text-gray-900">フラッシュカード</h2>
        <p className="text-gray-400 text-sm mt-1">デッキを作って単語・フレーズを効率よく覚えよう</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
        <h3 className="font-bold text-gray-700 text-sm mb-3">新しいデッキを作成</h3>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && createDeck()}
            placeholder="デッキ名（例: TOEIC頻出単語）"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]" />
          <select value={lang} onChange={e => setLang(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] bg-white">
            {LANGUAGES.map(l => <option key={l}>{l}</option>)}
          </select>
          <button onClick={createDeck} disabled={!title.trim() || creating}
            className="px-5 py-2.5 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50 transition-colors whitespace-nowrap">
            {creating ? '作成中...' : '作成 →'}
          </button>
        </div>
      </div>

      {/* Deck grid */}
      {decks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">📚</p>
          <p className="text-sm">デッキがまだありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {decks.map(deck => (
            <Link key={deck.id} href={`/dashboard/flashcards/${deck.id}`}
              className="bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 hover:shadow-sm transition-all group block">
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{LANG_FLAGS[deck.language] || '📖'}</span>
                {deck.due_count > 0 && (
                  <span className="text-[11px] font-bold bg-green-50 text-[#16A34A] border border-green-100 px-2 py-0.5 rounded-full">
                    {deck.due_count}枚 復習あり
                  </span>
                )}
              </div>
              <p className="font-bold text-gray-800 text-sm mb-1 leading-snug">{deck.title}</p>
              <p className="text-xs text-gray-400">{deck.language} · {deck.card_count}枚</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
