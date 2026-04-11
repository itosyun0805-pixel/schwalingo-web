import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

const SKILL_USECASES: Record<string, { scene: string; icon: string; tag: string }[]> = {
  英語: [
    { scene: 'インバウンド観光客への案内・通訳', icon: '🗺️', tag: 'ガイド' },
    { scene: 'オンライン英会話講師', icon: '💻', tag: '講師' },
    { scene: '多言語コンテンツ制作', icon: '✍️', tag: 'ライター' },
    { scene: 'インバウンド対応スタッフ', icon: '🏨', tag: '接客' },
  ],
  中国語: [
    { scene: '中国人観光客向けガイド', icon: '🧭', tag: 'ガイド' },
    { scene: '貿易・ECサイトのサポート', icon: '📦', tag: 'ビジネス' },
    { scene: '中国語コンテンツ翻訳', icon: '📝', tag: 'ライター' },
  ],
  韓国語: [
    { scene: 'K-POP・韓国文化イベントのサポート', icon: '🎤', tag: 'イベント' },
    { scene: '韓国語レッスン講師', icon: '📚', tag: '講師' },
    { scene: 'SNS多言語発信', icon: '📱', tag: 'SNS' },
  ],
  スペイン語: [
    { scene: '中南米向けビジネス通訳', icon: '💼', tag: 'ビジネス' },
    { scene: 'スペイン語コンテンツ制作', icon: '✍️', tag: 'ライター' },
    { scene: '語学スクールの講師補助', icon: '🏫', tag: '講師' },
  ],
  フランス語: [
    { scene: 'フランス語圏観光客のガイド', icon: '🗼', tag: 'ガイド' },
    { scene: 'フランス語レッスン', icon: '📖', tag: '講師' },
    { scene: 'ファッション・アート分野の通訳', icon: '🎨', tag: '通訳' },
  ],
  ドイツ語: [
    { scene: 'ドイツ語圏ビジネス通訳', icon: '🏭', tag: 'ビジネス' },
    { scene: 'ドイツ語レッスン', icon: '📖', tag: '講師' },
  ],
  ポルトガル語: [
    { scene: 'ブラジル向けビジネスサポート', icon: '🌎', tag: 'ビジネス' },
    { scene: 'ポルトガル語コンテンツ制作', icon: '✍️', tag: 'ライター' },
  ],
  イタリア語: [
    { scene: 'イタリア観光客ガイド', icon: '🇮🇹', tag: 'ガイド' },
    { scene: 'イタリア語レッスン', icon: '📖', tag: '講師' },
  ],
  タイ語: [
    { scene: 'タイ人観光客向けガイド', icon: '🧭', tag: 'ガイド' },
    { scene: 'タイ語翻訳・通訳', icon: '📝', tag: '通訳' },
  ],
  ベトナム語: [
    { scene: 'ベトナム人労働者向けサポート', icon: '🤝', tag: '支援' },
    { scene: 'ベトナム語コンテンツ制作', icon: '✍️', tag: 'ライター' },
  ],
  インドネシア語: [
    { scene: 'インドネシア向けビジネスサポート', icon: '💼', tag: 'ビジネス' },
    { scene: 'インドネシア語レッスン', icon: '📖', tag: '講師' },
  ],
  アラビア語: [
    { scene: 'アラビア語圏観光客ガイド', icon: '🕌', tag: 'ガイド' },
    { scene: 'アラビア語翻訳', icon: '📝', tag: '通訳' },
  ],
  日本語教育: [
    { scene: '外国人向け日本語講師', icon: '🎌', tag: '講師' },
    { scene: '日本語学習アプリのコンテンツ制作', icon: '📱', tag: 'コンテンツ' },
    { scene: '外国人労働者への日本語サポート', icon: '🤝', tag: '支援' },
  ],
}

const LEVEL_LABEL: Record<string, string> = {
  beginner: '初級',
  intermediate: '中級',
  advanced: '上級',
  native: 'ネイティブ',
}

const LEVEL_COLOR: Record<string, string> = {
  beginner: 'bg-gray-100 text-gray-500',
  intermediate: 'bg-blue-50 text-blue-600',
  advanced: 'bg-green-50 text-green-600',
  native: 'bg-[#3D7A6E]/10 text-[#3D7A6E]',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: userSkills } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', user.id)

  const hasProfile = profile?.name
  const skills = userSkills || []

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-black text-[#3D7A6E]">SchwaLingo</h1>
        <div className="flex items-center gap-4">
          <Link href="/profile" className="text-sm text-[#3D7A6E] font-semibold hover:underline">
            プロフィール編集
          </Link>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* プロフィール未設定バナー */}
        {!hasProfile && (
          <Link href="/profile" className="block bg-[#E8845A]/10 border border-[#E8845A]/30 rounded-2xl p-5 hover:bg-[#E8845A]/15 transition-colors">
            <div className="flex items-center gap-4">
              <span className="text-3xl">👋</span>
              <div>
                <p className="font-bold text-[#E8845A]">プロフィールを設定しましょう</p>
                <p className="text-sm text-gray-500 mt-0.5">語学スキルを登録すると、あなたに合った活かし方が表示されます →</p>
              </div>
            </div>
          </Link>
        )}

        {/* ウェルカム */}
        <div>
          <h2 className="text-2xl font-black text-gray-800 mb-1">
            {hasProfile ? `${profile.name}さんのスキルで、できること` : 'あなたのスキルで、できること'}
          </h2>
          <p className="text-gray-400 text-sm">
            {skills.length > 0
              ? `${skills.length}つの語学スキルが登録されています`
              : '語学スキルを登録すると、活かし方が具体的にわかります'}
          </p>
        </div>

        {/* スキル別ユースケース */}
        {skills.length > 0 ? (
          <div className="space-y-4">
            {skills.map((skill: any) => {
              const usecases = SKILL_USECASES[skill.language] || []
              return (
                <div key={skill.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 flex items-center justify-between border-b border-gray-50">
                    <h3 className="font-black text-gray-800 text-lg">{skill.language}</h3>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${LEVEL_COLOR[skill.level]}`}>
                      {LEVEL_LABEL[skill.level]}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {usecases.map((u, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-[#FAFAF8] rounded-xl">
                        <span className="text-2xl">{u.icon}</span>
                        <div>
                          <span className="text-[10px] font-bold text-[#3D7A6E] bg-[#3D7A6E]/10 px-2 py-0.5 rounded-full">
                            {u.tag}
                          </span>
                          <p className="text-sm text-gray-700 font-medium mt-1 leading-snug">{u.scene}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* スキル未登録時はデモ表示 */
          <div className="space-y-4 opacity-50 pointer-events-none">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="h-4 bg-gray-100 rounded w-24 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl" />)}
              </div>
            </div>
          </div>
        )}

        {/* フラッシュカードへのリンク（準備中） */}
        <div className="bg-gradient-to-r from-[#3D7A6E] to-[#5AA898] rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-lg">フラッシュカードで学ぶ</p>
              <p className="text-sm opacity-80 mt-1">単語・フレーズを自分だけのカードで覚える</p>
            </div>
            <Link
              href="/flashcards"
              className="bg-white text-[#3D7A6E] font-bold px-5 py-2 rounded-full text-sm hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              開く →
            </Link>
          </div>
        </div>

      </main>
    </div>
  )
}
