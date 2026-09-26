import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden bg-[var(--surface-0)]">
      {/* Dynamic Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[var(--brand-500)] opacity-20 blur-[120px] animate-pulse-dot" />
        <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-[var(--wa-green)] opacity-10 blur-[100px] animate-fade-in" />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10">
        <div className="max-w-3xl w-full flex flex-col items-center animate-slide-up">
          <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[var(--brand-400)] animate-pulse" />
            <span className="text-xs font-medium text-white/80 uppercase tracking-widest">Anweo Agency CRM</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            Dominate Your Day. <br />
            <span className="text-[var(--brand-400)]">Close More Deals.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mb-12 leading-relaxed">
            Every local business is an opportunity waiting to be unlocked. 
            Sign in to access your AI-powered outreach machine and start turning cold leads into lasting partnerships.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Link 
              href="/login" 
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-400)] to-[var(--brand-600)] opacity-0 group-hover:opacity-20 transition-opacity" />
              <span>Log In & Start Work</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
        
        {/* Floating Glass Cards Decoration */}
        <div className="absolute left-[5%] top-[25%] hidden lg:block w-64 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transform -rotate-6 animate-fade-in opacity-70">
          <div className="h-2 w-1/3 bg-white/20 rounded mb-4" />
          <div className="h-2 w-full bg-white/10 rounded mb-2" />
          <div className="h-2 w-4/5 bg-white/10 rounded" />
        </div>
        
        <div className="absolute right-[5%] bottom-[30%] hidden lg:block w-72 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md transform rotate-3 animate-fade-in opacity-70">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[var(--wa-green)]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[var(--wa-green)]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
            <div className="text-sm font-medium text-white/80">Pitch Generated</div>
          </div>
          <div className="h-2 w-full bg-white/10 rounded mb-2" />
          <div className="h-2 w-2/3 bg-white/10 rounded" />
        </div>
      </main>
    </div>
  );
}
