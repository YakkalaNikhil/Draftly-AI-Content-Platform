export const DRAFTS_STORAGE_KEY = 'draftly.recentDrafts.v1'
export const MAX_SAVED_DRAFTS = 30

function getBrowserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function loadSavedDrafts(storage = getBrowserStorage()) {
  if (!storage) return []
  try {
    const saved = storage.getItem(DRAFTS_STORAGE_KEY)
    if (!saved) return []
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(item => item && typeof item.id === 'string' && typeof item.text === 'string')
      .slice(0, MAX_SAVED_DRAFTS)
  } catch (error) {
    console.warn('Draftly could not read saved drafts from localStorage:', error)
    return []
  }
}

export function saveSavedDrafts(history, storage = getBrowserStorage()) {
  if (!storage) return false
  try {
    storage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_SAVED_DRAFTS)))
    return true
  } catch (error) {
    console.warn('Draftly could not persist drafts to localStorage:', error)
    return false
  }
}

export function makeDraftTitle(task, topic, sourceText) {
  const titleSource = task === 'generate' ? topic : sourceText || topic
  return String(titleSource || '').trim().replace(/\s+/g, ' ').slice(0, 44) || 'Untitled draft'
}
