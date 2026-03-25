import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { USER_TELEGRAM_ID } from '../../lib/config'

export function useFreezerItems() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchData() {
    try {
      setLoading(true)
      const { data: rows, error: err } = await supabase
        .from('freezer_inventory')
        .select('*')
        .eq('user_telegram_id', USER_TELEGRAM_ID)
        .order('category', { ascending: true })
        .order('item_name', { ascending: true })
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

  async function createItem({ itemName, quantity, unit, category }) {
    const { error: err } = await supabase
      .from('freezer_inventory')
      .insert([{ user_telegram_id: USER_TELEGRAM_ID, item_name: itemName, quantity, unit, category }])
    if (err) throw err
    await fetchData()
  }

  async function updateItem(id, { itemName, quantity, unit, category }) {
    const { error: err } = await supabase
      .from('freezer_inventory')
      .update({ item_name: itemName, quantity, unit, category, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (err) throw err
    await fetchData()
  }

  async function deleteItem(id) {
    const { error: err } = await supabase
      .from('freezer_inventory')
      .delete()
      .eq('id', id)
    if (err) throw err
    await fetchData()
  }

  return { data, loading, error, refetch: fetchData, createItem, updateItem, deleteItem }
}
