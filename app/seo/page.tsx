import Link from "next/link"

export default function SeoLandingPage() {
  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#2A4B3C] font-serif">
      {/* Header */}
      <header className="px-5 py-6 border-b border-[#2A4B3C]/5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src="/icon.png" alt="" className="w-8 h-8 rounded-lg" />
          <div>
            <h1 className="text-lg font-medium tracking-wide">熬汤日记</h1>
            <p className="text-[10px] text-[#2A4B3C]/50 tracking-widest uppercase">
              Ashtanga Yoga Journal
            </p>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-2xl mx-auto px-5 py-16 text-center">
        <h2 className="text-3xl font-serif leading-tight tracking-tight">
          熬汤日记：你的阿斯汤加瑜伽练习记录与打卡工具
        </h2>
        <p className="mt-6 text-base leading-relaxed text-[#2A4B3C]/80">
          熬汤日记是一款专为阿斯汤加瑜伽习练者打造的在线记录工具。无论你是 Mysore 早课习练者，
          还是在家自主练习的 Ashtanga 爱好者，都可以用它记录每一次呼吸与觉察。
        </p>
      </section>

      {/* Features */}
      <section className="max-w-2xl mx-auto px-5 pb-16">
        <h3 className="text-xl text-center mb-8 font-serif">
          为什么选择熬汤日记
        </h3>
        <ul className="space-y-4">
          <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#2A4B3C]/5 shadow-sm">
            <span className="text-[#C1A268] mt-0.5 shrink-0">✦</span>
            <div>
              <strong className="block text-sm font-semibold">免费使用，无需下载</strong>
              <span className="text-sm text-[#2A4B3C]/70">打开浏览器即可记录，支持手机和电脑，无需安装任何 App。</span>
            </div>
          </li>
          <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#2A4B3C]/5 shadow-sm">
            <span className="text-[#C1A268] mt-0.5 shrink-0">✦</span>
            <div>
              <strong className="block text-sm font-semibold">每日打卡，培养习惯</strong>
              <span className="text-sm text-[#2A4B3C]/70">每次练习完成后一键打卡，记录练习时长与感受，见证自己的坚持。</span>
            </div>
          </li>
          <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#2A4B3C]/5 shadow-sm">
            <span className="text-[#C1A268] mt-0.5 shrink-0">✦</span>
            <div>
              <strong className="block text-sm font-semibold">Mysore 风格计时</strong>
              <span className="text-sm text-[#2A4B3C]/70">内置练习计时器，支持 Mysore 自主练习模式，让你专注呼吸，放下手机。</span>
            </div>
          </li>
          <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#2A4B3C]/5 shadow-sm">
            <span className="text-[#C1A268] mt-0.5 shrink-0">✦</span>
            <div>
              <strong className="block text-sm font-semibold">练习统计与日历</strong>
              <span className="text-sm text-[#2A4B3C]/70">通过日历视图和统计图表，清晰看到每周每月的练习频率和进步轨迹。</span>
            </div>
          </li>
          <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#2A4B3C]/5 shadow-sm">
            <span className="text-[#C1A268] mt-0.5 shrink-0">✦</span>
            <div>
              <strong className="block text-sm font-semibold">数据安全同步</strong>
              <span className="text-sm text-[#2A4B3C]/70">练习数据自动同步到云端，换设备也不丢失。支持离线使用。</span>
            </div>
          </li>
          <li className="flex items-start gap-3 p-4 bg-white rounded-xl border border-[#2A4B3C]/5 shadow-sm">
            <span className="text-[#C1A268] mt-0.5 shrink-0">✦</span>
            <div>
              <strong className="block text-sm font-semibold">觉察日记</strong>
              <span className="text-sm text-[#2A4B3C]/70">每次练习后记录身体感受与内心觉察，从记录中看见自己的成长。</span>
            </div>
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-5 pb-20 text-center">
        <h3 className="text-xl font-serif mb-4">
          开始记录你的阿斯汤加之旅
        </h3>
        <p className="text-sm text-[#2A4B3C]/70 mb-8 max-w-md mx-auto">
          无需注册，打开即用。就像铺开瑜伽垫一样简单。
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-4 bg-gradient-to-br from-[#2A4B3C] to-[#1a2f26] text-[#C1A268] rounded-full shadow-lg border border-[#C1A268]/30 text-base font-serif tracking-wider hover:shadow-xl transition-all duration-300"
        >
          免费开始练习
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2A4B3C]/5 py-6 text-center">
        <p className="text-[10px] text-[#2A4B3C]/40 tracking-widest uppercase">
          © 2026 Ashtanga Life
        </p>
      </footer>
    </div>
  )
}
