import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Loader2 } from 'lucide-react'
import RecipeCard from '../components/RecipeCard'
import AIChat from '../components/AIChat'

function HomePage() {
  const [recipes, setRecipes] = useState([])
  const [filteredRecipes, setFilteredRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [folderFilter, setFolderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dietaryFilter, setDietaryFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    fetchRecipes()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [recipes, searchQuery, folderFilter, statusFilter, dietaryFilter])

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

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(recipe => {
        const title = recipe.title?.toLowerCase() || ''
        const content = recipe.content?.toLowerCase() || ''
        const tags = recipe.tags?.join(' ').toLowerCase() || ''
        return title.includes(query) || content.includes(query) || tags.includes(query)
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

    // Status filter
    if (statusFilter !== 'all') {
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

    setFilteredRecipes(filtered)
  }

  // Get unique folders for dropdown
  const folders = [...new Set(recipes.map(recipe => {
    const metadata = typeof recipe.metadata === 'string' 
      ? JSON.parse(recipe.metadata || '{}') 
      : (recipe.metadata || {})
    return metadata.physical_location
  }).filter(Boolean))].sort()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            🏠 My Recipes
          </h1>
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
            <select 
              value={folderFilter}
              onChange={(e) => setFolderFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">All Folders</option>
              {folders.map(folder => (
                <option key={folder} value={folder}>{folder}</option>
              ))}
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">All Status</option>
              <option value="tried">Tried</option>
              <option value="untried">Untried</option>
              <option value="stars-5">5 Stars</option>
              <option value="stars-4">4 Stars</option>
              <option value="stars-3">3 Stars</option>
              <option value="stars-2">2 Stars</option>
              <option value="stars-1">1 Star</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <select 
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="all">All Dietary</option>
              <option value="keto">Keto</option>
              <option value="low-carb">Low-Carb</option>
              <option value="paleo">Paleo</option>
              <option value="whole30">Whole30</option>
              <option value="gluten-free">Gluten-Free</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="dairy-free">Dairy-Free</option>
              <option value="high-protein">High-Protein</option>
            </select>
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
