import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#1E3A2A] flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 rounded-full bg-[#16A34A]/20 blur-3xl" />
      <div className="absolute bottom-[-100px] left-[-100px] w-96 h-96 rounded-full bg-[#16A34A]/10 blur-3xl" />

      <div className="max-w-2xl relative z-10">
        <div className="inline-flex items-center gap-2 bg-white/10 text-white/70 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-white/20">
          🌍 多言語 × 学び合い × 社会参画
        </div>

        <h1 className="text-4xl sm:text-6xl font-black leading-tight tracking-tight mb-6 text-white">
          語学スキルを、<br />
          <span className="text-green-300">社会とつながる</span><br />
          <span className="text-yellow-300">力に変える。</span>
        </h1>

        <p className="text-white/60 text-lg mb-10 leading-relaxed">
          スキルがあるのに使えていない。<br />
          SchwaLingoはあなたの語学力が活きる場所を見つけます。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signup"
            className="bg-[#16A34A] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#166534] transition-colors shadow-xl shadow-black/20"
          >
            無料で始める →
          </Link>
          <Link
            href="/auth/login"
            className="border-2 border-white/20 text-white/80 font-semibold px-8 py-4 rounded-xl hover:border-white/50 hover:text-white hover:bg-white/5 transition-colors"
          >
            ログイン
          </Link>
        </div>
      </div>
    </div>
  )
}
