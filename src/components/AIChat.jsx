import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Mic, Send, Loader2, X, MicOff } from 'lucide-react'
import { AI_CHAT_URL, USER_TELEGRAM_ID } from '../lib/config'

function AIChat() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [micAvailable, setMicAvailable] = useState(false)
  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false)
  const textareaRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100)
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setMessages([])
        setError(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isIOS && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = true
      setMicAvailable(true)

      recognitionRef.current.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript
          if (event.results[i].isFinal) final += text + ' '
          else interim += text
        }
        if (final && textareaRef.current) {
          const current = textareaRef.current.value.trim()
          textareaRef.current.value = current ? current + ' ' + final.trim() : final.trim()
          resizeTextarea()
        }
        setInterimText(interim)
      }

      recognitionRef.current.onerror = (event) => {
        if (event.error === 'no-speech') return
        isListeningRef.current = false
        setIsListening(false)
        setInterimText('')
      }

      recognitionRef.current.onend = () => {
        setInterimText('')
        if (isListeningRef.current) {
          try { recognitionRef.current.start() } catch { /* already started */ }
        } else {
          setIsListening(false)
        }
      }
    }
  }, [])

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      isListeningRef.current = false
      setIsListening(false)
      setInterimText('')
      recognitionRef.current.stop()
    } else {
      isListeningRef.current = true
      setIsListening(true)
      try { recognitionRef.current.start() } catch { /* already started */ }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!AI_CHAT_URL) {
      setError('AI chat URL not configured. Set VITE_AI_CHAT_URL in your .env.')
      return
    }

    if (isListeningRef.current) {
      isListeningRef.current = false
      setIsListening(false)
      setInterimText('')
      try { recognitionRef.current?.stop() } catch { /* not listening */ }
    }

    const query = textareaRef.current?.value?.trim() || ''
    if (!query) {
      setError('Please type or say something first.')
      return
    }

    const historyForApi = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, { role: 'user', content: query }])
    setLoading(true)
    setError(null)

    if (textareaRef.current) {
      textareaRef.current.value = ''
      resizeTextarea()
    }

    try {
      const res = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, history: historyForApi, userTelegramId: USER_TELEGRAM_ID }),
      })

      if (!res.ok) {
        let message = 'Failed to get recommendations'
        try { const d = await res.json(); message = d.error || message } catch { /* non-JSON response */ }
        throw new Error(message)
      }

      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, recommendations: data.recommendations || [] }])
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
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
        aria-label="Open AI recipe assistant"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl z-50 flex flex-col max-h-[600px]">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-bold">Recipe Assistant</h3>
        </div>
        <button onClick={() => { setIsOpen(false); setMessages([]); setError(null) }} className="hover:bg-white/20 p-1 rounded-lg transition-colors" aria-label="Close chat">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            <p className="mb-2">Hi! What are you in the mood for?</p>
            <p className="text-sm">Try asking:</p>
            <ul className="text-sm mt-2 space-y-1 text-left max-w-xs mx-auto">
              <li>• "Something easy with chicken"</li>
              <li>• "Quick dinner under 30 minutes"</li>
              <li>• "What can I make with my freezer stuff?"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-purple-600 text-white px-3 py-2 rounded-2xl rounded-tr-sm max-w-[80%] text-sm">{msg.content}</div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-purple-50 px-3 py-2 rounded-2xl rounded-tl-sm text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</div>
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="space-y-2">
                    {msg.recommendations.map((rec, ridx) => (
                      <div
                        key={ridx}
                        onClick={() => { navigate(`/recipe/${rec.recipe_id}`); setIsOpen(false) }}
                        className="bg-white border border-purple-200 p-3 rounded-lg cursor-pointer hover:border-purple-400 hover:shadow-md transition-all"
                      >
                        <h4 className="font-bold text-purple-900 mb-1">{rec.recipe_title}</h4>
                        <p className="text-sm text-gray-600">{rec.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-purple-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-gray-400">Thinking...</span>
          </div>
        )}

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!loading) handleSubmit(e) } }}
            placeholder={messages.length > 0 ? 'Follow up or ask something new...' : 'What are you in the mood for?'}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm resize-none overflow-hidden"
            style={{ minHeight: '72px' }}
            onInput={resizeTextarea}
            disabled={loading}
            inputMode="text"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck={true}
          />
          {micAvailable && (
            <button type="button" onClick={toggleListening} className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isListening ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} title={isListening ? 'Stop listening' : 'Use voice input'} aria-label={isListening ? 'Stop listening' : 'Use voice input'}>
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
          <button type="submit" disabled={loading} className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0" aria-label="Send message">
            <Send className="w-5 h-5" />
          </button>
        </div>
        {isListening && (
          <div className="mt-2 px-1">
            <p className="text-xs text-red-600 animate-pulse mb-1">Listening — tap mic to stop</p>
            {interimText && <p className="text-xs text-gray-500 italic">{interimText}</p>}
          </div>
        )}
      </form>
    </div>
  )
}

export default AIChat
