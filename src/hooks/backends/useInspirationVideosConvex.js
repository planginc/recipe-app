import { useQuery, useMutation } from 'convex/react'
import { anyApi } from 'convex/server'
import { USER_TELEGRAM_ID } from '../../lib/config'

function normalize(doc) {
  return {
    id: doc._id,
    url: doc.url,
    title: doc.title,
    tags: doc.tags || [],
    notes: doc.notes || '',
    thumbnail_url: doc.thumbnailUrl || '',
    promoted_to_recipe_id: doc.promotedToRecipeId || null,
    steps: doc.steps || [],
    created_at: new Date(doc._creationTime).toISOString(),
    user_telegram_id: doc.userTelegramId,
  }
}

export function useInspirationVideos() {
  const results = useQuery(anyApi.inspiration.list, { userTelegramId: USER_TELEGRAM_ID })
  const createMutation = useMutation(anyApi.inspiration.create)
  const updateMutation = useMutation(anyApi.inspiration.update)
  const removeMutation = useMutation(anyApi.inspiration.remove)
  const generateUploadUrlMutation = useMutation(anyApi.inspiration.generateUploadUrl)
  const createRecipeMutation = useMutation(anyApi.recipes.create)

  const data = results?.map(normalize) ?? []

  async function createVideo({ url, title, tags = [], notes = '', thumbnailUrl = '' }) {
    await createMutation({ userTelegramId: USER_TELEGRAM_ID, url, title, tags, notes, thumbnailUrl })
  }

  async function updateVideo(id, updates) {
    const convexUpdates = { ...updates }
    if ('thumbnail_url' in convexUpdates) {
      convexUpdates.thumbnailUrl = convexUpdates.thumbnail_url
      delete convexUpdates.thumbnail_url
    }
    if ('promoted_to_recipe_id' in convexUpdates) {
      convexUpdates.promotedToRecipeId = convexUpdates.promoted_to_recipe_id
      delete convexUpdates.promoted_to_recipe_id
    }
    await updateMutation({ id, ...convexUpdates })
  }

  async function deleteVideo(id) {
    await removeMutation({ id })
  }

  async function promoteToRecipe(item, recipeData) {
    const id = await createRecipeMutation({
      userTelegramId: USER_TELEGRAM_ID,
      title: recipeData.title,
      content: recipeData.content,
      metadata: recipeData.metadata,
      tags: recipeData.tags || [],
    })
    await updateMutation({ id: item.id, promotedToRecipeId: id })
    return { id, ...recipeData }
  }

  async function uploadStepImage(blob, _itemId, _stepIndex) {
    const uploadUrl = await generateUploadUrlMutation({})
    const result = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': blob.type },
      body: blob,
    })
    const { storageId } = await result.json()
    // Return a convex storage URL
    const { CONVEX_URL } = await import('../../lib/config')
    const siteUrl = CONVEX_URL.replace('.convex.cloud', '.convex.site')
    return `${siteUrl}/api/storage/${storageId}`
  }

  return {
    data,
    loading: results === undefined,
    error: null,
    refetch: () => {},
    createVideo,
    updateVideo,
    deleteVideo,
    promoteToRecipe,
    uploadStepImage,
  }
}
