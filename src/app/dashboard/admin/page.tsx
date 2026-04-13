'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type EventItem   = { id: string; title: string; date: string; time: string; location: string; tag: string; level: string; description: string; cover_image_url: string; capacity: string; languages: string[] }
type JobItem     = { id: string; title: string; company: string; location: string; tag: string; language: string }
type ChannelItem = { id: string; name: string; slug: string; description: string }
type VideoItem   = { id: string; title: string; youtube_url: string; language: string; level: string; description: string }
type AttendeeInfo = { user_id: string; profiles: { name: string | null; email: string | null; bio: string | null } | null; user_skills?: { language: string; level: string }[] }

const E0 = { title:'', date:'', time_start:'', time_end:'', location:'', tag:'', level:'全レベル', description:'', cover_image_url:'', capacity:'', languages:[] as string[] }
const J0 = { title:'', company:'', location:'', tag:'', language:'' }
const C0 = { name:'', slug:'', description:'' }
const V0 = { title:'', youtube_url:'', language:'英語', level:'全レベル', description:'' }

const LANG_FLAGS: Record<string,string> = {
  '英語':'🇺🇸','中国語':'🇨🇳','韓国語':'🇰🇷','スペイン語':'🇪🇸','フランス語':'🇫🇷','ドイツ語':'🇩🇪',
  'ポルトガル語':'🇧🇷','イタリア語':'🇮🇹','タイ語':'🇹🇭','ベトナム語':'🇻🇳','インドネシア語':'🇮🇩','アラビア語':'🇸🇦','日本語教育':'🎌'
}
const LANGUAGES = Object.keys(LANG_FLAGS)
const LEVELS = ['初級','中級','上級','全レベル']
const LEVEL_LABEL: Record<string,string> = { beginner:'初級', intermediate:'中級', advanced:'上級', native:'ネイティブ' }

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
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [attendeesModal, setAttendeesModal] = useState<{ title: string; attendees: AttendeeInfo[] } | null>(null)
  const coverRef = useRef<HTMLInputElement>(null)
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
    let cover_image_url = ef.cover_image_url

    // Upload cover image
    if (coverFile) {
      const ext = coverFile.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('event-covers').upload(path, coverFile)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('event-covers').getPublicUrl(path)
        cover_image_url = publicUrl
      }
    }

    const timeStr = ef.time_start && ef.time_end ? `${ef.time_start}〜${ef.time_end}` : (ef.time_start || '')
    const payload = {
      title: ef.title, date: ef.date, time: timeStr,
      location: ef.location, tag: ef.tag, level: ef.level,
      description: ef.description, cover_image_url,
      capacity: ef.capacity ? parseInt(ef.capacity) : null,
      languages: ef.languages,
    }
    await supabase.from('events').insert(payload)
    setEf(E0); setCoverFile(null); setCoverPreview(null)
    await load(); flash('イベントを追加しました'); setSaving(false)
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
      .select('user_id, profiles(name, email, bio)')
      .eq('event_id', ev.id)
    // Fetch skills for each attendee
    const attendees = (data || []) as unknown as AttendeeInfo[]
    if (attendees.length > 0) {
      const userIds = attendees.map(a => a.user_id)
      const { data: skills } = await supabase.from('user_skills').select('user_id, language, level').in('user_id', userIds)
      const skillMap: Record<string, { language: string; level: string }[]> = {}
      ;(skills || []).forEach((s: any) => { if (!skillMap[s.user_id]) skillMap[s.user_id] = []; skillMap[s.user_id].push(s) })
      attendees.forEach(a => { a.user_skills = skillMap[a.user_id] || [] })
    }
    setAttendeesModal({ title: ev.title, attendees })
  }

  const toggleEfLang = (lang: string) => {
    setEf(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang]
    }))
  }

  const ic = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] bg-white"
  const ta = `${ic} resize-none`

  const Row = ({ label, onDelete, onView }: { label: string; onDelete: () => void; onView?: () => void }) => (
    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 gap-3">
      <p className="text-sm text-gray-700 flex-1 truncate">{label}</p>
      <div className="flex items-center gap-2 shrink-0">
        {onView && <button onClick={onView} className="text-xs font-bold text-[#16A34A] hover:text-[#166534]">参加者</button>}
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400">✕</button>
      </div>
    </div>
  )

  const TABS = [
    { key: 'events', label: 'イベント' }, { key: 'jobs', label: '求人' },
    { key: 'channels', label: 'チャンネル' }, { key: 'videos', label: '動画' },
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

      {/* ===== EVENTS ===== */}
      {tab === 'events' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="font-bold text-gray-700 text-sm mb-4">新規イベントを追加</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input value={ef.title} onChange={e => setEf({...ef,title:e.target.value})} placeholder="タイトル *" className={`${ic} sm:col-span-2`} />

              {/* Date picker */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">日付</label>
                <input type="date" value={ef.date} onChange={e => setEf({...ef,date:e.target.value})} className={ic} />
              </div>

              {/* Time pickers */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">時間</label>
                <div className="flex items-center gap-1.5">
                  <input type="time" value={ef.time_start} onChange={e => setEf({...ef,time_start:e.target.value})} className={`${ic} flex-1`} />
                  <span className="text-gray-400 text-sm shrink-0">〜</span>
                  <input type="time" value={ef.time_end} onChange={e => setEf({...ef,time_end:e.target.value})} className={`${ic} flex-1`} />
                </div>
              </div>

              <input value={ef.location} onChange={e => setEf({...ef,location:e.target.value})} placeholder="場所" className={ic} />
              <input value={ef.tag} onChange={e => setEf({...ef,tag:e.target.value})} placeholder="タグ（例: 練習会）" className={ic} />
              <input value={ef.level} onChange={e => setEf({...ef,level:e.target.value})} placeholder="レベル（例: 中級〜）" className={ic} />
              <input value={ef.capacity} onChange={e => setEf({...ef,capacity:e.target.value})} placeholder="定員（例: 20）" type="number" className={ic} />

              {/* Language multi-select */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">対象言語（複数選択可）</label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map(lang => (
                    <button key={lang} type="button" onClick={() => toggleEfLang(lang)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        ef.languages.includes(lang) ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#16A34A]'
                      }`}>
                      <span>{LANG_FLAGS[lang]}</span>{lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover image upload */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wide">カバー写真（PNG推奨）</label>
                <input ref={coverRef} type="file" accept="image/png,image/jpeg" onChange={e => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)) }}} className="hidden" />
                {coverPreview ? (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden">
                    <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); if (coverRef.current) coverRef.current.value = '' }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center text-sm">✕</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => coverRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#16A34A] hover:text-[#16A34A] transition-colors">
                    <span className="text-2xl">📸</span>
                    <span className="text-xs font-semibold">クリックして画像をアップロード</span>
                  </button>
                )}
              </div>

              <textarea value={ef.description} onChange={e => setEf({...ef,description:e.target.value})} placeholder="詳細説明（任意）" rows={3} className={`${ta} sm:col-span-2`} />
            </div>
            <button onClick={saveEvent} disabled={saving||!ef.title} className="mt-3 px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50">
              {saving ? '追加中...' : '＋ 追加'}
            </button>
          </div>
          <div className="space-y-1.5">
            {events.length === 0 && <p className="text-gray-400 text-sm text-center py-6">イベントがまだありません</p>}
            {events.map(ev => (
              <Row key={ev.id}
                label={`${ev.title} — ${[ev.date, ev.location].filter(Boolean).join(' · ')}`}
                onView={() => viewAttendees(ev)}
                onDelete={async () => { await supabase.from('events').delete().eq('id', ev.id); setEvents(p => p.filter(x => x.id !== ev.id)) }} />
            ))}
          </div>
        </div>
      )}

      {/* ===== JOBS ===== */}
      {tab === 'jobs' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="font-bold text-gray-700 text-sm mb-4">新規求人を追加</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input value={jf.title} onChange={e => setJf({...jf,title:e.target.value})} placeholder="求人タイトル *" className={`${ic} sm:col-span-2`} />
              <input value={jf.company} onChange={e => setJf({...jf,company:e.target.value})} placeholder="会社・団体名" className={ic} />
              <input value={jf.location} onChange={e => setJf({...jf,location:e.target.value})} placeholder="場所" className={ic} />
              <input value={jf.language} onChange={e => setJf({...jf,language:e.target.value})} placeholder="必要言語" className={ic} />
              <input value={jf.tag} onChange={e => setJf({...jf,tag:e.target.value})} placeholder="タグ" className={ic} />
            </div>
            <button onClick={saveJob} disabled={saving||!jf.title} className="mt-3 px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50">
              {saving ? '追加中...' : '＋ 追加'}
            </button>
          </div>
          <div className="space-y-1.5">
            {jobs.length === 0 && <p className="text-gray-400 text-sm text-center py-6">求人がまだありません</p>}
            {jobs.map(jb => (
              <Row key={jb.id} label={`${jb.title} — ${[jb.company, jb.location].filter(Boolean).join(' · ')}`}
                onDelete={async () => { await supabase.from('jobs').delete().eq('id', jb.id); setJobs(p => p.filter(x => x.id !== jb.id)) }} />
            ))}
          </div>
        </div>
      )}

      {/* ===== CHANNELS ===== */}
      {tab === 'channels' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="font-bold text-gray-700 text-sm mb-4">新規チャンネルを追加</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input value={cf.name} onChange={e => setCf({...cf,name:e.target.value,slug:SLUG_MAP[e.target.value]||e.target.value.toLowerCase().replace(/\s+/g,'-')})} placeholder="チャンネル名 *" className={ic} />
              <input value={cf.slug} onChange={e => setCf({...cf,slug:e.target.value})} placeholder="スラッグ *（例: portuguese）" className={ic} />
              <input value={cf.description} onChange={e => setCf({...cf,description:e.target.value})} placeholder="説明（任意）" className={`${ic} sm:col-span-2`} />
            </div>
            <button onClick={saveChannel} disabled={saving||!cf.name||!cf.slug} className="mt-3 px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50">
              {saving ? '追加中...' : '＋ 追加'}
            </button>
          </div>
          <div className="space-y-1.5">
            {channels.map(ch => (
              <Row key={ch.id} label={`# ${ch.name}  /${ch.slug}`}
                onDelete={async () => { await supabase.from('channels').delete().eq('id', ch.id); setChannels(p => p.filter(x => x.id !== ch.id)) }} />
            ))}
          </div>
        </div>
      )}

      {/* ===== VIDEOS ===== */}
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
            <button onClick={saveVideo} disabled={saving||!vf.title||!vf.youtube_url} className="mt-3 px-5 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-bold hover:bg-[#166534] disabled:opacity-50">
              {saving ? '追加中...' : '＋ 追加'}
            </button>
          </div>
          <div className="space-y-1.5">
            {videos.length === 0 && <p className="text-gray-400 text-sm text-center py-6">動画がまだありません</p>}
            {videos.map(vi => (
              <Row key={vi.id} label={`${vi.title} — ${vi.language} · ${vi.level}`}
                onDelete={async () => { await supabase.from('videos').delete().eq('id', vi.id); setVideos(p => p.filter(x => x.id !== vi.id)) }} />
            ))}
          </div>
        </div>
      )}

      {/* ===== ATTENDEES MODAL ===== */}
      {attendeesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-black text-gray-900 text-sm">参加者一覧</h3>
                <p className="text-xs text-gray-400 mt-0.5">{attendeesModal.title} · {attendeesModal.attendees.length}人</p>
              </div>
              <button onClick={() => setAttendeesModal(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="px-6 py-4">
              {attendeesModal.attendees.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">参加者がいません</p>
              ) : (
                <div className="space-y-4">
                  {attendeesModal.attendees.map((a, i) => (
                    <div key={a.user_id} className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#16A34A]/20 flex items-center justify-center text-[#16A34A] font-bold text-sm shrink-0">
                          {(a.profiles?.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{a.profiles?.name || '名前未設定'}</p>
                          {a.profiles?.email && <p className="text-xs text-gray-400">{a.profiles.email}</p>}
                        </div>
                        <span className="ml-auto text-xs text-gray-300 font-mono">#{i + 1}</span>
                      </div>
                      {a.profiles?.bio && (
                        <p className="text-xs text-gray-500 mb-2 leading-relaxed">{a.profiles.bio}</p>
                      )}
                      {a.user_skills && a.user_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {a.user_skills.map(s => (
                            <span key={s.language} className="text-[10px] font-bold bg-[#16A34A]/10 text-[#16A34A] px-2 py-0.5 rounded-full">
                              {LANG_FLAGS[s.language]} {s.language} · {LEVEL_LABEL[s.level] || s.level}
                            </span>
                          ))}
                        </div>
                      )}
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
