export function parseMetadata(recipe) {
  if (!recipe) return {}
  const raw = recipe.metadata
  if (typeof raw === 'string') {
    try { return JSON.parse(raw || '{}') } catch { return {} }
  }
  return raw || {}
}
