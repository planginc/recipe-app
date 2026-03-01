import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, Loader2, Plus, Edit2, Trash2, ExternalLink, ChefHat, X } from 'lucide-react'

const USER_ID = '6285585111'

function extractYouTubeId(url) {
  if (!url) return null
  // Handle youtube.com/shorts/ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/)
  if (shortsMatch) return shortsMatch[1]
  // Handle youtu.be/ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  if (shortMatch) return shortMatch[1]
  // Handle youtube.com/watch?v=ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/)
  if (watchMatch) return watchMatch[1]
  return null
}

function getThumbnailUrl(url) {
  const videoId = extractYouTubeId(url)
  if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
  return null
}

function InspirationPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)

  const [formData, setFormData] = useState({
    url: '',
    title: '',
    tags: '',
    notes: ''
  })

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [items, searchQuery])

  async function fetchItems() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('inspiration_videos')
        .select('*')
        .eq('user_telegram_id', USER_ID)
        .order('created_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching inspiration:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...items]
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item => {
        const title = (item.title || '').toLowerCase()
        const notes = (item.notes || '').toLowerCase()
        const tags = (item.tags || []).join(' ').toLowerCase()
        return title.includes(query) || notes.includes(query) || tags.includes(query)
      })
    }
    setFilteredItems(filtered)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean)

      const thumbnailUrl = getThumbnailUrl(formData.url)

      if (editingItem) {
        const { error } = await supabase
          .from('inspiration_videos')
          .update({
            url: formData.url,
            title: formData.title,
            tags: tagsArray,
            notes: formData.notes,
            thumbnail_url: thumbnailUrl || '',
            updated_at: new Date().toISOString()
          })
          .eq('id', editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('inspiration_videos')
          .insert([{
            user_telegram_id: USER_ID,
            url: formData.url,
            title: formData.title,
            tags: tagsArray,
            notes: formData.notes,
            thumbnail_url: thumbnailUrl || ''
          }])
        if (error) throw error
      }

      resetForm()
      fetchItems()
    } catch (err) {
      console.error('Error saving inspiration:', err)
      alert('Error saving: ' + err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this inspiration video?')) return
    try {
      const { error } = await supabase
        .from('inspiration_videos')
        .delete()
        .eq('id', id)
      if (error) throw error
      setExpandedItem(null)
      fetchItems()
    } catch (err) {
      console.error('Error deleting:', err)
      alert('Error deleting: ' + err.message)
    }
  }

  async function handlePromoteToRecipe(item) {
    if (!confirm(`Promote "${item.title}" to a full recipe? This will create a new recipe entry you can fill in.`)) return
    try {
      // Create a new recipe in the notes table
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          title: item.title,
          content: item.notes || 'Recipe from video inspiration. Watch the video and fill in details.',
          note_type: 'recipe',
          user_telegram_id: USER_ID,
          metadata: {
            source_url: item.url,
            source_type: 'inspiration_video',
            dietary_tags: [],
            category: [],
            tried_status: false,
            rating: 0,
            your_notes: item.notes ? [{ date: new Date().toISOString().split('T')[0], text: item.notes }] : []
          },
          tags: item.tags || []
        }])
        .select()

      if (error) throw error

      // Link back to the inspiration entry
      if (data && data[0]) {
        await supabase
          .from('inspiration_videos')
          .update({ promoted_to_recipe_id: data[0].id })
          .eq('id', item.id)
      }

      alert('Recipe created! Head to My Recipes to fill in the details.')
      fetchItems()
    } catch (err) {
      console.error('Error promoting:', err)
      alert('Error promoting to recipe: ' + err.message)
    }
  }

  function startEdit(item) {
    setEditingItem(item)
    setFormData({
      url: item.url || '',
      title: item.title || '',
      tags: (item.tags || []).join(', '),
      notes: item.notes || ''
    })
    setShowForm(true)
    setExpandedItem(null)
  }

  function resetForm() {
    setEditingItem(null)
    setFormData({ url: '', title: '', tags: '', notes: '' })
    setShowForm(false)
  }

  // Get all unique tags for display
  const allTags = [...new Set(items.flatMap(item => item.tags || []))].sort()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Recipes
          </button>
          <button
            onClick={() => {
              setShowForm(true)
              setEditingItem(null)
              setFormData({ url: '', title: '', tags: '', notes: '' })
            }}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Video
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💡 Inspiration</h1>
        <p className="text-gray-600 mb-6">
          {items.length} video{items.length !== 1 ? 's' : ''} saved
        </p>

        {/* Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
          <input
            type="text"
            placeholder="Search by name, tags, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
          />
          {/* Tag quick filters */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${
                    searchQuery === tag
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-amber-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Video' : 'Add New Video'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="https://youtube.com/shorts/..."
                  />
                  {formData.url && getThumbnailUrl(formData.url) && (
                    <img
                      src={getThumbnailUrl(formData.url)}
                      alt="Preview"
                      className="mt-2 w-40 h-24 object-cover rounded-lg"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    What do you call it? *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="e.g., crispy chicken thighs with garlic butter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="e.g., chicken, quick, cast iron, crispy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (what caught your eye?)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                    placeholder="e.g., used mayo on the skin for extra crisp, 400F for 35 min"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  type="submit"
                  className="bg-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors"
                >
                  {editingItem ? 'Update' : 'Save Video'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 mb-6">
            Error loading inspiration: {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {items.length === 0
              ? 'No videos saved yet. Start adding YouTube Shorts you like!'
              : 'No videos match your search.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const thumbnail = item.thumbnail_url || getThumbnailUrl(item.url)
              const isExpanded = expandedItem === item.id
              const isPromoted = !!item.promoted_to_recipe_id

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                    isPromoted ? 'border-green-200' : 'border-gray-100'
                  }`}
                >
                  {/* Thumbnail */}
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt={item.title}
                        className="w-full h-44 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.nextSibling.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-44 bg-gradient-to-br from-amber-100 to-amber-50 items-center justify-center ${
                        thumbnail ? 'hidden' : 'flex'
                      }`}
                    >
                      <span className="text-4xl">🎬</span>
                    </div>
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-gray-800 ml-1" />
                      </div>
                    </div>
                    {isPromoted && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        Promoted
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-2">
                      {item.title}
                    </h3>
                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                        {item.notes && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                            <p className="text-sm text-gray-700">{item.notes}</p>
                          </div>
                        )}
                        <div className="text-xs text-gray-400">
                          Added {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Watch
                          </a>
                          <button
                            onClick={() => startEdit(item)}
                            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          {!isPromoted && (
                            <button
                              onClick={() => handlePromoteToRecipe(item)}
                              className="flex items-center gap-1 text-xs bg-green-50 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                            >
                              <ChefHat className="w-3 h-3" />
                              Promote
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default InspirationPage
