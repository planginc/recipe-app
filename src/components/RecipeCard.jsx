import { EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

function RecipeCard({ recipe, onClick, onHide }) {
  // Parse metadata if it's a string, otherwise use as is
  const metadata = typeof recipe.metadata === 'string'
    ? JSON.parse(recipe.metadata || '{}')
    : (recipe.metadata || {})

  const imageUrl = metadata.image_url || 'https://images.unsplash.com/photo-1495521841615-2621ee960588?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
  const rating = metadata.rating || 0
  const isTried = metadata.tried_status
  const categories = Array.isArray(metadata.category) ? metadata.category : (metadata.category ? [metadata.category] : [])

  async function handleHide(e) {
    e.stopPropagation()
    try {
      const currentMetadata = typeof recipe.metadata === 'string'
        ? JSON.parse(recipe.metadata || '{}')
        : (recipe.metadata || {})
      const updatedMetadata = { ...currentMetadata, hidden: true }
      const { error } = await supabase.from('notes').update({ metadata: updatedMetadata }).eq('id', recipe.id)
      if (error) throw error
      if (onHide) onHide(recipe.id)
    } catch (err) {
      alert('Error hiding: ' + err.message)
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-100 flex flex-col h-full group cursor-pointer relative"
    >
      <div className="relative h-48 overflow-hidden bg-gray-200">
        <img
          src={imageUrl}
          alt={recipe.title}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        />
        <button
          onClick={handleHide}
          className="absolute top-2 left-2 bg-gray-700/90 hover:bg-gray-800 text-white p-1.5 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
          title="Hide from view"
        >
          <EyeOff className="w-4 h-4" />
        </button>
        <div className="absolute top-2 right-2">
          {isTried ? (
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full border border-green-200 shadow-sm">
              Tried
            </span>
          ) : (
            <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2 py-1 rounded-full border border-gray-200 shadow-sm">
              Untried
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {categories.map(cat => (
              <span key={cat} className="inline-block text-xs font-semibold text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200 capitalize">
                {cat}
              </span>
            ))}
          </div>
        )}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {recipe.title}
        </h3>

        <div className="flex items-center mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={`text-sm ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}>
              ★
            </span>
          ))}
          {rating === 0 && <span className="text-xs text-gray-400 ml-2">Not rated</span>}
        </div>

        <div className="mt-auto flex flex-wrap gap-1">
          {/* Folder/Category Tag */}
          {metadata.physical_location && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {metadata.physical_location}
            </span>
          )}
          {/* Display Dietary Tags if available */}
          {metadata.dietary_tags && metadata.dietary_tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase font-medium">
              {tag}
            </span>
          ))}
          {metadata.dietary_tags && metadata.dietary_tags.length > 2 && (
            <span className="text-xs text-gray-400 px-2 py-1">
              +{metadata.dietary_tags.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default RecipeCard
