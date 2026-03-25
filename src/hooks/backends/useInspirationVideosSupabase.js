import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { USER_TELEGRAM_ID } from '../../lib/config'

export function useInspirationVideos() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    try {
      setLoading(true)
      const { data: rows, error: err } = await supabase
        .from('inspiration_videos')
        .select('*')
        .eq('user_telegram_id', USER_TELEGRAM_ID)
        .order('created_at', { ascending: false })
      if (err) throw err
      setData(rows || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function createVideo({ url, title, tags = [], notes = '', thumbnailUrl = '' }) {
    const { error: err } = await supabase
      .from('inspiration_videos')
      .insert([{ user_telegram_id: USER_TELEGRAM_ID, url, title, tags, notes, thumbnail_url: thumbnailUrl }])
    if (err) throw err
    await fetchData()
  }

  async function updateVideo(id, updates) {
    const dbUpdates = { ...updates, updated_at: new Date().toISOString() }
    if ('thumbnailUrl' in updates) {
      dbUpdates.thumbnail_url = updates.thumbnailUrl
      delete dbUpdates.thumbnailUrl
    }
    if ('promotedToRecipeId' in updates) {
      dbUpdates.promoted_to_recipe_id = updates.promotedToRecipeId
      delete dbUpdates.promotedToRecipeId
    }
    const { error: err } = await supabase
      .from('inspiration_videos')
      .update(dbUpdates)
      .eq('id', id)
    if (err) throw err
    await fetchData()
  }

  async function deleteVideo(id) {
    const { error: err } = await supabase
      .from('inspiration_videos')
      .delete()
      .eq('id', id)
    if (err) throw err
    await fetchData()
  }

  async function promoteToRecipe(item, recipeData) {
    const { data: row, error: err } = await supabase
      .from('notes')
      .insert([{
        title: recipeData.title,
        content: recipeData.content,
        note_type: 'recipe',
        user_telegram_id: USER_TELEGRAM_ID,
        metadata: recipeData.metadata,
        tags: recipeData.tags || [],
      }])
      .select()
      .single()
    if (err) throw err
    await supabase
      .from('inspiration_videos')
      .update({ promoted_to_recipe_id: row.id })
      .eq('id', item.id)
    await fetchData()
    return row
  }

  async function uploadStepImage(blob, itemId, stepIndex) {
    const fileName = `${itemId}/${Date.now()}-step-${stepIndex + 1}.${blob.type.split('/')[1] || 'png'}`
    const { error: err } = await supabase.storage
      .from('inspiration-steps')
      .upload(fileName, blob, { cacheControl: '3600', upsert: false })
    if (err) throw err
    const { data: urlData } = supabase.storage.from('inspiration-steps').getPublicUrl(fileName)
    return urlData.publicUrl
  }

  return { data, loading, error, refetch: fetchData, createVideo, updateVideo, deleteVideo, promoteToRecipe, uploadStepImage }
}
