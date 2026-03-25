import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { USER_TELEGRAM_ID } from '../../lib/config'

export function useRecipes() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    try {
      setLoading(true)
      const { data: rows, error: err } = await supabase
        .from('notes')
        .select('*')
        .eq('note_type', 'recipe')
        .order('id', { ascending: false })
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

  async function createRecipe({ title, content, metadata = {}, tags = [] }) {
    const { data: row, error: err } = await supabase
      .from('notes')
      .insert([{
        user_telegram_id: USER_TELEGRAM_ID,
        title,
        content,
        category: 'RESOURCES',
        note_type: 'recipe',
        tags,
        metadata,
      }])
      .select()
      .single()
    if (err) throw err
    return row
  }

  async function getRecipe(id) {
    const { data: row, error: err } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .eq('note_type', 'recipe')
      .single()
    if (err) throw err
    return row
  }

  async function updateRecipe(id, updates) {
    const { error: err } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', id)
    if (err) throw err
  }

  return { data, loading, error, refetch: fetchData, createRecipe, getRecipe, updateRecipe }
}
