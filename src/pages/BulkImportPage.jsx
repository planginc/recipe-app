import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, Loader2, CheckCircle, XCircle } from 'lucide-react'

const USER_ID = '6285585111'

function BulkImportPage() {
  const navigate = useNavigate()
  const [urls, setUrls] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState([])
  const [defaultFolder, setDefaultFolder] = useState('Folder 1 - Chicken & Poultry')

  async function handleImport() {
    const urlList = urls.split('\n').filter(url => url.trim())
    
    if (urlList.length === 0) {
      alert('Please paste at least one recipe URL')
      return
    }

    setImporting(true)
    setResults([])

    const importResults = []

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i].trim()
      
      setResults(prev => [...prev, {
        url,
        status: 'processing',
        message: `Processing ${i + 1} of ${urlList.length}...`
      }])

      try {
        // Fetch the recipe page directly
        const response = await fetch(url)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const html = await response.text()
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')
        
        // Extract title
        let title = doc.querySelector('meta[property="og:title"]')?.content ||
                    doc.querySelector('title')?.textContent ||
                    'Untitled Recipe'
        title = title.replace(' - AllRecipes', '').replace(' | Food Network', '').trim()
        
        // Extract image
        const image_url = doc.querySelector('meta[property="og:image"]')?.content ||
                          doc.querySelector('meta[name="twitter:image"]')?.content ||
                          ''
        
        // Extract description/content
        const description = doc.querySelector('meta[property="og:description"]')?.content ||
                           doc.querySelector('meta[name="description"]')?.content ||
                           ''
        
        const data = { title, image_url, content: description }

        // Insert into Supabase
        const { error: insertError } = await supabase
          .from('notes')
          .insert([{
            user_telegram_id: USER_ID,
            title: data.title,
            content: data.content,
            category: 'RESOURCES',
            note_type: 'recipe',
            tags: [],
            metadata: {
              source_url: url,
              image_url: data.image_url,
              tried_status: false,
              rating: 0,
              physical_location: defaultFolder,
              dietary_tags: [],
              your_notes: ''
            }
          }])

        if (insertError) throw insertError

        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'success', message: `✓ ${data.title}` } : r
        ))
        importResults.push({ url, success: true })
      } catch (err) {
        console.error('Import error:', err)
        setResults(prev => prev.map((r, idx) => 
          idx === i ? { ...r, status: 'error', message: `✗ ${err.message}` } : r
        ))
        importResults.push({ url, success: false, error: err.message })
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    setImporting(false)
    
    const successCount = importResults.filter(r => r.success).length
    alert(`Import complete!\n${successCount} of ${urlList.length} recipes imported successfully.`)
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
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📥 Bulk Import Recipes</h1>
        <p className="text-gray-600 mb-8">
          Paste recipe URLs below (one per line) to import them all at once.
        </p>

        {/* Import Form */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Folder (optional)
            </label>
            <select
              value={defaultFolder}
              onChange={(e) => setDefaultFolder(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">No Folder</option>
              <option value="Folder 1 - Chicken & Poultry">Folder 1 - Chicken & Poultry</option>
              <option value="Folder 2 - Beef">Folder 2 - Beef</option>
              <option value="Folder 3 - Pork">Folder 3 - Pork</option>
              <option value="Folder 4 - Seafood">Folder 4 - Seafood</option>
              <option value="Folder 5 - Soups & Stews">Folder 5 - Soups & Stews</option>
              <option value="Folder 6 - Salads">Folder 6 - Salads</option>
              <option value="Folder 7 - Sides">Folder 7 - Sides</option>
              <option value="Folder 8 - Desserts">Folder 8 - Desserts</option>
              <option value="Folder 9 - Breakfast">Folder 9 - Breakfast</option>
              <option value="Folder 10 - Appetizers">Folder 10 - Appetizers</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipe URLs
            </label>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              disabled={importing}
              placeholder="https://www.allrecipes.com/recipe/12345/example-recipe/
https://www.foodnetwork.com/recipes/another-recipe
https://tasty.co/recipe/third-recipe"
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              Paste one URL per line. Supports AllRecipes, Food Network, Tasty, and most recipe sites.
            </p>
          </div>

          <button
            onClick={handleImport}
            disabled={importing || !urls.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {importing ? 'Importing...' : 'Import All Recipes'}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Import Progress</h2>
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  {result.status === 'processing' && (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  {result.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  )}
                  {result.status === 'error' && (
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 truncate">{result.url}</div>
                    <div className={`text-sm font-medium ${
                      result.status === 'success' ? 'text-green-700' :
                      result.status === 'error' ? 'text-red-700' :
                      'text-gray-700'
                    }`}>
                      {result.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">💡 How to use:</h3>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Find recipes on your favorite recipe websites</li>
            <li>Copy the URLs (one at a time or all together)</li>
            <li>Paste them in the box above (one URL per line)</li>
            <li>Choose a default folder if you want</li>
            <li>Click "Import All Recipes"</li>
            <li>The app will fetch each recipe's title, image, and content automatically</li>
            <li>All recipes will be marked as "Untried" - you can organize them later!</li>
          </ol>
        </div>
      </main>
    </div>
  )
}

export default BulkImportPage
