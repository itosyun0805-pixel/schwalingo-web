'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const LANGUAGE_FLAGS: Record<string, string> = {
  '英語': '🇺🇸', '中国語': '🇨🇳', '韓国語': '🇰🇷', 'スペイン語': '🇪🇸',
  'フランス語': '🇫🇷', 'ドイツ語': '🇩🇪', 'ポルトガル語': '🇧🇷', 'イタリア語': '🇮🇹',
  'タイ語': '🇹🇭', 'ベトナム語': '🇻🇳', 'インドネシア語': '🇮🇩', 'アラビア語': '🇸🇦', '日本語教育': '🎌',
}
const LANGUAGES = Object.keys(LANGUAGE_FLAGS)
const LEVELS = [
  { value: 'beginner', label: '初級' },
  { value: 'intermediate', label: '中級' },
  { value: 'advanced', label: '上級' },
  { value: 'native', label: 'ネイティブ' },
]
const LEVEL_LABEL: Record<string, string> = {
  beginner: '初級', intermediate: '中級', advanced: '上級', native: 'ネイティブ'
}

type Skill = { language: string; level: string }

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [nativeLang, setNativeLang] = useState('日本語')
  const [skills, setSkills] = useState<Skill[]>([])
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [joinYear, setJoinYear] = useState(new Date().getFullYear())
  const [userId, setUserId] = useState<string | null>(null)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [eName, setEName] = useState('')
  const [eBio, setEBio] = useState('')
  const [eNative, setENative] = useState('日本語')
  const [eSkills, setESkills] = useState<Skill[]>([])
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      setEmail(user.email || '')
      setUserId(user.id)
      const [{ data: p }, { data: s }, { count: fing }, { count: fers }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_skills').select('*').eq('user_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      ])
      setFollowingCount(fing || 0)
      setFollowersCount(fers || 0)
      if (p) {
        setName(p.name || '')
        setBio(p.bio || '')
        setNativeLang(p.native_language || '日本語')
        setAvatarUrl(p.avatar_url || null)
        if (p.created_at) setJoinYear(new Date(p.created_at).getFullYear())
      }
      if (s) setSkills(s.map((x: any) => ({ language: x.language, level: x.level })))
      setLoading(false)

    }
    load()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('profiles').upsert({ id: userId, avatar_url: publicUrl, updated_at: new Date().toISOString() })
      setAvatarUrl(publicUrl + '?t=' + Date.now())
    }
    setUploadingAvatar(false)
  }

  const startEdit = () => { setEName(name); setEBio(bio); setENative(nativeLang); setESkills([...skills]); setEditing(true) }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, name: eName, bio: eBio, native_language: eNative, updated_at: new Date().toISOString() })
    await supabase.from('user_skills').delete().eq('user_id', user.id)
    if (eSkills.length > 0) await supabase.from('user_skills').insert(eSkills.map(s => ({ user_id: user.id, language: s.language, level: s.level })))
    setName(eName); setBio(eBio); setNativeLang(eNative); setSkills(eSkills)
    setSaving(false); setEditing(false)
  }

  const addSkill = (lang: string) => { if (eSkills.find(s => s.language === lang)) return; setESkills([...eSkills, { language: lang, level: 'intermediate' }]) }
  const removeSkill = (lang: string) => setESkills(eSkills.filter(s => s.language !== lang))
  const updateLevel = (lang: string, level: string) => setESkills(eSkills.map(s => s.language === lang ? { ...s, level } : s))

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">読み込み中...</p></div>

  const handle = email.split('@')[0]
  const displayName = name || 'ユーザー名未設定'

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left: Profile card */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="bg-[#D1FAE5] pt-8 pb-10 flex flex-col items-center relative">
              <button onClick={startEdit}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-gray-500 text-sm transition-colors"
                title="編集">✏️</button>

              {/* Avatar with upload */}
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative w-20 h-20 rounded-full overflow-hidden border-[3px] border-white shadow-md group"
                title="写真を変更"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#A7F3D0]/60 flex items-center justify-center">
                    <span className="text-[#16A34A]/40 text-3xl leading-none">＋</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{uploadingAvatar ? '...' : '変更'}</span>
                </div>
              </button>
            </div>

            <div className="px-5 -mt-5 pb-5">
              <div className="bg-white rounded-xl pt-3">
                <h1 className="text-lg font-black text-gray-900">{displayName}</h1>
                <p className="text-gray-400 text-xs mt-0.5">@{handle} · JOINED {joinYear}</p>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-0.5 min-h-[26px]">
                    {skills.length === 0 && <span className="text-gray-200 text-xl">🌐</span>}
                    {skills.slice(0, 3).map(s => <span key={s.language} className="text-xl">{LANGUAGE_FLAGS[s.language]}</span>)}
                    {skills.length > 3 && <span className="text-[10px] text-gray-500 font-bold border border-gray-300 rounded-full px-1 py-0.5 ml-0.5">+{skills.length - 3}</span>}
                  </div>
                  <span className="text-[10px] text-gray-400">Courses</span>
                </div>
                <div className="flex flex-col items-center gap-1"><span className="font-black text-gray-800">{followingCount}</span><span className="text-[10px] text-gray-400">Following</span></div>
                <div className="flex flex-col items-center gap-1"><span className="font-black text-gray-800">{followersCount}</span><span className="text-[10px] text-gray-400">Followers</span></div>
              </div>
              <button onClick={startEdit}
                className="mt-4 w-full py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:border-[#16A34A] hover:text-[#16A34A] transition-colors">
                プロフィールを編集
              </button>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 space-y-4">
          {!name && (
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-gray-800 text-sm">Finish your profile!</p>
                <p className="text-[11px] text-gray-400 mt-0.5">1 STEP LEFT</p>
              </div>
              <button onClick={startEdit} className="bg-[#16A34A] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#166534] transition-colors whitespace-nowrap">
                COMPLETE PROFILE
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">About</p>
            <p className="text-sm text-gray-700 leading-relaxed">{bio || '自己紹介がまだ設定されていません。'}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Languages</p>
            {skills.length === 0 ? <p className="text-sm text-gray-400">語学スキルが登録されていません。</p> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {skills.map(skill => (
                  <div key={skill.language} className="flex items-center gap-3 bg-[#F7FDF9] rounded-xl p-3">
                    <span className="text-2xl">{LANGUAGE_FLAGS[skill.language]}</span>
                    <div>
                      <span className="font-bold text-gray-800 text-sm">{skill.language}</span>
                      <p className="text-xs text-gray-400">{LEVEL_LABEL[skill.level]}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Flashcards</p>
              <Link href="/dashboard/flashcards" className="text-xs font-bold text-[#16A34A] hover:text-[#166534] transition-colors">すべて見る →</Link>
            </div>
            <div className="flex items-center justify-between bg-[#F7FDF9] rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🃏</span>
                <div>
                  <p className="font-bold text-gray-800 text-sm">フラッシュカードで学習</p>
                  <p className="text-xs text-gray-400">単語・フレーズを効率よく暗記</p>
                </div>
              </div>
              <Link href="/dashboard/flashcards"
                className="px-4 py-2 bg-[#16A34A] text-white rounded-xl text-xs font-bold hover:bg-[#166534] transition-colors whitespace-nowrap">
                デッキを作成 →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Overview</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: '🔥', value: '0 days', label: 'ストリーク' },
                { icon: '📚', value: String(skills.length), label: 'コース数' },
                { icon: '🏆', value: 'Bronze', label: 'リーグ' },
                { icon: '⚡️', value: '0 XP', label: '経験値' },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col items-center bg-[#F7FDF9] rounded-xl p-3 gap-1">
                  <span className="text-2xl">{stat.icon}</span>
                  <span className="font-black text-gray-800 text-sm">{stat.value}</span>
                  <span className="text-[10px] text-gray-400">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900">プロフィール編集</h3>
              <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">名前</label>
                <input value={eName} onChange={e => setEName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-sm" placeholder="山田 太郎" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">About（自己紹介）</label>
                <textarea value={eBio} onChange={e => setEBio(e.target.value)} rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-sm resize-none"
                  placeholder="語学スキルや興味・やりたいことを書いてください" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">母語</label>
                <select value={eNative} onChange={e => setENative(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#16A34A] text-sm bg-white">
                  <option>日本語</option><option>英語</option><option>中国語</option><option>韓国語</option><option>その他</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">語学スキル</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {LANGUAGES.map(lang => {
                    const sel = eSkills.find(s => s.language === lang)
                    return (
                      <button key={lang} onClick={() => sel ? removeSkill(lang) : addSkill(lang)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                          sel ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#16A34A]'
                        }`}>
                        <span>{LANGUAGE_FLAGS[lang]}</span>{lang}
                      </button>
                    )
                  })}
                </div>
                {eSkills.length > 0 && (
                  <div className="space-y-2">
                    {eSkills.map(skill => (
                      <div key={skill.language} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm">{LANGUAGE_FLAGS[skill.language]} {skill.language}</span>
                          <button onClick={() => removeSkill(skill.language)} className="text-gray-300 hover:text-red-400">✕</button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {LEVELS.map(lv => (
                            <button key={lv.value} onClick={() => updateLevel(skill.language, lv.value)}
                              className={`p-1.5 rounded-lg text-center border text-xs transition-all ${
                                skill.level === lv.value ? 'bg-[#16A34A] text-white border-[#16A34A]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#16A34A]'
                              }`}>
                              {lv.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={handleSave} disabled={saving}
                className="w-full py-3 bg-[#16A34A] text-white rounded-xl font-bold text-sm hover:bg-[#166534] transition-colors disabled:opacity-50">
                {saving ? '保存中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
