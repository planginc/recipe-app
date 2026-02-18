import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, Loader2, ExternalLink, Save, Trash2, Plus, X } from 'lucide-react'
import { FOLDER_OPTIONS, DIETARY_OPTIONS } from '../lib/constants'

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
  const [notes, setNotes] = useState([])
  const [newNoteText, setNewNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [editingImage, setEditingImage] = useState(false)
  const [autoTagging, setAutoTagging] = useState(false)

  useEffect(() => {
    fetchRecipe()
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
      setImageUrl(metadata.image_url || '')

      // Parse notes — migrate from old string format to dated entries
      const rawNotes = metadata.your_notes
      if (Array.isArray(rawNotes)) {
        setNotes(rawNotes)
      } else if (rawNotes && typeof rawNotes === 'string') {
        setNotes([{ date: null, text: rawNotes }])
      } else {
        setNotes([])
      }
    } catch (err) {
      console.error('Error fetching recipe:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(notesOverride) {
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
        your_notes: Array.isArray(notesOverride) ? notesOverride : notes,
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
        const merged = [...new Set([...dietaryTags, ...suggested])]
        setDietaryTags(merged)
        const newTags = suggested.filter(t => !dietaryTags.includes(t))
        alert(`AI added tags: ${newTags.length > 0 ? newTags.join(', ') : '(none new)'}${newTags.length < suggested.length ? `\nAlready had: ${suggested.filter(t => dietaryTags.includes(t)).join(', ')}` : ''}\n\nReview and click Save Changes to apply.`)
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

  function handleAddNote() {
    if (!newNoteText.trim()) return
    const entry = {
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      text: newNoteText.trim()
    }
    setNotes(prev => [entry, ...prev])
    setNewNoteText('')
    setAddingNote(false)
  }

  function handleDeleteNote(index) {
    const updatedNotes = notes.filter((_, i) => i !== index)
    setNotes(updatedNotes)
    handleSave(updatedNotes)
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

        {/* Your Notes */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Your Notes</h2>
            {!addingNote && (
              <button
                onClick={() => setAddingNote(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Note
              </button>
            )}
          </div>

          {/* Add Note Form */}
          {addingNote && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-800 mb-2">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
              <textarea
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="What worked well? What would you change next time?"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                autoFocus
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => {
                    const entry = {
                      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                      text: newNoteText.trim()
                    }
                    const updatedNotes = [entry, ...notes]
                    setNotes(updatedNotes)
                    setNewNoteText('')
                    setAddingNote(false)
                    handleSave(updatedNotes)
                  }}
                  disabled={saving || !newNoteText.trim()}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
                <button
                  onClick={() => { setAddingNote(false); setNewNoteText('') }}
                  className="px-5 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Notes List */}
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">
                      {note.date || 'Undated'}
                    </span>
                    <button
                      onClick={() => handleDeleteNote(idx)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete note"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">{note.text}</div>
                </div>
              ))}
            </div>
          ) : !addingNote && (
            <div className="text-gray-400 italic text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              No notes yet. Click "Add Note" to jot down your thoughts about this recipe.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default RecipeDetailPage
