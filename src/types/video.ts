import type { LucideIcon } from 'lucide-react'

export interface VideoItem {
  id: string
  fileName: string
  title: string
  filePath?: string
  playbackPath?: string
  extension: string
  category: string
  year: string
  duration: string
  durationSeconds?: number | null
  badge: string
  description: string
  thumbnail: string
  backdrop: string
  isLocal: boolean
  progress: number
  resumeTime: number
  isFavorite: boolean
  addedAt?: string
  lastPlayedAt?: string
  fileSize?: string
}

export interface VideoSection {
  key: string
  title: string
  description: string
  videos: VideoItem[]
}

export interface PlaybackState {
  progress: number
  resumeTime: number
  durationSeconds: number
  lastPlayedAt: string
}

export interface PlayerState {
  video: VideoItem
  autoplay: boolean
}

export interface ScannedVideoFile {
  id: string
  fileName: string
  title: string
  filePath: string
  playbackPath: string
  posterPath?: string | null
  extension: string
  category: string
  duration?: string | null
  durationSeconds?: number | null
  modifiedAt?: string | null
  sizeBytes: number
}

export interface NavigationItem {
  id: ViewMode | 'settings'
  label: string
  icon: LucideIcon
}

export type ViewMode = 'home' | 'library' | 'recently-played'
