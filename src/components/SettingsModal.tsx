import { FolderOpen, RefreshCcw, X } from 'lucide-react'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentFolder: string | null
  includeDummyData: boolean
  onToggleDummyData: (value: boolean) => void
  onPickFolder: () => Promise<void> | void
  onRescan: () => Promise<void> | void
  isScanning: boolean
  tauriAvailable: boolean
}

export function SettingsModal({
  isOpen,
  onClose,
  currentFolder,
  includeDummyData,
  onToggleDummyData,
  onPickFolder,
  onRescan,
  isScanning,
  tauriAvailable
}: SettingsModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#070b17] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              UdotFlix Settings
            </p>
            <h3 className="mt-1 text-xl font-semibold text-white">Local Library</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-medium text-slate-200">Selected video folder</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 font-mono text-xs leading-6 text-slate-200">
              {currentFolder ?? 'No folder selected yet.'}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300/75">
              Supported formats: `.mp4`, `.mkv`, `.webm`, `.mov`, `.avi`
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void onPickFolder()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!tauriAvailable}
            >
              <FolderOpen size={18} />
              <span>Choose Folder</span>
            </button>

            <button
              type="button"
              onClick={() => void onRescan()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-300/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!currentFolder || isScanning || !tauriAvailable}
            >
              <RefreshCcw size={18} className={isScanning ? 'animate-spin' : ''} />
              <span>{isScanning ? 'Scanning...' : 'Rescan Library'}</span>
            </button>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-100">Preview data fallback</p>
                <p className="mt-2 text-sm leading-6 text-slate-300/75">
                  Keep dummy items available when no local folder has been selected or when the folder is empty.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onToggleDummyData(!includeDummyData)}
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition ${
                  includeDummyData ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
                aria-pressed={includeDummyData}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${
                    includeDummyData ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-amber-300/15 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
            {tauriAvailable
              ? 'Folder selection and scanning are active in the desktop runtime.'
              : 'This preview is running in the browser. Install Rust and start the app with `npm run tauri:dev` to enable native folder access and local playback.'}
          </div>
        </div>
      </div>
    </div>
  )
}
