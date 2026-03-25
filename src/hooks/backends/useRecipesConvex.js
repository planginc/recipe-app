import { useQuery, useMutation } from 'convex/react'
import { anyApi } from 'convex/server'
import { USER_TELEGRAM_ID } from '../../lib/config'

function normalize(doc) {
  if (!doc) return null
  return {
    id: doc._id,
    title: doc.title,
    content: doc.content,
    metadata: doc.metadata,
    tags: doc.tags,
    note_type: 'recipe',
    user_telegram_id: doc.userTelegramId,
    created_at: new Date(doc._creationTime).toISOString(),
  }
}

export function useRecipes() {
  const results = useQuery(anyApi.recipes.list, { userTelegramId: USER_TELEGRAM_ID })
  const createMutation = useMutation(anyApi.recipes.create)
  const updateMutation = useMutation(anyApi.recipes.update)

  const data = results?.map(normalize) ?? []

  async function createRecipe({ title, content, metadata = {}, tags = [] }) {
    const id = await createMutation({ userTelegramId: USER_TELEGRAM_ID, title, content, metadata, tags })
    return { id, title, content, metadata, tags, note_type: 'recipe', user_telegram_id: USER_TELEGRAM_ID }
  }

  async function getRecipe(id) {
    // Convex is reactive -- find in already-loaded data or query directly
    const found = data.find(r => r.id === id)
    if (found) return found
    return null
  }

  async function updateRecipe(id, updates) {
    await updateMutation({ id, ...updates })
  }

  return {
    data,
    loading: results === undefined,
    error: null,
    refetch: () => {},
    createRecipe,
    getRecipe,
    updateRecipe,
  }
}
