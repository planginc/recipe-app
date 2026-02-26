import { useState } from 'react'

const CORRECT_PIN = '6502'

function PinGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem('recipe-app-unlocked') === 'true'
  })
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem('recipe-app-unlocked', 'true')
      setUnlocked(true)
    } else {
      setError(true)
      setPin('')
    }
  }

  if (unlocked) return children

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Pam's Recipe Box</h1>
        <p className="text-gray-500 mb-6 text-sm">Enter PIN to continue</p>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false) }}
          placeholder="••••"
          autoFocus
          className={`w-32 mx-auto block text-center text-2xl tracking-[0.5em] px-4 py-3 border-2 rounded-lg outline-none transition-colors ${
            error ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-amber-400'
          }`}
        />
        {error && <p className="text-red-500 text-sm mt-2">Wrong PIN</p>}
        <button
          type="submit"
          className="mt-6 w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          Enter
        </button>
      </form>
    </div>
  )
}

export default PinGate
