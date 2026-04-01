import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Search, Menu, X } from 'lucide-react'
import RecipeCard from '../components/RecipeCard'
import AIChat from '../components/AIChat'
import CustomSelect from '../components/CustomSelect'
import { CATEGORY_OPTIONS } from '../lib/constants'
import { useRecipes } from '../hooks/useRecipes'
import { parseMetadata } from '../lib/parseMetadata'

function HomePage() {
  const { data: recipes, loading, error, updateRecipe } = useRecipes()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dietaryFilter, setDietaryFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  // Parse metadata once per recipe
  const recipesWithMeta = useMemo(() =>
    recipes.map(r => ({ ...r, _meta: parseMetadata(r) })),
    [recipes]
  )

  const filteredRecipes = useMemo(() => {
    let filtered = [...recipesWithMeta]

    if (statusFilter === 'hidden') {
      filtered = filtered.filter(r => r._meta.hidden === true)
    } else {
      filtered = filtered.filter(r => !r._meta.hidden)
    }

    if (activeSearch.trim()) {
      const query = activeSearch.toLowerCase()
      filtered = filtered.filter(r => {
        const title = r.title?.toLowerCase() || ''
        const content = r.content?.toLowerCase() || ''
        const tags = (r._meta.dietary_tags || []).join(' ').toLowerCase()
        const folder = (r._meta.physical_location || '').toLowerCase()
        const yourNotes = r._meta.your_notes
        const notes = Array.isArray(yourNotes)
          ? yourNotes.map(n => n.text || '').join(' ').toLowerCase()
          : (yourNotes || '').toLowerCase()
        return title.includes(query) || content.includes(query) || tags.includes(query) || folder.includes(query) || notes.includes(query)
      })
    }

    if (folderFilter !== 'all') {
      filtered = filtered.filter(r => r._meta.physical_location === folderFilter)
    }

    if (statusFilter !== 'all' && statusFilter !== 'hidden') {
      filtered = filtered.filter(r => {
        if (statusFilter === 'tried') return r._meta.tried_status === true
        if (statusFilter === 'untried') return !r._meta.tried_status
        if (statusFilter.startsWith('stars-')) {
          const stars = parseInt(statusFilter.split('-')[1])
          return r._meta.rating === stars
        }
        return true
      })
    }

    if (dietaryFilter !== 'all') {
      filtered = filtered.filter(r => (r._meta.dietary_tags || []).includes(dietaryFilter))
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(r => {
        const cats = Array.isArray(r._meta.category) ? r._meta.category : (r._meta.category ? [r._meta.category] : [])
        return cats.includes(categoryFilter)
      })
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.title || '').localeCompare(b.title || '')
        case 'name-desc':
          return (b.title || '').localeCompare(a.title || '')
        case 'rating':
          return (b._meta.rating || 0) - (a._meta.rating || 0)
        case 'tried':
          return (b._meta.tried_status ? 1 : 0) - (a._meta.tried_status ? 1 : 0)
        case 'newest':
        default:
          return (b.created_at || '').localeCompare(a.created_at || '')
      }
    })

    return filtered
  }, [recipesWithMeta, activeSearch, folderFilter, statusFilter, dietaryFilter, categoryFilter, sortBy])

  const folders = [...new Set(recipesWithMeta.map(r => r._meta.physical_location).filter(Boolean))].sort()

  function handleSearch() {
    setActiveSearch(searchQuery)
  }

  function clearSearch() {
    setSearchQuery('')
    setActiveSearch('')
  }

  function resetAll() {
    setSearchQuery('')
    setActiveSearch('')
    setFolderFilter('all')
    setStatusFilter('all')
    setDietaryFilter('all')
    setCategoryFilter('all')
    setSortBy('newest')
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={resetAll}
            className="text-2xl font-bold text-gray-900 tracking-tight hover:text-blue-700 transition-colors cursor-pointer"
          >
            My Recipes
          </button>

          {/* Desktop nav */}
          <div className="hidden sm:flex gap-3">
            <button onClick={() => navigate('/inspiration')} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
              Inspiration
            </button>
            <button onClick={() => navigate('/freezer')} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
              Freezer
            </button>
            <button onClick={() => navigate('/bulk-import')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + Import
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 text-gray-600 hover:text-gray-900"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-2 bg-white">
            <button onClick={() => { navigate('/inspiration'); setMobileMenuOpen(false) }} className="bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
              Inspiration
            </button>
            <button onClick={() => { navigate('/freezer'); setMobileMenuOpen(false) }} className="bg-purple-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
              Freezer
            </button>
            <button onClick={() => { navigate('/bulk-import'); setMobileMenuOpen(false) }} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              + Import
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-4 rounded-xl shadow-sm mb-8 border border-gray-100">
          {/* Search bar with button */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              {activeSearch && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-4">
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
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              placeholder="Sort By"
              options={[
                { value: 'newest', label: 'Newest First' },
                { value: 'name-asc', label: 'Name A-Z' },
                { value: 'name-desc', label: 'Name Z-A' },
                { value: 'rating', label: 'Highest Rated' },
                { value: 'tried', label: 'Tried First' },
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

        {!loading && !error && (
          <div className="text-sm text-gray-600 mb-4">
            Showing {filteredRecipes.length} of {recipes.length} recipes
            {activeSearch && <span className="ml-1">for "<strong>{activeSearch}</strong>"</span>}
          </div>
        )}

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
            {recipes.length === 0 ? 'No recipes yet. Try adding some!' : 'No recipes match your filters.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                onClick={() => navigate(`/recipe/${recipe.id}`)}
                onHide={(id) => updateRecipe(id, { metadata: { ...recipe._meta, hidden: true } })}
              />
            ))}
          </div>
        )}
      </main>

      <AIChat />
    </div>
  )
}

export default HomePage
