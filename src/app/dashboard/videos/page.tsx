'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const LANGUAGES = ['すべて', '英語', '中国語', '韓国語', 'スペイン語', 'フランス語', 'ドイツ語', 'ポルトガル語', 'イタリア語', 'タイ語', 'ベトナム語', 'インドネシア語', 'アラビア語', '日本語教育']
const LEVELS = ['すべて', '初級', '中級', '上級', '全レベル']

const LANG_FLAGS: Record<string, string> = {
  '英語':'🇺🇸','中国語':'🇨🇳','韓国語':'🇰🇷','スペイン語':'🇪🇸','フランス語':'🇫🇷','ドイツ語':'🇩🇪',
  'ポルトガル語':'🇧🇷','イタリア語':'🇮🇹','タイ語':'🇹🇭','ベトナム語':'🇻🇳','インドネシア語':'🇮🇩','アラビア語':'🇸🇦','日本語教育':'🎌'
}

type Video = { id: string; title: string; description: string | null; youtube_url: string; language: string; level: string; created_at: string }

const getYouTubeId = (url: string) => {
  const m = url.match(/(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] || null
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState('すべて')
  const [level, setLevel] = useState('すべて')
  const [selected, setSelected] = useState<Video | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false })
      if (data) setVideos(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = videos.filter(v =>
    (lang === 'すべて' || v.language === lang) &&
    (level === 'すべて' || v.level === level)
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">読み込み中...</p></div>

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-black text-gray-900">動画学習</h2>
        <p className="text-gray-400 text-sm mt-1">厳選された語学学習動画をまとめました</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {LANGUAGES.map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${lang === l ? 'bg-[#16A34A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {l !== 'すべて' && LANG_FLAGS[l] ? `${LANG_FLAGS[l]} ` : ''}{l}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 sm:ml-auto">
          {LEVELS.map(lv => (
            <button key={lv} onClick={() => setLevel(lv)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${level === lv ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {lv}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🎬</p>
          <p className="text-sm">動画がまだありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(video => {
            const ytId = getYouTubeId(video.youtube_url)
            return (
              <button key={video.id} onClick={() => setSelected(video)}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-green-200 hover:shadow-md transition-all text-left group">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-100 overflow-hidden">
                  {ytId ? (
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-400 to-pink-600 flex items-center justify-center">
                      <span className="text-4xl">▶️</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                      <span className="text-xl ml-1">▶</span>
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-sm">{LANG_FLAGS[video.language] || '🌐'}</span>
                    <span className="text-[10px] font-bold text-gray-400">{video.language}</span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] font-bold text-gray-400">{video.level}</span>
                  </div>
                  <p className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">{video.title}</p>
                  {video.description && (
                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{video.description}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Video Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="relative aspect-video bg-black">
              {getYouTubeId(selected.youtube_url) && (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(selected.youtube_url)}?autoplay=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{LANG_FLAGS[selected.language] || '🌐'}</span>
                    <span className="text-xs font-bold text-gray-400">{selected.language} · {selected.level}</span>
                  </div>
                  <h3 className="font-black text-gray-900 text-base">{selected.title}</h3>
                  {selected.description && <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{selected.description}</p>}
                </div>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none shrink-0">✕</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
