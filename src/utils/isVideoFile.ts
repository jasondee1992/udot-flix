const VIDEO_EXTENSIONS = new Set(['mp4', 'mkv', 'webm', 'mov', 'avi'])

export function isVideoFile(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  return VIDEO_EXTENSIONS.has(extension)
}
