const STORAGE_KEY = 'visimate-businesses'

/**
 * Get all business UUIDs from localStorage
 */
export function getStoredBusinessIds(): string[] {
  if (!import.meta.client) return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading business IDs from localStorage:', error)
    return []
  }
}

/**
 * Add a business UUID to localStorage
 */
export function addBusinessId(id: string): void {
  if (!import.meta.client) return
  
  try {
    const existing = getStoredBusinessIds()
    if (!existing.includes(id)) {
      const updated = [...existing, id]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }
  } catch (error) {
    console.error('Error adding business ID to localStorage:', error)
  }
}

/**
 * Remove a business UUID from localStorage
 */
export function removeBusinessId(id: string): void {
  if (!import.meta.client) return
  
  try {
    const existing = getStoredBusinessIds()
    const updated = existing.filter(existingId => existingId !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error removing business ID from localStorage:', error)
  }
}

/**
 * Generate a new UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
} 