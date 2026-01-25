"use client"

import React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Timer, BookOpen, BarChart3, Wind, Leaf, Moon } from "lucide-react"

export default function LandingPage() {
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    }

    const stagger = {
        visible: { transition: { staggerChildren: 0.2 } }
    }

    return (
        <div className="min-h-screen bg-[#F9F5F0] text-[#2D5A27] font-serif selection:bg-[#2D5A27] selection:text-[#F9F5F0]">
            {/* Navigation */}
            <nav className="fixed top-0 w-full p-6 z-50 flex justify-between items-center bg-[#F9F5F0]/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <Leaf className="w-6 h-6" />
                    <span className="text-xl font-medium tracking-wide">Ashtanga Life</span>
                </div>
                <Link href="/practice">
                    <button className="px-6 py-2 rounded-full border border-[#2D5A27] text-[#2D5A27] hover:bg-[#2D5A27] hover:text-white transition-all duration-300 text-sm tracking-wide">
                        进入练习
                    </button>
                </Link>
            </nav>

            {/* Hero Section */}
            <section className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden px-6 pt-20">
                <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2D5A27] rounded-full blur-[128px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#D4AF37] rounded-full blur-[128px]" />
                </div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={stagger}
                    className="z-10 text-center max-w-4xl mx-auto"
                >
                    <motion.div variants={fadeInUp} className="mb-6 flex justify-center">
                        <span className="px-4 py-1.5 rounded-full bg-[#2D5A27]/5 text-[#2D5A27] text-xs tracking-[0.2em] uppercase">
                            Mindfulness & Practice
                        </span>
                    </motion.div>

                    <motion.h1 variants={fadeInUp} className="text-5xl md:text-7xl lg:text-8xl font-light mb-8 leading-tight tracking-tight">
                        练习，<br />
                        <span className="italic font-serif text-[#D4AF37]">一切随之而来。</span>
                    </motion.h1>

                    <motion.p variants={fadeInUp} className="text-lg md:text-xl text-[#2D5A27]/70 mb-12 max-w-2xl mx-auto font-sans leading-relaxed">
                        一个极简的阿斯汤加瑜伽练习伴侣。
                        <br />
                        专注于计时、觉察与自我对话。
                    </motion.p>

                    <motion.div variants={fadeInUp}>
                        <Link href="/practice">
                            <button className="group relative px-8 py-4 bg-[#2D5A27] text-white rounded-full text-lg tracking-wide hover:shadow-2xl hover:shadow-[#2D5A27]/30 transition-all duration-300 overflow-hidden">
                                <span className="relative z-10 flex items-center gap-2">
                                    开始练习 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </span>
                                <div className="absolute inset-0 bg-[#3a7233] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
                            </button>
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Scroll Indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5, duration: 1 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-[#2D5A27]/40"
                >
                    <span className="text-[10px] tracking-widest uppercase">Explore</span>
                    <div className="w-[1px] h-12 bg-gradient-to-b from-[#2D5A27]/40 to-transparent" />
                </motion.div>
            </section>

            {/* Philosophy Section */}
            <section className="py-32 px-6 bg-white relative">
                <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
                    <div className="relative">
                        <div className="aspect-[4/5] bg-gray-100 rounded-[32px] overflow-hidden relative shadow-2xl">
                            {/* Placeholder for visual - using a gradient for now */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#F0F4EF] to-[#E1E8DE]" />
                            <div className="absolute inset-0 flex items-center justify-center text-[#2D5A27]/10">
                                <Wind className="w-32 h-32" />
                            </div>
                        </div>
                        {/* Quote Card */}
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="absolute -bottom-10 -right-10 bg-[#F9F5F0] p-8 rounded-[24px] shadow-xl max-w-xs border border-[#2D5A27]/10 hidden md:block"
                        >
                            <p className="text-[#2D5A27] font-serif italic mb-4">"Do your practice and all is coming."</p>
                            <p className="text-sm text-[#2D5A27]/60">— Sri K. Pattabhi Jois</p>
                        </motion.div>
                    </div>

                    <div className="space-y-8">
                        <h2 className="text-4xl md:text-5xl font-light leading-tight">
                            不仅仅是计时，<br />
                            更是<span className="text-[#D4AF37]">身心的觉察</span>。
                        </h2>
                        <p className="text-lg text-[#2D5A27]/70 leading-relaxed font-sans">
                            阿斯汤加不仅仅是体式的重复，更是呼吸的流动与内心的观照。我们去除了所有多余的功能，只保留最纯粹的记录体验，让你专注于当下的练习。
                        </p>

                        <div className="space-y-6 pt-4">
                            <FeatureItem icon={Timer} title="Mysore 计时" desc="专为自我练习设计的计时器，支持一序列、二序列及口令课。" />
                            <FeatureItem icon={BookOpen} title="觉察日记" desc="记录练习后的身体感受与内心变化，看见自己的成长。" />
                            <FeatureItem icon={BarChart3} title="热力图统计" desc="像 GitHub 一样记录你的每一次汗水，可视化你的坚持。" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Minimalism Section */}
            <section className="py-32 px-6">
                <div className="max-w-4xl mx-auto text-center space-y-6">
                    <Moon className="w-12 h-12 text-[#2D5A27] mx-auto mb-6" />
                    <h2 className="text-3xl md:text-4xl font-light">极简主义设计</h2>
                    <p className="text-[#2D5A27]/70 max-w-xl mx-auto leading-relaxed">
                        没有广告，没有社区干扰，没有复杂的课程推销。
                        <br />
                        只有一个安静的空间，留给你和你的瑜伽垫。
                    </p>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6 bg-[#2D5A27] text-[#F9F5F0] text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white/20 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/20 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/20 rounded-full" />
                </div>

                <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                    <h2 className="text-4xl md:text-6xl font-light">准备好开始了吗？</h2>
                    <p className="text-white/70 text-lg font-sans max-w-xl mx-auto">
                        每一次站上垫子，都是一次新的旅程。
                    </p>
                    <div className="pt-8">
                        <Link href="/practice">
                            <button className="bg-[#F9F5F0] text-[#2D5A27] px-10 py-5 rounded-full text-xl font-medium hover:bg-white hover:scale-105 transition-all duration-300 shadow-2xl shadow-black/20">
                                开始今日练习
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-[#2D5A27]/10 text-center text-[#2D5A27]/40 text-sm font-sans">
                <p>© 2026 Ashtanga Life. All rights reserved.</p>
                <p className="mt-2">Designed with Mindfulness.</p>
            </footer>
        </div>
    )
}

function FeatureItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex gap-4 items-start group hover:bg-white/50 p-4 rounded-2xl transition-all duration-300">
            <div className="p-3 bg-[#2D5A27]/5 rounded-xl group-hover:bg-[#2D5A27]/10 transition-colors">
                <Icon className="w-6 h-6 text-[#2D5A27]" />
            </div>
            <div>
                <h3 className="text-lg font-medium mb-1">{title}</h3>
                <p className="text-sm text-[#2D5A27]/60 leading-relaxed font-sans">{desc}</p>
            </div>
        </div>
    )
}
