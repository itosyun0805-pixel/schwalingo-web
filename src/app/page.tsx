import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EDF5F3] to-[#FAFAF8] flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        <div className="inline-block bg-[#3D7A6E]/10 text-[#3D7A6E] text-xs font-bold px-4 py-1.5 rounded-full mb-8 border border-[#3D7A6E]/20">
          🌍 多言語 × 学び合い × 社会参画
        </div>

        <h1 className="text-4xl sm:text-6xl font-black leading-tight tracking-tight mb-6 text-gray-900">
          語学スキルを、<br />
          <span className="text-[#3D7A6E]">社会とつながる</span><br />
          <span className="text-[#E8845A]">力に変える。</span>
        </h1>

        <p className="text-gray-500 text-lg mb-10 leading-relaxed">
          スキルがあるのに使えていない。<br />
          SchwaLingoはあなたの語学力が活きる場所を見つけます。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/signup"
            className="bg-[#3D7A6E] text-white font-bold px-8 py-4 rounded-full hover:bg-[#5AA898] transition-colors shadow-lg shadow-[#3D7A6E]/25"
          >
            無料で始める →
          </Link>
          <Link
            href="/auth/login"
            className="border-2 border-gray-200 text-gray-700 font-semibold px-8 py-4 rounded-full hover:border-[#3D7A6E] hover:text-[#3D7A6E] transition-colors"
          >
            ログイン
          </Link>
        </div>
      </div>
    </div>
  )
}
