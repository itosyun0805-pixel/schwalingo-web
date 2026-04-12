'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Card = { id: string; front: string; back: string; mastery: number; next_review: string | null; interval_days: number; ease_factor: number }
type Deck = { id: string; title: string; language: string }

export default function DeckPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [mode, setMode] = useState<'list' | 'study'>('list')
  const [queue, setQueue] = useState<Card[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [studyDone, setStudyDone] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: d } = await supabase.from('flashcard_decks').select('*').eq('id', deckId).single()
      if (!d) { router.push('/dashboard/flashcards'); return }
      setDeck(d)
      const { data: c } = await supabase.from('flashcards').select('*').eq('deck_id', deckId).order('created_at')
      if (c) setCards(c)
      setLoading(false)
    }
    load()
  }, [deckId])

  const startStudy = () => {
    const now = new Date()
    const due = cards.filter(c => !c.next_review || new Date(c.next_review) <= now)
    const notDue = cards.filter(c => c.next_review && new Date(c.next_review) > now)
    const sorted = [
      ...due.sort((a, b) => a.mastery - b.mastery),
      ...notDue.sort((a, b) => a.mastery - b.mastery),
    ]
    if (sorted.length === 0) return
    setQueue(sorted)
    setIdx(0)
    setFlipped(false)
    setStudyDone(false)
    setMode('study')
  }

  const answer = async (good: boolean) => {
    const card = queue[idx]
    const newInterval = good ? Math.max(1, Math.round(card.interval_days * card.ease_factor)) : 1
    const newEase = good ? card.ease_factor : Math.max(1.3, card.ease_factor - 0.2)
    const newMastery = good ? Math.min(3, card.mastery + 1) : 0
    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + newInterval)

    await supabase.from('flashcards').update({
      mastery: newMastery, interval_days: newInterval,
      ease_factor: newEase, next_review: nextReview.toISOString()
    }).eq('id', card.id)

    setCards(prev => prev.map(c => c.id === card.id
      ? { ...c, mastery: newMastery, interval_days: newInterval, ease_factor: newEase, next_review: nextReview.toISOString() }
      : c))

    if (idx + 1 >= queue.length) {
      setStudyDone(true)
    } else {
      setIdx(idx + 1)
      setFlipped(false)
    }
  }

  const addCard = async () => {
    if (!front.trim() || !back.trim()) return
    setAdding(true)
    const { data } = await supabase.from('flashcards')
      .insert({ deck_id: deckId, front: front.trim(), back: back.trim() })
      .select().single()
    if (data) setCards(prev => [...prev, data])
    setFront(''); setBack('')
    setAdding(false)
  }

  const deleteCard = async (id: string) => {
    await supabase.from('flashcards').delete().eq('id', id)
    setCards(prev => prev.filter(c => c.id !== id))
  }

  const masteryColor = (m: number) => ['text-gray-300', 'text-yellow-500', 'text-blue-500', 'text-[#16A34A]'][m]
  const masteryLabel = (m: number) => ['未学習', '学習中', '定着中', '習得済'][m]

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">読み込み中...</p></div>

  const dueCount = cards.filter(c => !c.next_review || new Date(c.next_review) <= new Date()).length

  /* ===== STUDY MODE ===== */
  if (mode === 'study') {
    if (studyDone) return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h3 className="text-xl font-black text-gray-900 mb-2">学習完了！</h3>
        <p className="text-gray-400 text-sm mb-8">{queue.length}枚のカードを学習しました</p>
        <button onClick={() => setMode('list')} className="px-8 py-3 bg-[#16A34A] text-white rounded-xl font-bold hover:bg-[#166534] transition-colors">
          デッキに戻る
        </button>
      </div>
    )

    const card = queue[idx]
    return (
      <div className="max-w-md mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setMode('list')} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← 戻る</button>
          <div className="flex items-center gap-3">
            <div className="w-36 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#16A34A] rounded-full transition-all duration-300" style={{ width: `${(idx / queue.length) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-400 shrink-0">{idx + 1} / {queue.length}</span>
          </div>
        </div>

        {/* Card */}
        <div onClick={() => setFlipped(f => !f)}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 min-h-[240px] flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-all text-center select-none">
          {!flipped ? (
            <>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-5">表</p>
              <p className="text-3xl font-black text-gray-900 leading-tight">{card.front}</p>
              <p className="text-xs text-gray-400 mt-6">タップして答えを確認 →</p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-black text-[#16A34A] uppercase tracking-widest mb-5">裏</p>
              <p className="text-3xl font-black text-gray-900 leading-tight">{card.back}</p>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className={`grid grid-cols-2 gap-3 mt-4 transition-opacity ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <button onClick={() => answer(false)}
            className="py-4 bg-red-50 text-red-500 border border-red-100 rounded-xl font-bold hover:bg-red-100 transition-colors">
            もう一度
          </button>
          <button onClick={() => answer(true)}
            className="py-4 bg-[#16A34A] text-white rounded-xl font-bold hover:bg-[#166534] transition-colors">
            覚えた ✓
          </button>
        </div>
        {!flipped && <div className="h-[60px] mt-4" />}
      </div>
    )
  }

  /* ===== LIST MODE ===== */
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/flashcards" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">← 戻る</Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-gray-900 truncate">{deck?.title}</h2>
          <p className="text-gray-400 text-xs">{deck?.language} · {cards.length}枚</p>
        </div>
        <button onClick={startStudy} disabled={cards.length === 0}
          className="px-5 py-2.5 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-40 transition-colors whitespace-nowrap shrink-0">
          {dueCount > 0 ? `学習する (${dueCount}枚)` : '復習する'}
        </button>
      </div>

      {/* Add card */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-5 shadow-sm">
        <h3 className="font-bold text-gray-700 text-sm mb-3">カードを追加</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input value={front} onChange={e => setFront(e.target.value)}
            placeholder="表（単語・フレーズ）"
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]" />
          <input value={back} onChange={e => setBack(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCard()}
            placeholder="裏（意味・訳）"
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]" />
        </div>
        <button onClick={addCard} disabled={!front.trim() || !back.trim() || adding}
          className="px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50 transition-colors">
          {adding ? '追加中...' : '＋ 追加する'}
        </button>
      </div>

      {/* Cards */}
      {cards.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🃏</p>
          <p className="text-sm">カードがまだありません。追加してみましょう！</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {cards.map(card => (
            <div key={card.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-4 hover:border-gray-200 transition-colors">
              <div className="flex-1 grid grid-cols-2 gap-4 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{card.front}</p>
                <p className="text-sm text-gray-500 truncate">{card.back}</p>
              </div>
              <span className={`text-[11px] font-bold shrink-0 ${masteryColor(card.mastery)}`}>
                {masteryLabel(card.mastery)}
              </span>
              <button onClick={() => deleteCard(card.id)} className="text-gray-300 hover:text-red-400 transition-colors text-sm shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
