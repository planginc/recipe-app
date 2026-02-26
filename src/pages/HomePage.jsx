import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Loader2 } from 'lucide-react'
import RecipeCard from '../components/RecipeCard'
import AIChat from '../components/AIChat'
import CustomSelect from '../components/CustomSelect'
import { CATEGORY_OPTIONS } from '../lib/constants'

function HomePage() {
  const [recipes, setRecipes] = useState([])
  const [filteredRecipes, setFilteredRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [folderFilter, setFolderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dietaryFilter, setDietaryFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    fetchRecipes()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [recipes, searchQuery, folderFilter, statusFilter, dietaryFilter, categoryFilter])

  async function fetchRecipes() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('note_type', 'recipe')
        .order('id', { ascending: false })

      if (error) throw error
      setRecipes(data || [])
    } catch (err) {
      console.error('Error fetching recipes:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...recipes]

    // Hide hidden recipes unless specifically viewing them
    if (statusFilter === 'hidden') {
      filtered = filtered.filter(recipe => {
        const metadata = typeof recipe.metadata === 'string'
          ? JSON.parse(recipe.metadata || '{}')
          : (recipe.metadata || {})
        return metadata.hidden === true
      })
    } else {
      filtered = filtered.filter(recipe => {
        const metadata = typeof recipe.metadata === 'string'
          ? JSON.parse(recipe.metadata || '{}')
          : (recipe.metadata || {})
        return !metadata.hidden
      })
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(recipe => {
        const title = recipe.title?.toLowerCase() || ''
        const content = recipe.content?.toLowerCase() || ''
        const metadata = typeof recipe.metadata === 'string'
          ? JSON.parse(recipe.metadata || '{}')
          : (recipe.metadata || {})
        const tags = (metadata.dietary_tags || []).join(' ').toLowerCase()
        const folder = (metadata.physical_location || '').toLowerCase()
        const notes = (metadata.your_notes || '').toLowerCase()
        return title.includes(query) || content.includes(query) || tags.includes(query) || folder.includes(query) || notes.includes(query)
      })
    }

    // Folder filter
    if (folderFilter !== 'all') {
      filtered = filtered.filter(recipe => {
        const metadata = typeof recipe.metadata === 'string'
          ? JSON.parse(recipe.metadata || '{}')
          : (recipe.metadata || {})
        return metadata.physical_location === folderFilter
      })
    }

    // Status filter (tried/untried/stars — skip if 'hidden' since handled above)
    if (statusFilter !== 'all' && statusFilter !== 'hidden') {
      filtered = filtered.filter(recipe => {
        const metadata = typeof recipe.metadata === 'string'
          ? JSON.parse(recipe.metadata || '{}')
          : (recipe.metadata || {})

        if (statusFilter === 'tried') {
          return metadata.tried_status === true
        } else if (statusFilter === 'untried') {
          return !metadata.tried_status
        } else if (statusFilter.startsWith('stars-')) {
          const stars = parseInt(statusFilter.split('-')[1])
          return metadata.rating === stars
        }
        return true
      })
    }

    // Dietary filter
    if (dietaryFilter !== 'all') {
      filtered = filtered.filter(recipe => {
        const metadata = typeof recipe.metadata === 'string'
          ? JSON.parse(recipe.metadata || '{}')
          : (recipe.metadata || {})
        const dietaryTags = metadata.dietary_tags || []
        return dietaryTags.includes(dietaryFilter)
      })
    }

    // Category filter — supports both array and string formats
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(recipe => {
        const metadata = typeof recipe.metadata === 'string'
          ? JSON.parse(recipe.metadata || '{}')
          : (recipe.metadata || {})
        const cats = Array.isArray(metadata.category) ? metadata.category : (metadata.category ? [metadata.category] : [])
        return cats.includes(categoryFilter)
      })
    }

    setFilteredRecipes(filtered)
  }

  // Get unique folders for dropdown
  const folders = [...new Set(recipes.map(recipe => {
    const metadata = typeof recipe.metadata === 'string'
      ? JSON.parse(recipe.metadata || '{}')
      : (recipe.metadata || {})
    return metadata.physical_location
  }).filter(Boolean))].sort()

  // Get unique categories for dropdown
  const categories = [...new Set(recipes.map(recipe => {
    const metadata = typeof recipe.metadata === 'string'
      ? JSON.parse(recipe.metadata || '{}')
      : (recipe.metadata || {})
    return metadata.category
  }).filter(Boolean))].sort()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => {
              setSearchQuery('')
              setFolderFilter('all')
              setStatusFilter('all')
              setDietaryFilter('all')
              setCategoryFilter('all')
              navigate('/')
            }}
            className="text-2xl font-bold text-gray-900 tracking-tight hover:text-blue-700 transition-colors cursor-pointer"
          >
            🏠 My Recipes
          </button>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/freezer')}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              🧊 Manage Freezer
            </button>
            <button 
              onClick={() => navigate('/bulk-import')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + Bulk Import
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-8 border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <CustomSelect
              value={folderFilter}
              onChange={setFolderFilter}
              placeholder="All Folders"
              wideDropdown
              options={[
                { value: 'all', label: 'All Folders' },
                ...folders.map(f => ({ value: f, label: f }))
              ]}
            />
            <CustomSelect
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Status"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'tried', label: 'Tried' },
                { value: 'untried', label: 'Untried' },
                { value: 'stars-5', label: '5 Stars' },
                { value: 'stars-4', label: '4 Stars' },
                { value: 'stars-3', label: '3 Stars' },
                { value: 'stars-2', label: '2 Stars' },
                { value: 'stars-1', label: '1 Star' },
                { value: 'hidden', label: 'Hidden' },
              ]}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <CustomSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="All Categories"
              options={[
                { value: 'all', label: 'All Categories' },
                ...CATEGORY_OPTIONS.map(opt => ({ value: opt.id, label: opt.label }))
              ]}
            />
            <CustomSelect
              value={dietaryFilter}
              onChange={setDietaryFilter}
              placeholder="All Dietary"
              options={[
                { value: 'all', label: 'All Dietary' },
                { value: 'keto', label: 'Keto' },
                { value: 'low-carb', label: 'Low-Carb' },
                { value: 'paleo', label: 'Paleo' },
                { value: 'whole30', label: 'Whole30' },
                { value: 'gluten-free', label: 'Gluten-Free' },
                { value: 'vegetarian', label: 'Vegetarian' },
                { value: 'dairy-free', label: 'Dairy-Free' },
                { value: 'high-protein', label: 'High-Protein' },
              ]}
            />
          </div>
        </div>

        {/* Results count */}
        {!loading && !error && (
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredRecipes.length} of {recipes.length} recipes
          </div>
        )}

        {/* Content Area */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
            Error loading recipes: {error}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {recipes.length === 0 ? 'No recipes found. Try adding some!' : 'No recipes match your filters.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                onHide={(id) => setRecipes(prev => prev.filter(r => r.id !== id))}
              />
            ))}
          </div>
        )}
      </main>
      
      {/* AI Chat Assistant */}
      <AIChat />
    </div>
  )
}

export default HomePage
