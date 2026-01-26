"use client"

import React, { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, Variants } from "framer-motion"
import { ArrowRight, Timer, BookOpen, BarChart3, ChevronDown, Moon, Shield, Coffee, Leaf, Wind, Github } from "lucide-react"

// --- Animation Variants ---
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: "easeOut" }
    }
}

const stagger: Variants = {
    visible: { transition: { staggerChildren: 0.15 } }
}

const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, ease: "easeOut" }
    }
}

export default function MobileLandingPage() {
    const router = useRouter()
    const [isFixed, setIsFixed] = useState(false)
    const [buttonY, setButtonY] = useState(0)
    const buttonRef = useRef<HTMLButtonElement>(null)

    // 检查是否已经看过落地页
    useEffect(() => {
        const hasSeenLanding = localStorage.getItem('has_seen_landing')
        if (hasSeenLanding === 'true') {
            // 已经看过，直接跳转到练习页
            router.replace('/practice')
        }
    }, [router])

    // 监听按钮是否进入视口
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isFixed && buttonRef.current) {
                        // 记录当前位置
                        const rect = buttonRef.current.getBoundingClientRect()
                        setButtonY(rect.top + window.scrollY)

                        // 等待动画完成后平滑移动到底部
                        setTimeout(() => {
                            setIsFixed(true)
                        }, 800)
                    }
                })
            },
            { threshold: 0.5 }
        )

        if (buttonRef.current) {
            observer.observe(buttonRef.current)
        }

        return () => observer.disconnect()
    }, [isFixed])

    return (
        <div className={`min-h-screen bg-[#F9F7F2] text-[#2A4B3C] font-serif selection:bg-[#2A4B3C] selection:text-[#F9F7F2] overflow-x-hidden ${isFixed ? 'pb-32' : 'pb-12'}`}>

            {/* 1. Navbar - Delicate Design */}
            <nav className="fixed top-0 w-full px-5 py-3 z-50 flex justify-between items-center bg-[#F9F7F2]/90 backdrop-blur-md border-b border-[#2A4B3C]/5 supports-[backdrop-filter]:bg-[#F9F7F2]/60">

                {/* Left: Branding */}
                <div className="flex flex-row items-center gap-2">
                    {/* Logo Icon */}
                    <img
                        src="/icon.png"
                        alt="熬汤日记"
                        className="w-[28px] h-[28px] rounded-lg shadow-sm object-cover"
                    />

                    {/* Right Text */}
                    <div className="flex flex-col">
                        {/* Main Title + Subtitle */}
                        <h1 className="text-sm font-serif text-[#2A4B3C] tracking-wide font-medium leading-none">
                            熬汤日记
                            <span className="text-[#2A4B3C]/50 font-normal ml-1">·呼吸</span>
                            <span className="text-[#2A4B3C]/70 font-normal">·觉察</span>
                        </h1>

                        {/* Slogan */}
                        <p className="text-[8px] text-[#2A4B3C]/50 font-serif tracking-wide leading-tight mt-0.5 uppercase scale-90 origin-left">
                            Practice, practice, and all is coming.
                        </p>
                    </div>
                </div>

                {/* Top Right: Start Practice Button with Glassmorphism */}
                <button
                    onClick={() => {
                        // 保存已访问标记
                        localStorage.setItem('has_seen_landing', 'true')
                        // 跳转到练习页
                        router.push('/practice')
                    }}
                    className="flex items-center gap-2 px-3 py-1 bg-gradient-to-br from-[#2A4B3C] to-[#1a2f26] text-[#C1A268] rounded-full shadow-lg hover:shadow-[#C1A268]/20 border border-[#C1A268]/20 active:scale-95 transition-all duration-300 relative overflow-hidden group backdrop-blur-md"
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <span className="text-[10px] font-serif tracking-widest relative z-10">开始练习</span>
                    <ArrowRight className="w-3 h-3 relative z-10 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </nav>

            {/* 2. Hero Section */}
            <section className="min-h-[85dvh] relative flex flex-col items-center justify-center pt-24 pb-12 px-6 overflow-hidden bg-[#F9F7F2]">

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    className="w-full flex flex-col items-center text-center z-10 space-y-10"
                >
                    {/* Main Title Block */}
                    <div className="space-y-6">
                        <motion.div variants={fadeInUp} className="flex items-center justify-center gap-2 opacity-60">
                            <Leaf className="w-3 h-3 text-[#C1A268]" />
                            <span className="text-[#2A4B3C] font-sans text-[10px] tracking-[0.2em] uppercase">Est. 2026</span>
                            <Leaf className="w-3 h-3 text-[#C1A268] scale-x-[-1]" />
                        </motion.div>

                        <motion.h1
                            variants={fadeInUp}
                            className="text-6xl font-serif text-[#2A4B3C] leading-[1.1] tracking-tight relative"
                        >
                            <span className="relative z-10 block">呼吸</span>
                            <span className="relative z-10 block text-[#C1A268] font-playfair">&</span>
                            <span className="relative z-10 block">觉察</span>

                            {/* Subtle Background Character */}
                            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[14rem] opacity-[0.03] text-[#2A4B3C] font-playfair z-0 pointer-events-none">
                                ॐ
                            </span>
                        </motion.h1>

                        <motion.p
                            variants={fadeInUp}
                            className="text-[#2A4B3C] font-medium text-lg leading-relaxed max-w-xs font-serif opacity-80"
                        >
                            "致敬重复的力量<br />
                            在节制中获得自由"
                        </motion.p>
                    </div>

                    {/* Decorative Pills */}
                    <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-3 mt-4">
                        <span className="px-5 py-2 rounded-full bg-[#2A4B3C]/5 border border-[#2A4B3C]/10 text-[#2A4B3C] text-[10px] tracking-widest uppercase backdrop-blur-sm">Mysore</span>
                        <span className="px-5 py-2 rounded-full bg-[#2A4B3C]/5 border border-[#2A4B3C]/10 text-[#2A4B3C] text-[10px] tracking-widest uppercase backdrop-blur-sm">Journal</span>
                    </motion.div>

                </motion.div>

                {/* Scroll Hint */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[#2A4B3C]/30 flex flex-col items-center gap-1"
                >
                    <span className="text-[10px] tracking-widest uppercase font-sans">Scroll</span>
                    <ChevronDown className="w-4 h-4 animate-bounce" />
                </motion.div>
            </section>


            {/* 3. Features - Green Landscape with Enhanced Texture & Animation */}
            <section className="px-5 py-12 bg-[#2A4B3C] relative rounded-[2.5rem] shadow-2xl z-20 mx-2 mb-4 overflow-hidden">
                {/* Enhanced Texture - More noticeable */}
                <div className="absolute inset-0 opacity-25 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none rounded-[2.5rem] mix-blend-overlay"></div>

                {/* Colorful Ambient Glow */}
                <div className="absolute top-0 left-1/4 w-48 h-48 bg-[#C1A268]/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#1a382b]/50 rounded-full blur-3xl"></div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={stagger}
                    className="relative z-10 space-y-6"
                >
                    <motion.div variants={fadeInUp} className="text-center">
                        <h2 className="text-2xl font-serif text-[#F9F7F2] drop-shadow-md">练汤人的专属APP</h2>
                        <div className="w-10 h-[1px] bg-[#C1A268] mx-auto mt-3 opacity-60"></div>
                    </motion.div>

                    <div className="grid grid-cols-1 gap-4">
                        <motion.div variants={fadeInUp}>
                            <HorizontalCard
                                icon={Timer}
                                title="练习计时"
                                desc="开始练习放下手机，专注呼吸的流动。"
                            />
                        </motion.div>
                        <motion.div variants={fadeInUp}>
                            <HorizontalCard
                                icon={BookOpen}
                                title="觉察日记"
                                desc="记录每一次练习，不仅仅是打卡，更是对身体的内观。"
                            />
                        </motion.div>
                        <motion.div variants={fadeInUp}>
                            <HorizontalCard
                                icon={BarChart3}
                                title="练习日历"
                                desc="见证你每一次的练习，记录你的坚持与汗水。"
                            />
                        </motion.div>
                    </div>
                </motion.div>
            </section>


            {/* 4. Brand Story - Animated & Centered */}
            <section className="px-6 py-16 bg-[#F9F7F2] relative overflow-hidden">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={stagger}
                    className="max-w-md mx-auto relative z-10 space-y-8 text-center"
                >
                    {/* Rotating Moon Icon */}
                    <motion.div
                        variants={{
                            hidden: { scale: 0.8, opacity: 0 },
                            visible: { scale: 1, opacity: 1, rotate: 360, transition: { duration: 1.5, ease: "easeOut" } }
                        }}
                        className="w-14 h-14 mx-auto rounded-full bg-[#2A4B3C] text-[#F9F7F2] flex items-center justify-center shadow-lg shadow-[#2A4B3C]/10 border-4 border-[#F9F7F2] z-10 relative"
                    >
                        <Moon className="w-6 h-6" />
                    </motion.div>

                    <div className="space-y-6">
                        <motion.h3 variants={fadeInUp} className="text-xl font-serif text-[#2A4B3C] font-bold tracking-wide">初 心</motion.h3>
                        <div className="space-y-4">
                            <motion.p variants={fadeInUp} className="font-serif text-base leading-relaxed text-[#2A4B3C]/80">
                                "作为一名4年的阿斯汤加习练者，我一直在寻找一个适合记录App，一个安静的角落。不需要繁杂的社交，不需要课程，只有记录我的练习和我的呼吸。"
                            </motion.p>
                            <motion.div variants={fadeInUp} className="w-8 h-[1px] bg-[#2A4B3C]/20 mx-auto"></motion.div>
                            <motion.p variants={fadeInUp} className="font-serif text-base leading-relaxed text-[#2A4B3C]/80">
                                "熬汤日记因此而生。它的诞生不是一个商业产品，而是一份给Ashtanga的礼物。"
                            </motion.p>
                        </div>
                    </div>
                </motion.div>

                {/* Floating Wind Icon */}
                <motion.div
                    animate={{ rotate: [0, 10, 0], y: [0, -10, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-10 right-6 z-0"
                >
                    <Wind className="w-24 h-24 text-[#2A4B3C]/5" />
                </motion.div>
            </section>


            {/* 4.5 Guruji Tribute */}
            <section className="px-6 pb-12 bg-[#F9F7F2] flex justify-center">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                    className="flex flex-col items-center gap-4 text-center"
                >
                    {/* Golden Frame Image */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.5 }}
                        className="relative p-2 border-2 border-[#C1A268]/40 rounded-lg bg-[#F9F7F2] shadow-md"
                    >
                        <div className="w-32 h-auto overflow-hidden rounded border border-[#2A4B3C]/10">
                            <img
                                src="/Sri K. Pattabhi Jois.png"
                                alt="Sri K. Pattabhi Jois"
                                className="w-full h-auto object-contain"
                            />
                        </div>
                    </motion.div>

                    {/* Text Layout */}
                    <div className="space-y-2 mt-2">
                        <div className="flex flex-col gap-0.5">
                            <p className="font-playfair italic text-[#C1A268] text-sm tracking-wider">Rest In Peace</p>
                            <h4 className="font-serif text-[#2A4B3C] text-lg font-bold tracking-wide">Sri K. Pattabhi Jois (Guruji)</h4>
                        </div>
                        <div className="w-8 h-[1px] bg-[#2A4B3C]/20 mx-auto"></div>
                        <p className="text-[#2A4B3C]/50 text-[10px] uppercase tracking-[0.2em] font-sans">1915 – 2009</p>
                    </div>
                </motion.div>
            </section>

            {/* 5. Promise - Compact & Balanced & Animated */}
            <section className="px-6 pb-16 bg-[#F9F7F2]">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={stagger}
                    className="bg-white border border-[#E8EDE7] rounded-3xl p-6 shadow-sm space-y-6"
                >
                    <motion.div variants={fadeInUp} className="text-center">
                        <h2 className="text-xl font-serif text-[#2A4B3C]">3大特点</h2>
                        <div className="w-8 h-[1px] bg-[#C1A268] mx-auto mt-2 opacity-40"></div>
                    </motion.div>

                    <div className="space-y-4">
                        <motion.div variants={fadeInUp}>
                            <CompactInfoRow
                                icon={Shield}
                                title="数据私有"
                                desc="采用本地存储，你的数据只属于你。"
                            />
                        </motion.div>
                        <motion.div variants={fadeInUp} className="h-[1px] bg-[#2A4B3C]/5 w-full"></motion.div>
                        <motion.div variants={fadeInUp}>
                            <CompactInfoRow
                                icon={Coffee}
                                title="免费使用"
                                desc="无任何广告，无功能上的限制。"
                            />
                        </motion.div>
                        <motion.div variants={fadeInUp} className="h-[1px] bg-[#2A4B3C]/5 w-full"></motion.div>
                        <motion.div variants={fadeInUp}>
                            <CompactInfoRow
                                icon={Github}
                                title="无需注册"
                                desc="点开即用，像铺开垫子一样简单。"
                            />
                        </motion.div>
                    </div>
                </motion.div>

                {/* 开始练习按钮 - 单个按钮+动态定位 */}
                <div className="flex justify-center pb-8">
                    <motion.button
                        ref={buttonRef}
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        whileInView={{ opacity: 1, y: 0, scale: 1 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        animate={isFixed ? {
                            position: 'fixed',
                            bottom: '2rem',
                            left: '0',
                            right: '0',
                            marginLeft: 'auto',
                            marginRight: 'auto',
                            width: 'fit-content',
                            zIndex: 50
                        } : {}}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            localStorage.setItem('has_seen_landing', 'true')
                            router.push('/practice')
                        }}
                        style={{
                            boxShadow: isFixed
                                ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(193, 162, 104, 0.6), 0 0 20px rgba(193, 162, 104, 0.4)'
                                : '0 20px 40px -12px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(193, 162, 104, 0.5), 0 0 15px rgba(193, 162, 104, 0.3)',
                            transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        className="flex items-center gap-3 px-12 py-4 bg-gradient-to-br from-[#2A4B3C] to-[#1a2f26] text-[#C1A268] rounded-full border border-[#C1A268]/20 relative overflow-hidden group backdrop-blur-md"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <span className="text-xl font-serif tracking-widest relative z-10">开始练习</span>
                    </motion.button>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="text-center mt-12 space-y-2"
                >
                    <p className="text-[#2A4B3C]/40 text-[10px] font-sans tracking-widest uppercase">© 2026 Ashtanga Life</p>
                </motion.div>
            </section>

        </div>
    )
}

// --- Components ---

function HorizontalCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="flex items-center gap-4 p-4 rounded-xl shadow-lg border border-white/20 relative overflow-hidden group transition-all duration-300"
            style={{
                background: "linear-gradient(135deg, rgba(249, 247, 242, 0.95), rgba(232, 237, 231, 0.9))",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255,255,255,0.4)"
            }}
        >
            {/* Colorful Glow Blobs for Glassmorphism */}
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#C1A268]/25 rounded-full blur-2xl group-hover:bg-[#C1A268]/40 transition-all duration-500"></div>
            <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-[#2A4B3C]/15 rounded-full blur-2xl group-hover:bg-[#2A4B3C]/25 transition-all duration-500"></div>

            <div className="rounded-full bg-gradient-to-br from-[#2A4B3C]/15 to-[#2A4B3C]/5 w-12 h-12 flex items-center justify-center flex-shrink-0 border border-[#2A4B3C]/10 group-hover:bg-[#2A4B3C]/25 group-hover:scale-110 transition-all duration-500 z-10 shadow-inner">
                <Icon className="w-5 h-5 text-[#2A4B3C] group-hover:text-[#1a2f26] transition-colors duration-500" />
            </div>
            <div className="flex-1 text-left relative z-10">
                <h3 className="font-serif text-[#2A4B3C] font-bold text-base mb-1 group-hover:text-[#1a2f26] transition-colors">{title}</h3>
                <p className="text-[#2A4B3C]/80 text-xs leading-relaxed group-hover:text-[#2A4B3C] transition-colors">{desc}</p>
            </div>

            {/* Glass Sheen Animation */}
            <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/70 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-700 ease-in-out"></div>

            {/* Bright Border on Hover */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/50 rounded-xl transition-all duration-300 pointer-events-none"></div>
        </motion.div>
    )
}

function CompactInfoRow({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <motion.div
            whileHover={{ x: 4 }}
            className="flex gap-4 items-center px-2 group cursor-default"
        >
            <div className="w-10 h-10 rounded-full bg-[#2A4B3C]/5 flex items-center justify-center group-hover:bg-[#2A4B3C]/10 transition-colors">
                <Icon className="w-5 h-5 text-[#2A4B3C] opacity-60 shrink-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex-1">
                <div className="flex items-baseline justify-between">
                    <h4 className="text-sm font-serif text-[#2A4B3C] font-semibold">{title}</h4>
                </div>
                <p className="text-[#2A4B3C]/70 text-xs leading-relaxed mt-0.5">{desc}</p>
            </div>
        </motion.div>
    )
}
