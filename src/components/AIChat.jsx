import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Mic, Send, Loader2, X, MicOff } from 'lucide-react'

function AIChat() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    // Initialize Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        setIsListening(false)
      }
      
      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser. Please use Chrome, Safari, or Edge.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('https://gnpzqjmeiusniabmxomt.supabase.co/functions/v1/recipe-ai-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to get recommendations')
      }

      const data = await res.json()
      setResponse(data)
    } catch (err) {
      console.error('AI Chat error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50"
        title="Ask AI for recipe suggestions"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-bold">Recipe Assistant</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-white/20 p-1 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!response && !loading && (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">👋 Hi! What are you in the mood for?</p>
            <p className="text-sm">Try asking:</p>
            <ul className="text-sm mt-2 space-y-1 text-left max-w-xs mx-auto">
              <li>• "Something easy with chicken"</li>
              <li>• "Quick dinner under 30 minutes"</li>
              <li>• "What can I make with my freezer stuff?"</li>
            </ul>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {response && (
          <div className="space-y-4">
            {/* AI Message */}
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-gray-800 text-sm whitespace-pre-wrap">{response.message}</p>
            </div>

            {/* Recipe Recommendations */}
            {response.recommendations && response.recommendations.length > 0 && (
              <div className="space-y-2">
                {response.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      navigate(`/recipe/${rec.recipe_id}`)
                      setIsOpen(false)
                    }}
                    className="bg-white border border-purple-200 p-3 rounded-lg cursor-pointer hover:border-purple-400 hover:shadow-md transition-all"
                  >
                    <h4 className="font-bold text-purple-900 mb-1">{rec.recipe_title}</h4>
                    <p className="text-sm text-gray-600">{rec.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Ask another question */}
            <button
              onClick={() => {
                setResponse(null)
                setQuery('')
              }}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              Ask another question
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you in the mood for?"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm"
            disabled={loading}
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={isListening ? 'Stop listening' : 'Use voice input'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        {isListening && (
          <p className="text-xs text-red-600 mt-2 text-center animate-pulse">
            🎤 Listening...
          </p>
        )}
      </form>
    </div>
  )
}

export default AIChat
