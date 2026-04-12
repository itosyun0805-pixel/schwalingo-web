'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type EventItem   = { id: string; title: string; date: string; day: string; time: string; location: string; tag: string; level: string; description: string; cover_image_url: string; capacity: string }
type JobItem     = { id: string; title: string; company: string; location: string; tag: string; language: string }
type ChannelItem = { id: string; name: string; slug: string; description: string }
type VideoItem   = { id: string; title: string; youtube_url: string; language: string; level: string; description: string }
type AttendeeInfo = { user_id: string; profiles: { name: string | null } | null }

const E0 = { title:'', date:'', day:'', time:'', location:'', tag:'', level:'全レベル', description:'', cover_image_url:'', capacity:'' }
const J0 = { title:'', company:'', location:'', tag:'', language:'' }
const C0 = { name:'', slug:'', description:'' }
const V0 = { title:'', youtube_url:'', language:'英語', level:'全レベル', description:'' }

const LANGUAGES = ['英語','中国語','韓国語','スペイン語','フランス語','ドイツ語','ポルトガル語','イタリア語','タイ語','ベトナム語','インドネシア語','アラビア語','日本語教育']
const LEVELS = ['初級','中級','上級','全レベル']

const SLUG_MAP: Record<string, string> = {
  '英語':'english','中国語':'chinese','韓国語':'korean','スペイン語':'spanish',
  'フランス語':'french','ドイツ語':'german','ポルトガル語':'portuguese',
  'イタリア語':'italian','タイ語':'thai','ベトナム語':'vietnamese',
  'インドネシア語':'indonesian','アラビア語':'arabic','日本語教育':'japanese'
}

export default function AdminPage() {
  const [tab, setTab] = useState<'events'|'jobs'|'channels'|'videos'>('events')
  const [events, setEvents]     = useState<EventItem[]>([])
  const [jobs, setJobs]         = useState<JobItem[]>([])
  const [channels, setChannels] = useState<ChannelItem[]>([])
  const [videos, setVideos]     = useState<VideoItem[]>([])
  const [ef, setEf] = useState(E0)
  const [jf, setJf] = useState(J0)
  const [cf, setCf] = useState(C0)
  const [vf, setVf] = useState(V0)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [attendeesModal, setAttendeesModal] = useState<{ title: string; attendees: AttendeeInfo[] } | null>(null)
  const supabase = createClient()
  const router   = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!p?.is_admin) { router.push('/dashboard'); return }
      load()
    }
    init()
  }, [])

  const load = async () => {
    const [{ data: ev }, { data: jb }, { data: ch }, { data: vi }] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('jobs').select('*').order('created_at', { ascending: false }),
      supabase.from('channels').select('*').order('created_at'),
      supabase.from('videos').select('*').order('created_at', { ascending: false }),
    ])
    if (ev) setEvents(ev as any)
    if (jb) setJobs(jb)
    if (ch) setChannels(ch)
    if (vi) setVideos(vi)
  }

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const saveEvent = async () => {
    if (!ef.title) return; setSaving(true)
    const payload = { ...ef, capacity: ef.capacity ? parseInt(ef.capacity) : null }
    await supabase.from('events').insert(payload)
    setEf(E0); await load(); flash('イベントを追加しました'); setSaving(false)
  }
  const saveJob = async () => {
    if (!jf.title) return; setSaving(true)
    await supabase.from('jobs').insert(jf); setJf(J0); await load(); flash('求人を追加しました'); setSaving(false)
  }
  const saveChannel = async () => {
    if (!cf.name || !cf.slug) return; setSaving(true)
    await supabase.from('channels').insert(cf); setCf(C0); await load(); flash('チャンネルを追加しました'); setSaving(false)
  }
  const saveVideo = async () => {
    if (!vf.title || !vf.youtube_url) return; setSaving(true)
    await supabase.from('videos').insert(vf); setVf(V0); await load(); flash('動画を追加しました'); setSaving(false)
  }

  const viewAttendees = async (ev: EventItem) => {
    const { data } = await supabase
      .from('event_attendees')
      .select('user_id, profiles(name)')
      .eq('event_id', ev.id)
    setAttendeesModal({ title: ev.title, attendees: (data || []) as any })
  }

  const ic = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] bg-white"
  const ta = `${ic} resize-none`

  const Row = ({ label, onDelete, onView }: { label: string; onDelete: () => void; onView?: () => void }) => (
    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 gap-3">
      <p className="text-sm text-gray-700 flex-1 truncate">{label}</p>
      <div className="flex items-center gap-2 shrink-0">
        {onView && (
          <button onClick={onView} className="text-xs font-bold text-[#16A34A] hover:text-[#166534] transition-colors">参加者</button>
        )}
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors">✕</button>
      </div>
    </div>
  )

  const TABS = [
    { key: 'events', label: 'イベント' },
    { key: 'jobs',   label: '求人' },
    { key: 'channels', label: 'チャンネル' },
    { key: 'videos', label: '動画' },
  ] as const

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-black text-gray-900">管理画面</h2>
        <p className="text-gray-400 text-sm mt-1">イベント・求人・チャンネル・動画の管理</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors ${tab === t.key ? 'bg-white text-[#16A34A] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && <div className="mb-4 bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-xl">{msg}</div>}

      {/* Events */}
      {tab === 'events' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="font-bold text-gray-700 text-sm mb-4">新規イベントを追加</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input value={ef.title} onChange={e => setEf({...ef,title:e.target.value})} placeholder="タイトル *" className={`${ic} sm:col-span-2`} />
              <input value={ef.date}  onChange={e => setEf({...ef,date:e.target.value})}  placeholder="日付（例: 5/10）" className={ic} />
              <input value={ef.day}   onChange={e => setEf({...ef,day:e.target.value})}   placeholder="曜日（例: 土）" className={ic} />
              <input value={ef.time}  onChange={e => setEf({...ef,time:e.target.value})}  placeholder="時間（例: 14:00〜16:00）" className={ic} />
              <input value={ef.location} onChange={e => setEf({...ef,location:e.target.value})} placeholder="場所" className={ic} />
              <input value={ef.tag}   onChange={e => setEf({...ef,tag:e.target.value})}   placeholder="タグ（例: 練習会）" className={ic} />
              <input value={ef.level} onChange={e => setEf({...ef,level:e.target.value})} placeholder="レベル（例: 中級〜）" className={ic} />
              <input value={ef.capacity} onChange={e => setEf({...ef,capacity:e.target.value})} placeholder="定員（例: 20）" type="number" className={ic} />
              <input value={ef.cover_image_url} onChange={e => setEf({...ef,cover_image_url:e.target.value})} placeholder="カバー画像URL（任意）" className={`${ic} sm:col-span-2`} />
              <textarea value={ef.description} onChange={e => setEf({...ef,description:e.target.value})} placeholder="詳細説明（任意）" rows={3} className={`${ta} sm:col-span-2`} />
            </div>
            <button onClick={saveEvent} disabled={saving||!ef.title} className="mt-3 px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50 transition-colors">
              {saving ? '追加中...' : '＋ 追加'}
            </button>
          </div>
          <div className="space-y-1.5">
            {events.length === 0 && <p className="text-gray-400 text-sm text-center py-6">イベントがまだありません</p>}
            {events.map(ev => (
              <Row key={ev.id}
                label={`${ev.title} — ${[ev.date, ev.time, ev.location].filter(Boolean).join(' · ')}`}
                onView={() => viewAttendees(ev)}
                onDelete={async () => { await supabase.from('events').delete().eq('id', ev.id); setEvents(p => p.filter(x => x.id !== ev.id)) }} />
            ))}
          </div>
        </div>
      )}

      {/* Jobs */}
      {tab === 'jobs' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="font-bold text-gray-700 text-sm mb-4">新規求人を追加</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input value={jf.title}    onChange={e => setJf({...jf,title:e.target.value})}    placeholder="求人タイトル *" className={`${ic} sm:col-span-2`} />
              <input value={jf.company}  onChange={e => setJf({...jf,company:e.target.value})}  placeholder="会社・団体名" className={ic} />
              <input value={jf.location} onChange={e => setJf({...jf,location:e.target.value})} placeholder="場所" className={ic} />
              <input value={jf.language} onChange={e => setJf({...jf,language:e.target.value})} placeholder="必要言語" className={ic} />
              <input value={jf.tag}      onChange={e => setJf({...jf,tag:e.target.value})}      placeholder="タグ" className={ic} />
            </div>
            <button onClick={saveJob} disabled={saving||!jf.title} className="mt-3 px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50 transition-colors">
              {saving ? '追加中...' : '＋ 追加'}
            </button>
          </div>
          <div className="space-y-1.5">
            {jobs.length === 0 && <p className="text-gray-400 text-sm text-center py-6">求人がまだありません</p>}
            {jobs.map(jb => (
              <Row key={jb.id}
                label={`${jb.title} — ${[jb.company, jb.location, jb.language].filter(Boolean).join(' · ')}`}
                onDelete={async () => { await supabase.from('jobs').delete().eq('id', jb.id); setJobs(p => p.filter(x => x.id !== jb.id)) }} />
            ))}
          </div>
        </div>
      )}

      {/* Channels */}
      {tab === 'channels' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="font-bold text-gray-700 text-sm mb-4">新規チャンネルを追加</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input value={cf.name} onChange={e => setCf({...cf, name:e.target.value, slug: SLUG_MAP[e.target.value] || e.target.value.toLowerCase().replace(/\s+/g,'-')})}
                placeholder="チャンネル名 *（例: ポルトガル語）" className={ic} />
              <input value={cf.slug} onChange={e => setCf({...cf,slug:e.target.value})}
                placeholder="スラッグ *（例: portuguese）" className={ic} />
              <input value={cf.description} onChange={e => setCf({...cf,description:e.target.value})}
                placeholder="説明（任意）" className={`${ic} sm:col-span-2`} />
            </div>
            <button onClick={saveChannel} disabled={saving||!cf.name||!cf.slug} className="mt-3 px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50 transition-colors">
              {saving ? '追加中...' : '＋ 追加'}
            </button>
          </div>
          <div className="space-y-1.5">
            {channels.map(ch => (
              <Row key={ch.id}
                label={`# ${ch.name}  /${ch.slug}${ch.description ? ` — ${ch.description}` : ''}`}
                onDelete={async () => { await supabase.from('channels').delete().eq('id', ch.id); setChannels(p => p.filter(x => x.id !== ch.id)) }} />
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {tab === 'videos' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="font-bold text-gray-700 text-sm mb-4">新規動画を追加</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input value={vf.title} onChange={e => setVf({...vf,title:e.target.value})} placeholder="動画タイトル *" className={`${ic} sm:col-span-2`} />
              <input value={vf.youtube_url} onChange={e => setVf({...vf,youtube_url:e.target.value})} placeholder="YouTube URL *" className={`${ic} sm:col-span-2`} />
              <select value={vf.language} onChange={e => setVf({...vf,language:e.target.value})} className={ic}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
              <select value={vf.level} onChange={e => setVf({...vf,level:e.target.value})} className={ic}>
                {LEVELS.map(l => <option key={l}>{l}</option>)}
              </select>
              <textarea value={vf.description} onChange={e => setVf({...vf,description:e.target.value})} placeholder="説明（任意）" rows={2} className={`${ta} sm:col-span-2`} />
            </div>
            <button onClick={saveVideo} disabled={saving||!vf.title||!vf.youtube_url} className="mt-3 px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50 transition-colors">
              {saving ? '追加中...' : '＋ 追加'}
            </button>
          </div>
          <div className="space-y-1.5">
            {videos.length === 0 && <p className="text-gray-400 text-sm text-center py-6">動画がまだありません</p>}
            {videos.map(vi => (
              <Row key={vi.id}
                label={`${vi.title} — ${vi.language} · ${vi.level}`}
                onDelete={async () => { await supabase.from('videos').delete().eq('id', vi.id); setVideos(p => p.filter(x => x.id !== vi.id)) }} />
            ))}
          </div>
        </div>
      )}

      {/* Attendees Modal */}
      {attendeesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-sm">参加者一覧</h3>
                <p className="text-xs text-gray-400 mt-0.5">{attendeesModal.title}</p>
              </div>
              <button onClick={() => setAttendeesModal(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="px-6 py-4">
              {attendeesModal.attendees.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">参加者がいません</p>
              ) : (
                <div className="space-y-2">
                  {attendeesModal.attendees.map((a, i) => (
                    <div key={a.user_id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-[#16A34A]/20 flex items-center justify-center text-[#16A34A] text-xs font-bold">
                        {(a.profiles?.name || 'U')[0].toUpperCase()}
                      </div>
                      <p className="text-sm font-semibold text-gray-700">{a.profiles?.name || '名前未設定'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
