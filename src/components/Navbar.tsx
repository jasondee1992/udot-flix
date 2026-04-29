import { LoaderCircle, Search } from 'lucide-react'

interface NavbarProps {
  appName: string
  searchQuery: string
  onSearchChange: (value: string) => void
  isScanning: boolean
}

export function Navbar({
  appName,
  searchQuery,
  onSearchChange,
  isScanning
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/75 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black text-white shadow-[0_20px_45px_rgba(37,99,235,0.35)]">
              U
            </div>
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-cyan-300/80">
                Desktop Library
              </p>
              <h1 className="text-lg font-semibold text-white">{appName}</h1>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {isScanning ? (
              <div className="flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100">
                <LoaderCircle size={14} className="animate-spin" />
                <span>Scanning library</span>
              </div>
            ) : null}

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-2 shadow-[0_12px_30px_rgba(15,23,42,0.28)]">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white">
                JD
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="hidden lg:block" />

          <label className="flex min-w-0 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:min-w-[360px]">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search titles or file names..."
              className="w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
      </div>
    </header>
  )
}
