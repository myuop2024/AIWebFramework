export default function Header() {
  return (
    <header className="w-full bg-gradient-to-r from-primary/80 to-secondary/80 backdrop-blur-md shadow-lg flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-white font-bold text-xl shadow-md">C</div>
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight leading-tight">CAFFE</h1>
          <span className="text-xs font-semibold text-white/80 tracking-wider uppercase">Election Observation System</span>
        </div>
      </div>
      {/* User avatar and quick links can go here */}
    </header>
  );
} 