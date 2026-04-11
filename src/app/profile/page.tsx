'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const LANGUAGES = ['英語', '中国語', '韓国語', 'スペイン語', 'フランス語', 'ドイツ語', 'ポルトガル語', 'イタリア語', 'タイ語', 'ベトナム語', 'インドネシア語', 'アラビア語', '日本語教育']
const LEVELS = [
  { value: 'beginner', label: '初級', desc: '簡単な会話ができる' },
  { value: 'intermediate', label: '中級', desc: '日常会話が問題なくできる' },
  { value: 'advanced', label: '上級', desc: 'ビジネスレベルで使える' },
  { value: 'native', label: 'ネイティブ', desc: '母語レベル' },
]

type Skill = { language: string; level: string }

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [nativeLanguage, setNativeLanguage] = useState('日本語')
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()
  const router = useRouter()

  // 既存データを取得
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: userSkills } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', user.id)

      if (profile) {
        setName(profile.name || '')
        setBio(profile.bio || '')
        setNativeLanguage(profile.native_language || '日本語')
      }
      if (userSkills) {
        setSkills(userSkills.map((s: any) => ({ language: s.language, level: s.level })))
      }
      setLoading(false)
    }
    load()
  }, [])

  const addSkill = (language: string) => {
    if (skills.find(s => s.language === language)) return
    setSkills([...skills, { language, level: 'intermediate' }])
  }

  const removeSkill = (language: string) => {
    setSkills(skills.filter(s => s.language !== language))
  }

  const updateLevel = (language: string, level: string) => {
    setSkills(skills.map(s => s.language === language ? { ...s, level } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // プロフィール更新
    await supabase.from('profiles').upsert({
      id: user.id,
      name,
      bio,
      native_language: nativeLanguage,
      updated_at: new Date().toISOString(),
    })

    // スキル：一度全削除して再登録
    await supabase.from('user_skills').delete().eq('user_id', user.id)
    if (skills.length > 0) {
      await supabase.from('user_skills').insert(
        skills.map(s => ({ user_id: user.id, language: s.language, level: s.level }))
      )
    }

    setMessage('保存しました！')
    setSaving(false)
    setTimeout(() => router.push('/dashboard'), 1000)
  }

  if (loading) return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-black text-[#3D7A6E]">SchwaLingo</h1>
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-400 hover:text-gray-600">
          ← ダッシュボードへ
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h2 className="text-2xl font-black text-gray-800 mb-1">プロフィール設定</h2>
          <p className="text-gray-400 text-sm">スキルを登録すると、あなたに合った活かし方が表示されます</p>
        </div>

        {/* 基本情報 */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-700">基本情報</h3>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">名前</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3D7A6E] text-sm"
              placeholder="山田 太郎"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">自己紹介</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3D7A6E] text-sm resize-none"
              placeholder="語学スキルや興味・やりたいことを書いてください"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">母語</label>
            <select
              value={nativeLanguage}
              onChange={e => setNativeLanguage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3D7A6E] text-sm bg-white"
            >
              <option>日本語</option>
              <option>英語</option>
              <option>中国語</option>
              <option>韓国語</option>
              <option>その他</option>
            </select>
          </div>
        </section>

        {/* スキル登録 */}
        <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <h3 className="font-bold text-gray-700">語学スキル</h3>
          <p className="text-xs text-gray-400">話せる言語を選んでください（複数選択可）</p>

          {/* 言語選択 */}
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(lang => {
              const selected = skills.find(s => s.language === lang)
              return (
                <button
                  key={lang}
                  onClick={() => selected ? removeSkill(lang) : addSkill(lang)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    selected
                      ? 'bg-[#3D7A6E] text-white border-[#3D7A6E]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#3D7A6E] hover:text-[#3D7A6E]'
                  }`}
                >
                  {selected ? '✓ ' : ''}{lang}
                </button>
              )
            })}
          </div>

          {/* レベル設定 */}
          {skills.length > 0 && (
            <div className="space-y-3 pt-2">
              {skills.map(skill => (
                <div key={skill.language} className="bg-[#FAFAF8] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-gray-700">{skill.language}</span>
                    <button onClick={() => removeSkill(skill.language)} className="text-gray-300 hover:text-red-400 text-sm">✕</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LEVELS.map(lv => (
                      <button
                        key={lv.value}
                        onClick={() => updateLevel(skill.language, lv.value)}
                        className={`p-2 rounded-lg text-center border transition-all ${
                          skill.level === lv.value
                            ? 'bg-[#3D7A6E] text-white border-[#3D7A6E]'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#3D7A6E]'
                        }`}
                      >
                        <div className="text-xs font-bold">{lv.label}</div>
                        <div className="text-[10px] mt-0.5 opacity-70">{lv.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 保存ボタン */}
        {message && (
          <p className="text-center text-sm text-green-600 font-semibold">{message}</p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-[#3D7A6E] text-white rounded-2xl font-bold hover:bg-[#5AA898] transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : 'プロフィールを保存する'}
        </button>
      </main>
    </div>
  )
}
