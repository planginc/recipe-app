import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, Loader2, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react'

const USER_ID = '6285585111'

function FreezerInventoryPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    item_name: '',
    quantity: '',
    unit: 'servings',
    category: 'Prepared Components'
  })

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('freezer_inventory')
        .select('*')
        .eq('user_telegram_id', USER_ID)
        .order('category', { ascending: true })
        .order('item_name', { ascending: true })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching freezer items:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('freezer_inventory')
          .update({
            item_name: formData.item_name,
            quantity: parseFloat(formData.quantity),
            unit: formData.unit,
            category: formData.category,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id)

        if (error) throw error
      } else {
        // Add new item
        const { error } = await supabase
          .from('freezer_inventory')
          .insert([{
            user_telegram_id: USER_ID,
            item_name: formData.item_name,
            quantity: parseFloat(formData.quantity),
            unit: formData.unit,
            category: formData.category
          }])

        if (error) throw error
      }

      // Reset form and refresh
      setFormData({ item_name: '', quantity: '', unit: 'servings', category: 'Prepared Components' })
      setShowAddForm(false)
      setEditingItem(null)
      fetchItems()
    } catch (err) {
      console.error('Error saving item:', err)
      alert('Error saving item: ' + err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const { error } = await supabase
        .from('freezer_inventory')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchItems()
    } catch (err) {
      console.error('Error deleting item:', err)
      alert('Error deleting item: ' + err.message)
    }
  }

  function startEdit(item) {
    setEditingItem(item)
    setFormData({
      item_name: item.item_name,
      quantity: item.quantity.toString(),
      unit: item.unit,
      category: item.category
    })
    setShowAddForm(true)
  }

  function cancelEdit() {
    setEditingItem(null)
    setFormData({ item_name: '', quantity: '', unit: 'servings', category: 'Prepared Components' })
    setShowAddForm(false)
  }

  // Group items by category
  const itemsByCategory = items.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {})

  // Get low stock items (< 5 units)
  const lowStockItems = items.filter(item => item.quantity < 5)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Recipes
          </button>
          <button 
            onClick={() => {
              setShowAddForm(true)
              setEditingItem(null)
              setFormData({ item_name: '', quantity: '', unit: 'servings', category: 'Prepared Components' })
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🧊 Freezer Inventory</h1>
        <p className="text-gray-600 mb-8">
          {items.length} items in freezer
        </p>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">⚠️ Running Low</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  {lowStockItems.map(item => (
                    <li key={item.id}>
                      {item.item_name}: {item.quantity} {item.unit} remaining
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g., Sliced Chicken"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="servings">servings</option>
                    <option value="portions">portions</option>
                    <option value="pieces">pieces</option>
                    <option value="cubes">cubes</option>
                    <option value="packages">packages</option>
                    <option value="bags">bags</option>
                    <option value="containers">containers</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Prepared Components">Prepared Components</option>
                    <option value="Proteins">Proteins</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Fruits">Fruits</option>
                    <option value="Complete Meals">Complete Meals</option>
                    <option value="Flavor Arsenal">Flavor Arsenal</option>
                    <option value="Pantry">Pantry</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 mb-6">
            Error loading freezer inventory: {error}
          </div>
        )}

        {/* Inventory List by Category */}
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No items in freezer. Add your first item!
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(itemsByCategory).map(([category, categoryItems]) => (
              <div key={category} className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">{category}</h2>
                <div className="space-y-3">
                  {categoryItems.map((item) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-baseline gap-3">
                          <span className="font-medium text-gray-900">{item.item_name}</span>
                          <span className="text-sm text-gray-600">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Last Updated */}
        <div className="text-center text-sm text-gray-500 mt-8">
          Last updated: {new Date().toLocaleString()}
        </div>
      </main>
    </div>
  )
}

export default FreezerInventoryPage
