import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, Loader2, ExternalLink, Save, Trash2, Edit2 } from 'lucide-react'

const DIETARY_OPTIONS = [
  { id: 'keto', label: 'Keto-Friendly' },
  { id: 'low-carb', label: 'Low-Carb' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'whole30', label: 'Whole30' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'high-protein', label: 'High-Protein' }
]

const FOLDER_OPTIONS = [
  'Folder 1 - Chicken & Poultry',
  'Folder 2 - Beef',
  'Folder 3 - Pork & Lamb',
  'Folder 4 - Fish & Seafood',
  'Folder 5 - Eggs',
  'Folder 6 - Beans & Legumes',
  'Folder 7 - Pasta & Noodles',
  'Folder 8 - Rice & Grains',
  'Folder 9 - Potatoes',
  'Folder 10 - Vegetable Mains',
  'Folder 11 - Salads',
  'Folder 12 - Soups, Stews & Broth',
  'Folder 13 - Dressings, Sauces & Marinades',
  'Folder 14 - Dips & Spreads',
  'Folder 15 - Bread & Baking',
  'Folder 16 - Breakfast Items',
  'Folder 17 - Desserts & Sweets',
  'Folder 18 - Beverages & Smoothies',
  'Folder 19 - Snacks & Appetizers',
  'Folder 20 - Condiments & Preserves'
]

const USER_ID = '6285585111'

function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  
  // Editable fields
  const [rating, setRating] = useState(0)
  const [isTried, setIsTried] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState('')
  const [dietaryTags, setDietaryTags] = useState([])
  const [userNotes, setUserNotes] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [editingImage, setEditingImage] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [autoTagging, setAutoTagging] = useState(false)
  
  // Freezer inventory
  const [freezerItems, setFreezerItems] = useState([])
  const [usedItems, setUsedItems] = useState({})

  useEffect(() => {
    fetchRecipe()
    fetchFreezerItems()
  }, [id])

  async function fetchRecipe() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .eq('note_type', 'recipe')
        .single()

      if (error) throw error
      
      setRecipe(data)
      
      // Parse and set metadata
      const metadata = typeof data.metadata === 'string' 
        ? JSON.parse(data.metadata || '{}') 
        : (data.metadata || {})
      
      setRating(metadata.rating || 0)
      setIsTried(metadata.tried_status || false)
      setSelectedFolder(metadata.physical_location || '')
      setDietaryTags(metadata.dietary_tags || [])
      setUserNotes(metadata.your_notes || '')
    } catch (err) {
      console.error('Error fetching recipe:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchFreezerItems() {
    try {
      const { data, error } = await supabase
        .from('freezer_inventory')
        .select('*')
        .eq('user_telegram_id', USER_ID)
        .order('item_name', { ascending: true })

      if (error) throw error
      setFreezerItems(data || [])
    } catch (err) {
      console.error('Error fetching freezer items:', err)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      
      const currentMetadata = typeof recipe.metadata === 'string' 
        ? JSON.parse(recipe.metadata || '{}') 
        : (recipe.metadata || {})
      
      const updatedMetadata = {
        ...currentMetadata,
        rating,
        tried_status: isTried,
        physical_location: selectedFolder,
        dietary_tags: dietaryTags,
        your_notes: userNotes,
        image_url: imageUrl
      }

      const { error } = await supabase
        .from('notes')
        .update({ metadata: updatedMetadata })
        .eq('id', id)

      if (error) throw error
      
      // Update local state
      setRecipe({ ...recipe, metadata: updatedMetadata })
      
      alert('Recipe saved successfully!')
    } catch (err) {
      console.error('Error saving recipe:', err)
      alert('Error saving recipe: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      navigate('/')
    } catch (err) {
      console.error('Error deleting recipe:', err)
      alert('Error deleting recipe: ' + err.message)
    }
  }

  function toggleDietaryTag(tagId) {
    setDietaryTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    )
  }

  async function handleAutoTag() {
    setAutoTagging(true)
    try {
      console.log('Recipe data being sent:', { title: recipe.title, content: recipe.content })
      const response = await fetch(
        'https://gnpzqjmeiusniabmxomt.supabase.co/functions/v1/auto-tag-recipe',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: recipe.title,
            content: recipe.content
          })
        }
      )

      if (!response.ok) {
        throw new Error('Failed to get AI suggestions')
      }

      const data = await response.json()
      console.log('Auto-tag response:', data)
      const suggested = data.tags || []
      console.log('Suggested tags:', suggested)
      
      if (suggested.length > 0) {
        setDietaryTags(suggested)
        alert(`AI suggested tags: ${suggested.join(', ')}\n\nReview and click Save Changes to apply.`)
      } else {
        alert('AI could not detect any dietary tags for this recipe.')
      }
    } catch (err) {
      console.error('Auto-tag error:', err)
      alert('Error getting AI suggestions. Please tag manually.')
    } finally {
      setAutoTagging(false)
    }
  }

  function handleFreezerItemToggle(itemId) {
    setUsedItems(prev => {
      const newUsed = { ...prev }
      if (newUsed[itemId]) {
        delete newUsed[itemId]
      } else {
        newUsed[itemId] = 1
      }
      return newUsed
    })
  }

  function handleQuantityChange(itemId, quantity) {
    setUsedItems(prev => ({
      ...prev,
      [itemId]: parseFloat(quantity) || 0
    }))
  }

  async function handleUpdateInventory() {
    if (Object.keys(usedItems).length === 0) {
      alert('Please select at least one freezer item to update.')
      return
    }

    try {
      setSaving(true)

      // Log each usage and update inventory
      for (const [itemId, quantity] of Object.entries(usedItems)) {
        const item = freezerItems.find(i => i.id === parseInt(itemId))
        if (!item || quantity <= 0) continue

        // Log the usage
        await supabase
          .from('recipe_usage_log')
          .insert([{
            user_telegram_id: USER_ID,
            recipe_id: parseInt(id),
            freezer_item_name: item.item_name,
            quantity_used: quantity
          }])

        // Update inventory (reduce quantity)
        const newQuantity = Math.max(0, item.quantity - quantity)
        await supabase
          .from('freezer_inventory')
          .update({ 
            quantity: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
      }

      // Reset used items and refresh
      setUsedItems({})
      fetchFreezerItems()
      alert('Freezer inventory updated successfully!')
    } catch (err) {
      console.error('Error updating inventory:', err)
      alert('Error updating inventory: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 max-w-md">
          Error loading recipe: {error || 'Recipe not found'}
          <button 
            onClick={() => navigate('/')}
            className="mt-4 block w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Back to Recipes
          </button>
        </div>
      </div>
    )
  }

  const metadata = typeof recipe.metadata === 'string' 
    ? JSON.parse(recipe.metadata || '{}') 
    : (recipe.metadata || {})
  
  const displayImageUrl = imageUrl || metadata.image_url || 'https://images.unsplash.com/photo-1495521841615-2621ee960588?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  const sourceUrl = metadata.source_url

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
          <div className="flex gap-3">
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recipe Image */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          {displayImageUrl ? (
            <div className="relative group">
              <img 
                src={displayImageUrl} 
                alt={recipe.title}
                className="w-full h-96 object-cover"
              />
              <button
                onClick={() => setEditingImage(true)}
                className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Change Image
              </button>
            </div>
          ) : (
            <div className="w-full h-96 bg-gray-200 flex items-center justify-center">
              <button
                onClick={() => setEditingImage(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                + Add Recipe Image
              </button>
            </div>
          )}
          
          {/* Image URL Input */}
          {editingImage && (
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/recipe-image.jpg"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  onClick={() => setEditingImage(false)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Done
                </button>
                {imageUrl && (
                  <button
                    onClick={() => {
                      setImageUrl('')
                      setEditingImage(false)
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Paste a URL to an image from the web, or right-click an image and copy its address.
              </p>
            </div>
          )}
        </div>

        {/* Recipe Details */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{recipe.title}</h1>
          
          {/* Source URL */}
          {sourceUrl && (
            <a 
              href={sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View Original Recipe
            </a>
          )}

          {/* Folder & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder
              </label>
              <select 
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">No Folder</option>
                {FOLDER_OPTIONS.map(folder => (
                  <option key={folder} value={folder}>{folder}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsTried(true)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isTried 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Tried
                </button>
                <button
                  onClick={() => setIsTried(false)}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    !isTried 
                      ? 'bg-gray-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Untried
                </button>
              </div>
            </div>
          </div>

          {/* Star Rating */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <label className="block text-lg font-bold text-gray-900 mb-2">
              ⭐ Your Rating
            </label>
            <p className="text-sm text-gray-600 mb-3">
              {rating === 0 ? 'Click to rate this recipe after you try it!' : `You rated this ${rating} star${rating > 1 ? 's' : ''}!`}
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-4xl transition-all transform hover:scale-110 ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400`}
                >
                  ★
                </button>
              ))}
              {rating > 0 && (
                <button 
                  onClick={() => setRating(0)}
                  className="ml-4 text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Clear rating
                </button>
              )}
            </div>
          </div>

          {/* Dietary Tags */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Dietary Tags
              </label>
              <button
                onClick={handleAutoTag}
                disabled={autoTagging}
                className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
              >
                {autoTagging ? <Loader2 className="w-4 h-4 animate-spin" /> : '✨'}
                {autoTagging ? 'Analyzing...' : 'Auto-Tag with AI'}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {DIETARY_OPTIONS.map(option => (
                <label 
                  key={option.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={dietaryTags.includes(option.id)}
                    onChange={() => toggleDietaryTag(option.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Recipe Content */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recipe</h2>
          <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
            {recipe.content || 'No recipe content available.'}
          </div>
        </div>

        {/* Freezer Components Used */}
        {freezerItems.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🧊 Freezer Components Used</h2>
            <p className="text-sm text-gray-600 mb-4">
              Check which freezer items you used for this recipe. Quantities will be automatically reduced.
            </p>
            <div className="space-y-3 mb-4">
              {freezerItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={!!usedItems[item.id]}
                    onChange={() => handleFreezerItemToggle(item.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.item_name}</div>
                    <div className="text-sm text-gray-500">
                      Available: {item.quantity} {item.unit}
                    </div>
                  </div>
                  {usedItems[item.id] !== undefined && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Used:</label>
                      <input
                        type="number"
                        min="0"
                        max={item.quantity}
                        step="0.5"
                        value={usedItems[item.id]}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <span className="text-sm text-gray-600">{item.unit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {Object.keys(usedItems).length > 0 && (
              <button
                onClick={handleUpdateInventory}
                disabled={saving}
                className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Updating...' : 'Update Inventory'}
              </button>
            )}
          </div>
        )}

        {/* Your Notes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Notes</h2>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Edit Notes
              </button>
            )}
          </div>
          
          {editingNotes ? (
            <>
              <textarea
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                placeholder="Add your personal notes here... What worked well? What modifications did you make? Would you make it again?"
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                autoFocus
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={async () => {
                    await handleSave()
                    setEditingNotes(false)
                  }}
                  disabled={saving}
                  className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Notes'}
                </button>
                <button
                  onClick={() => setEditingNotes(false)}
                  className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="min-h-[200px]">
              {userNotes ? (
                <div className="prose max-w-none text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {userNotes}
                </div>
              ) : (
                <div className="text-gray-400 italic text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  No notes yet. Click "Edit Notes" to add your thoughts about this recipe.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default RecipeDetailPage
