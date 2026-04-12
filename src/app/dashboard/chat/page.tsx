'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const LANG_FLAGS: Record<string, string> = {
  '英語':'🇺🇸','中国語':'🇨🇳','韓国語':'🇰🇷','スペイン語':'🇪🇸','フランス語':'🇫🇷','ドイツ語':'🇩🇪',
  'ポルトガル語':'🇧🇷','イタリア語':'🇮🇹','タイ語':'🇹🇭','ベトナム語':'🇻🇳','インドネシア語':'🇮🇩','アラビア語':'🇸🇦','日本語教育':'🎌'
}

type Channel = { id: string; name: string; slug: string; description: string | null }

export default function ChatIndexPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('channels').select('id, name, slug, description').order('created_at')
      if (data) setChannels(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">読み込み中...</p></div>

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-black text-gray-900">Open Chat</h2>
        <p className="text-gray-400 text-sm mt-1">言語チャンネルを選んで参加しよう</p>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm">チャンネルがまだありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map(ch => (
            <Link key={ch.id} href={`/dashboard/chat/${ch.slug}`}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-4 py-3.5 hover:border-green-200 hover:shadow-sm transition-all group"
            >
              <span className="text-2xl shrink-0">{LANG_FLAGS[ch.name] || '💬'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[#1E3A2A]/40 font-bold text-sm">#</span>
                  <span className="font-bold text-gray-800 text-sm">{ch.name}</span>
                </div>
                {ch.description && <p className="text-xs text-gray-400 truncate mt-0.5">{ch.description}</p>}
              </div>
              <span className="text-gray-300 group-hover:text-[#16A34A] transition-colors shrink-0 text-sm">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
