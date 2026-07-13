export default function HeroVisual() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div className="absolute inset-0 bg-blue-600/10 blur-[90px] rounded-full" />

      {/* Secondary card peeking behind */}
      <div className="absolute -bottom-8 -left-6 -rotate-6 w-48 bg-white/80 border border-slate-200 rounded-xl p-4 shadow-xl -z-10">
        <div className="text-[10px] font-mono text-slate-400 mb-2">יום ה׳ · 16:00–17:30</div>
        <div className="flex gap-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i < 6 ? 'bg-slate-300' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      {/* Primary schedule-preview card */}
      <div className="relative rotate-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono text-slate-500">יום ג׳ · 17:00–18:30</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
            תיכון 5 יח&apos;
          </span>
        </div>

        <div className="flex gap-0.5 mb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 4 ? 'bg-blue-500' : 'bg-slate-200'}`} />
          ))}
        </div>
        <div className="text-xs text-slate-400 mb-4">4/6 תלמידים</div>

        <span className="text-xs px-2 py-1 inline-block rounded-full bg-green-50 text-green-700 font-semibold border border-green-200">
          2 מקומות פנויים
        </span>

        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366] shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
          </svg>
          אישור מיידי בוואטסאפ
        </div>
      </div>

      {/* Floating confirmation badge */}
      <div className="absolute -top-4 -right-4 pulse-badge bg-blue-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg shadow-blue-600/30">
        המקום שלך מובטח ✓
      </div>
    </div>
  )
}
