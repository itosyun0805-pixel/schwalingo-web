import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const COVER_GRADIENTS = [
  'from-green-400 to-emerald-600',
  'from-blue-400 to-indigo-600',
  'from-purple-400 to-pink-500',
  'from-orange-400 to-red-500',
  'from-teal-400 to-cyan-600',
  'from-yellow-400 to-orange-500',
]

const TAG_COLORS: Record<string, string> = {
  'ガイド': 'bg-blue-50 text-blue-600',
  'コミュニティ': 'bg-purple-50 text-purple-600',
  '練習会': 'bg-pink-50 text-pink-600',
  'ビジネス': 'bg-green-50 text-green-600',
  'イベント': 'bg-yellow-50 text-yellow-600',
  '講師': 'bg-orange-50 text-orange-600',
  '交流': 'bg-teal-50 text-teal-600',
  '勉強会': 'bg-indigo-50 text-indigo-600',
}

export default async function EventsPage() {
  const supabase = await createClient()

  const [{ data: events }, { data: jobs }] = await Promise.all([
    supabase.from('events').select('*, event_attendees(user_id)').order('date', { ascending: true }),
    supabase.from('jobs').select('*').order('created_at', { ascending: false }),
  ])

  const eventList = (events || []) as any[]
  const jobList = jobs || []

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-black text-gray-900">イベント</h2>
        <p className="text-gray-400 text-sm mt-1">語学学習者のためのイベント・交流会</p>
      </div>

      {/* Events Grid */}
      {eventList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400 mb-10">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">現在開催予定のイベントはありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {eventList.map((ev, i) => {
            const gradient = COVER_GRADIENTS[i % COVER_GRADIENTS.length]
            const attendeeCount = ev.event_attendees?.length || 0
            const isFull = ev.capacity && attendeeCount >= ev.capacity

            return (
              <Link key={ev.id} href={`/dashboard/events/${ev.id}`}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-green-200 hover:shadow-md transition-all group">
                {/* Cover */}
                <div className="relative h-40 overflow-hidden">
                  {ev.cover_image_url ? (
                    <img src={ev.cover_image_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} group-hover:scale-105 transition-transform duration-300`} />
                  )}
                  {/* Date badge */}
                  <div className="absolute top-3 left-3 bg-white rounded-xl px-3 py-1.5 shadow-sm text-center min-w-[48px]">
                    <p className="text-[11px] font-black text-[#16A34A] leading-none">{ev.date?.split('/')[0]}月</p>
                    <p className="text-lg font-black text-gray-900 leading-tight">{ev.date?.split('/')[1]}</p>
                  </div>
                  {isFull && (
                    <div className="absolute top-3 right-3 bg-gray-800/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg">満員</div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {ev.tag && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_COLORS[ev.tag] || 'bg-gray-50 text-gray-600'}`}>
                        {ev.tag}
                      </span>
                    )}
                    {ev.level && <span className="text-[10px] text-gray-400">{ev.level}</span>}
                    {ev.day && <span className="text-[10px] text-gray-400">{ev.day}曜日</span>}
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm leading-snug mb-2 line-clamp-2">{ev.title}</h3>
                  {ev.location && (
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <span>📍</span>{ev.location}
                    </p>
                  )}
                  {ev.time && (
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <span>🕐</span>{ev.time}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-1.5">
                      <div className="flex -space-x-1">
                        {[...Array(Math.min(attendeeCount, 3))].map((_, i) => (
                          <div key={i} className={`w-5 h-5 rounded-full border border-white ${['bg-green-400','bg-blue-400','bg-purple-400'][i]}`} />
                        ))}
                      </div>
                      <span className="text-[11px] text-gray-500 font-semibold">
                        {attendeeCount > 0 ? `${attendeeCount}人参加` : '参加者募集中'}
                      </span>
                    </div>
                    {ev.capacity && (
                      <span className="text-[10px] text-gray-400">定員{ev.capacity}人</span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Jobs */}
      <div>
        <h2 className="text-xl font-black text-gray-900 mb-2">求人</h2>
        <p className="text-gray-400 text-sm mb-5">語学スキルを活かせる仕事・副業</p>
        {jobList.length === 0 ? (
          <div className="bg-[#1E3A2A] rounded-2xl p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">💼</span>
              <p className="font-black">求人ボード 準備中</p>
            </div>
            <p className="text-white/60 text-sm">語学スキルを活かせる仕事・副業の求人を近日公開予定です。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {jobList.map((jb: any) => (
              <div key={jb.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-green-200 hover:shadow-sm transition-all cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      {jb.tag && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_COLORS[jb.tag] || 'bg-gray-50 text-gray-600'}`}>
                          {jb.tag}
                        </span>
                      )}
                      {jb.language && <span className="text-[10px] text-gray-400">{jb.language}</span>}
                    </div>
                    <p className="font-bold text-gray-800 text-sm">{jb.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{[jb.company, jb.location].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="text-gray-300 text-sm shrink-0">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
