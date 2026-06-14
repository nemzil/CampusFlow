'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Home() {
  // Emil Kowalski inspired snappy easing
  const customEase = [0.23, 1, 0.32, 1];

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
  };

  // Modern entry: scale from 0.95 with opacity 0
  const fadeScaleUp = {
    hidden: { opacity: 0, scale: 0.95, y: 16 },
    show: { 
      opacity: 1, 
      scale: 1, 
      y: 0, 
      transition: { duration: 0.6, ease: customEase } 
    }
  };

  const featureCardsStagger = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="overflow-x-hidden min-h-screen flex flex-col relative bg-[var(--background)]">

      {/* ── Background Geometric Grid ── */}
      <div className="absolute top-0 left-0 w-full h-[600px] z-0 overflow-hidden pointer-events-none opacity-40" style={{
        backgroundImage: `linear-gradient(var(--surface-container-highest) 1px, transparent 1px), linear-gradient(90deg, var(--surface-container-highest) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        maskImage: 'linear-gradient(to bottom, white 0%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, white 0%, transparent 100%)'
      }}></div>

      {/* TopNavBar */}
      <header className="bg-white/80 backdrop-blur-md border-b border-[var(--outline-variant)] sticky top-0 z-50 transition-all">
        <nav className="flex justify-between items-center w-full px-[var(--margin-desktop)] py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-[var(--on-background)] flex items-center justify-center group-hover:bg-[var(--primary)] transition-colors duration-300">
               <span className="material-symbols-outlined text-white text-lg">school</span>
            </div>
            <div className="font-headline-sm text-[var(--on-background)] font-bold text-xl tracking-tight">CampusFlow</div>
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <a href="#features" className="font-nav-link text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors duration-300">Features</a>
            <a href="#ai-exams" className="font-nav-link text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors duration-300">AI Engine</a>
            <a href="#portals" className="font-nav-link text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors duration-300">Portals</a>
          </div>

          <div className="flex gap-4">
            <a href="#portals" className="px-6 py-2.5 bg-transparent border border-black text-black rounded-lg font-nav-link btn-active-scale transition-colors hover:bg-sky-500 hover:text-white hover:border-transparent flex items-center shadow-md">
              Sign In
            </a>
          </div>
        </nav>
      </header>

      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="relative w-full min-h-[85vh] flex items-center pt-8 pb-20">
          <div className="w-full max-w-[1440px] mx-auto px-[var(--margin-desktop)] grid grid-cols-1 md:grid-cols-12 gap-[var(--gutter)] items-center">

            {/* Left Content */}
            <motion.div className="md:col-span-7 space-y-8 relative z-10" variants={staggerContainer} initial="hidden" animate="show">
              <motion.div variants={fadeScaleUp} className="space-y-6">
                <h1 className="font-display-lg text-[var(--on-background)] max-w-2xl mt-4">
                  Campus operations, <br /> unified.
                </h1>
                
                <p className="font-body-lg text-[var(--on-surface-variant)] max-w-xl">
                  A high-performance platform for academic management. Streamline administration, grading, and communication in one functional workspace.
                </p>
              </motion.div>
              
              <motion.div variants={fadeScaleUp} className="flex flex-wrap gap-4 pt-4">
                <Link href="/student/login" className="flex items-center px-6 py-3.5 bg-[var(--primary)]/15 border border-[var(--outline-variant)] rounded-xl hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white text-[var(--on-background)] transition-all duration-300 btn-active-scale shadow-sm font-nav-link">
                  Student Portal
                </Link>
                <Link href="/teacher/login" className="flex items-center px-6 py-3.5 bg-[var(--secondary)]/15 border border-[var(--outline-variant)] rounded-xl hover:border-[var(--secondary)] hover:bg-[var(--secondary)] hover:text-white text-[var(--on-background)] transition-all duration-300 btn-active-scale shadow-sm font-nav-link">
                  Faculty Portal
                </Link>
                <Link href="/admin/login" className="flex items-center px-6 py-3.5 bg-[var(--tertiary)]/15 border border-[var(--outline-variant)] rounded-xl hover:border-[var(--tertiary)] hover:bg-[var(--tertiary)] hover:text-white text-[var(--on-background)] transition-all duration-300 btn-active-scale shadow-sm font-nav-link">
                  Admin Portal
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Visuals */}
            <motion.div className="md:col-span-5 relative h-full flex justify-end items-center" variants={fadeScaleUp} initial="hidden" animate="show">
              <img 
                src="/Online learning.svg" 
                alt="Online learning illustration" 
                className="w-[120%] max-w-[800px] object-contain drop-shadow-xl z-20 relative scale-110 lg:scale-125 origin-center lg:origin-right transform-gpu hover:scale-[1.3] transition-transform duration-700 ease-out" 
              />
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-[var(--surface)] border-y border-[var(--outline-variant)] scroll-mt-16">
          <div className="max-w-[1440px] mx-auto px-[var(--margin-desktop)]">
            <motion.div className="mb-16" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.5, ease: customEase }}>
              <h2 className="font-headline-md text-[var(--on-background)]">Integrated Infrastructure</h2>
              <p className="font-body-md text-[var(--on-surface-variant)] max-w-2xl mt-4">High-fidelity tools designed for the complete academic lifecycle, from enrollment data to final examinations.</p>
            </motion.div>

            <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} variants={featureCardsStagger}>
              {[
                { icon: 'auto_awesome', color: 'primary', title: 'Automated Exams', desc: 'Instantly generate comprehensive exams using Google Gemini integration.' },
                { icon: 'forum', color: 'secondary', title: 'Real-Time Sync', desc: 'Seamless communication with WebSocket-powered infrastructure.' },
                { icon: 'grading', color: 'tertiary', title: 'Smart Grading', desc: 'Automated evaluation that provides immediate feedback with manual overrides.' },
                { icon: 'account_tree', color: 'tertiary', title: 'Academic Hub', desc: 'Centralized management of courses, batches, materials, and attendance tracking.' },
                { icon: 'task_alt', color: 'primary', title: 'Student Workflows', desc: 'Personalized course lists, automated admit cards, and straightforward fee records.' },
                { icon: 'admin_panel_settings', color: 'secondary', title: 'Admin Oversight', desc: 'A dedicated command center for robust user management and configuration.' },
              ].map((feature, i) => (
                <motion.div key={i} variants={fadeScaleUp} className="bg-white border border-[var(--outline-variant)] p-8 rounded-2xl group hover:border-slate-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl bg-[var(--${feature.color})]/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[var(--${feature.color})]/20 transition-all duration-300`}>
                    <span className={`material-symbols-outlined text-[var(--${feature.color})] text-2xl`}>{feature.icon}</span>
                  </div>
                  <h3 className="font-headline-sm text-lg mb-3 text-[var(--on-background)]">{feature.title}</h3>
                  <p className="font-body-sm text-[var(--on-surface-variant)]">{feature.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* AI Examination System Section */}
        <section id="ai-exams" className="py-24 bg-white scroll-mt-16 overflow-hidden">
          <div className="max-w-[1440px] mx-auto px-[var(--margin-desktop)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div variants={fadeScaleUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }}>
                <span className="font-label-caps text-[var(--primary)] mb-4 block tracking-wider">Automated Engine</span>
                <h2 className="font-headline-md text-[var(--on-background)] mb-6">AI-Powered Examination</h2>
                <p className="font-body-md text-[var(--on-surface-variant)] mb-8 max-w-lg">
                  Transform how assessments are created and graded. Powered by Google Gemini, CampusFlow allows educators to generate exams on the fly, while smart grading algorithms provide immediate, granular feedback.
                </p>
                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[var(--secondary)] text-xl">check_circle</span>
                    <span className="font-body-md text-[var(--on-background)]">Automatic Question Generation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[var(--secondary)] text-xl">check_circle</span>
                    <span className="font-body-md text-[var(--on-background)]">Smart AI Grading & Feedback</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[var(--secondary)] text-xl">check_circle</span>
                    <span className="font-body-md text-[var(--on-background)]">Manual Review Overrides</span>
                  </li>
                </ul>
                <Link href="/teacher/login" className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-black text-black rounded-lg font-nav-link btn-active-scale hover:bg-sky-500 hover:text-white hover:border-transparent transition-colors shadow-sm group">
                  Explore Engine <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              </motion.div>
              
              <motion.div variants={fadeScaleUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} className="w-full relative">
                {/* Visual Representation of Dashboard */}
                <div className="w-full bg-[var(--surface)] border border-[var(--outline-variant)] rounded-2xl p-8 flex flex-col shadow-xl hover:shadow-2xl transition-shadow duration-500 transform hover:-translate-y-2">
                   <div className="flex justify-between items-center mb-8 pb-4 border-b border-[var(--outline-variant)]">
                     <div className="flex items-center gap-3">
                       <span className="material-symbols-outlined text-[var(--primary)] animate-pulse">auto_awesome</span>
                       <span className="font-nav-link text-[var(--on-background)]">Gemini Engine Active</span>
                     </div>
                     <span className="font-data-mono text-xs text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 rounded border border-[var(--primary)]/20">Processing...</span>
                   </div>
                   
                   <div className="space-y-6">
                     <div className="p-4 bg-white border border-[var(--outline-variant)] rounded-xl shadow-sm hover:border-[var(--primary)] transition-colors duration-300">
                       <div className="h-4 w-16 bg-slate-200 rounded mb-4"></div>
                       <div className="space-y-2">
                         <div className="h-3 w-full bg-slate-100 rounded"></div>
                         <div className="h-3 w-5/6 bg-slate-100 rounded"></div>
                       </div>
                     </div>
                     <div className="p-4 bg-white border border-[var(--outline-variant)] rounded-xl opacity-80 hover:opacity-100 shadow-sm transition-opacity duration-300">
                       <div className="h-4 w-16 bg-slate-200 rounded mb-4"></div>
                       <div className="space-y-2">
                         <div className="h-3 w-full bg-slate-100 rounded"></div>
                         <div className="h-3 w-3/4 bg-slate-100 rounded"></div>
                       </div>
                     </div>
                   </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Portal Preview Section */}
        <section id="portals" className="py-24 bg-[var(--surface)] border-t border-[var(--outline-variant)] scroll-mt-16">
          <div className="max-w-[1440px] mx-auto px-[var(--margin-desktop)]">
            <motion.div className="mb-16 text-center" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease: customEase }}>
               <h2 className="font-headline-md text-[var(--on-background)]">Role-Based Workspaces</h2>
               <p className="font-body-md text-[var(--on-surface-variant)] max-w-2xl mx-auto mt-4">Dedicated environments tailored to specific workflows.</p>
            </motion.div>

            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8" initial="hidden" whileInView="show" viewport={{ once: true, margin: "-50px" }} variants={featureCardsStagger}>
              {/* Student Card */}
              <motion.div variants={fadeScaleUp} className="flex flex-col bg-white border border-[var(--outline-variant)] rounded-2xl overflow-hidden group hover:border-[var(--primary)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-48 overflow-hidden relative border-b border-[var(--outline-variant)]">
                  <div className="absolute inset-0 bg-[var(--primary)]/20 mix-blend-multiply group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out" alt="Student studying" src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop" />
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="font-headline-sm mb-3 text-[var(--on-background)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--primary)]">person</span> Student Portal
                  </h3>
                  <p className="font-body-sm text-[var(--on-surface-variant)] mb-8 flex-grow">Track grades, access learning materials, and manage course enrollments.</p>
                  <Link href="/student/login" className="w-full py-3 bg-[var(--surface)] text-[var(--on-background)] border border-[var(--outline-variant)] rounded-lg font-nav-link btn-active-scale transition-all duration-300 text-center hover:bg-[var(--primary)] hover:text-white hover:border-[var(--primary)] shadow-sm">Sign In</Link>
                </div>
              </motion.div>

              {/* Teacher Card */}
              <motion.div variants={fadeScaleUp} className="flex flex-col bg-white border border-[var(--outline-variant)] rounded-2xl overflow-hidden group hover:border-[var(--secondary)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-48 overflow-hidden relative border-b border-[var(--outline-variant)]">
                  <div className="absolute inset-0 bg-[var(--secondary)]/20 mix-blend-multiply group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out" alt="Teacher lecturing" src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1000&auto=format&fit=crop" />
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="font-headline-sm mb-3 text-[var(--on-background)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--secondary)]">assignment_ind</span> Faculty Portal
                  </h3>
                  <p className="font-body-sm text-[var(--on-surface-variant)] mb-8 flex-grow">Simplify course management, automate grading, and distribute materials.</p>
                  <Link href="/teacher/login" className="w-full py-3 bg-[var(--surface)] text-[var(--on-background)] border border-[var(--outline-variant)] rounded-lg font-nav-link btn-active-scale transition-all duration-300 text-center hover:bg-[var(--secondary)] hover:text-white hover:border-[var(--secondary)] shadow-sm">Sign In</Link>
                </div>
              </motion.div>

              {/* Admin Card */}
              <motion.div variants={fadeScaleUp} className="flex flex-col bg-white border border-[var(--outline-variant)] rounded-2xl overflow-hidden group hover:border-[var(--tertiary)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-48 overflow-hidden relative border-b border-[var(--outline-variant)]">
                  <div className="absolute inset-0 bg-[var(--tertiary)]/20 mix-blend-multiply group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                  <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out" alt="Admin working" src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=1000&auto=format&fit=crop" />
                </div>
                <div className="p-8 flex flex-col flex-grow">
                  <h3 className="font-headline-sm mb-3 text-[var(--on-background)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--tertiary)]">admin_panel_settings</span> Admin Portal
                  </h3>
                  <p className="font-body-sm text-[var(--on-surface-variant)] mb-8 flex-grow">Manage institutional data, user roles, and campus-wide operations.</p>
                  <Link href="/admin/login" className="w-full py-3 bg-[var(--surface)] text-[var(--on-background)] border border-[var(--outline-variant)] rounded-lg font-nav-link btn-active-scale transition-all duration-300 text-center hover:bg-[var(--tertiary)] hover:text-white hover:border-[var(--tertiary)] shadow-sm">Sign In</Link>
                </div>
              </motion.div>

            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[var(--outline-variant)] py-16 mt-auto">
        <div className="max-w-[1440px] mx-auto px-[var(--margin-desktop)]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded bg-[var(--on-background)] flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-sm">school</span>
                 </div>
                 <h2 className="font-headline-sm font-bold text-[var(--on-background)] text-lg">CampusFlow</h2>
              </div>
              <p className="font-body-sm text-[var(--on-surface-variant)] max-w-xs">Data-dense academic infrastructure. Built for performance and reliability.</p>
            </div>
            
            <div>
              <h4 className="font-label-caps text-[var(--on-background)] mb-6">Stack</h4>
              <ul className="space-y-4 font-body-sm text-[var(--on-surface-variant)]">
                <li><a className="hover:text-[var(--primary)] transition-colors duration-300" href="https://nextjs.org/" target="_blank" rel="noreferrer">Next.js 14</a></li>
                <li><a className="hover:text-[var(--primary)] transition-colors duration-300" href="https://fastapi.tiangolo.com/" target="_blank" rel="noreferrer">FastAPI</a></li>
                <li><a className="hover:text-[var(--primary)] transition-colors duration-300" href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noreferrer">Google Gemini</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-label-caps text-[var(--on-background)] mb-6">Workspaces</h4>
              <ul className="space-y-4 font-body-sm text-[var(--on-surface-variant)]">
                <li><Link className="hover:text-[var(--primary)] transition-colors duration-300" href="/student/login">Student</Link></li>
                <li><Link className="hover:text-[var(--primary)] transition-colors duration-300" href="/teacher/login">Faculty</Link></li>
                <li><Link className="hover:text-[var(--primary)] transition-colors duration-300" href="/admin/login">Admin</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-label-caps text-[var(--on-background)] mb-6">Legal</h4>
              <ul className="space-y-4 font-body-sm text-[var(--on-surface-variant)]">
                <li><a className="hover:text-[var(--primary)] transition-colors duration-300" href="#">Privacy</a></li>
                <li><a className="hover:text-[var(--primary)] transition-colors duration-300" href="#">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-[var(--outline-variant)] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="font-data-mono text-[12px] text-[var(--on-surface-variant)]">© {new Date().getFullYear()} CampusFlow Systems</p>
            <div className="flex gap-4">
               <span className="material-symbols-outlined text-[var(--on-surface-variant)] hover:text-[var(--primary)] cursor-pointer transition-colors duration-300 text-lg">public</span>
               <span className="material-symbols-outlined text-[var(--on-surface-variant)] hover:text-[var(--primary)] cursor-pointer transition-colors duration-300 text-lg">mail</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
