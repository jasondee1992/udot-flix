import { LoaderCircle, Search } from 'lucide-react'

interface NavbarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  isScanning: boolean
}

export function Navbar({
  searchQuery,
  onSearchChange,
  isScanning
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050507]/82 shadow-[0_14px_50px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a href="/" className="inline-flex w-fit items-center" aria-label="UFlix home">
            <img
              src="/UFlix_Logo_v2.png"
              alt="UFlix"
              className="h-10 w-auto object-contain sm:h-12 lg:h-14"
            />
          </a>

          <div className="flex min-w-0 items-center gap-3 sm:justify-end">
            {isScanning ? (
              <div className="hidden items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100 md:flex">
                <LoaderCircle size={14} className="animate-spin" />
                <span>Scanning</span>
              </div>
            ) : null}

            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/[0.075] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_48px_rgba(0,0,0,0.28)] transition focus-within:border-red-400/45 focus-within:bg-white/[0.11] sm:w-[360px] sm:flex-none lg:w-[420px]">
              <Search size={17} className="shrink-0 text-slate-300" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search movies..."
                className="w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
              />
            </label>
          </div>
        </div>
      </div>
    </header>
  )
}
