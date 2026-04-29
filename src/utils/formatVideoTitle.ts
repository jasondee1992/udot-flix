export function formatVideoTitle(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}
