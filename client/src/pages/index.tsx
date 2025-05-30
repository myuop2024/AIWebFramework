export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
      <div className="rounded-2xl shadow-2xl backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 border border-slate-200 dark:border-gray-700 p-12 flex flex-col items-center gap-6 max-w-lg">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-16 w-16 flex items-center justify-center rounded-full bg-primary text-white font-extrabold text-3xl shadow-lg">C</div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">CAFFE</h1>
            <span className="text-sm font-semibold text-primary/80 tracking-wider uppercase">Election Observation System</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 text-center">Welcome to the next generation of election observation.<br />Modern, secure, and AI-powered.</h2>
        <p className="text-base text-gray-600 dark:text-gray-300 text-center mb-4">Empowering transparency, trust, and democracy with advanced technology and beautiful design.</p>
        <a href="/login" className="rounded-lg font-bold px-6 py-3 text-base transition-all duration-150 shadow-md bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2">Get Started</a>
      </div>
    </main>
  );
} 