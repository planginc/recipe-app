import { useQuery, useMutation } from 'convex/react'
import { anyApi } from 'convex/server'
import { USER_TELEGRAM_ID } from '../../lib/config'

function normalize(doc) {
  return {
    id: doc._id,
    item_name: doc.itemName,
    quantity: doc.quantity,
    unit: doc.unit,
    category: doc.category,
    user_telegram_id: doc.userTelegramId,
  }
}

export function useFreezerItems() {
  const results = useQuery(anyApi.freezer.list, { userTelegramId: USER_TELEGRAM_ID })
  const createMutation = useMutation(anyApi.freezer.create)
  const updateMutation = useMutation(anyApi.freezer.update)
  const removeMutation = useMutation(anyApi.freezer.remove)

  const data = results?.map(normalize) ?? []

  async function createItem({ itemName, quantity, unit, category }) {
    await createMutation({ userTelegramId: USER_TELEGRAM_ID, itemName, quantity, unit, category })
  }

  async function updateItem(id, { itemName, quantity, unit, category }) {
    await updateMutation({ id, itemName, quantity, unit, category })
  }

  async function deleteItem(id) {
    await removeMutation({ id })
  }

  return {
    data,
    loading: results === undefined,
    error: null,
    refetch: () => {},
    createItem,
    updateItem,
    deleteItem,
  }
}
