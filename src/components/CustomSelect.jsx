import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

function CustomSelect({ value, onChange, options, placeholder, wideDropdown }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectedLabel = options.find(o => o.value === value)?.label || placeholder

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-left w-full flex items-center justify-between gap-2 text-sm"
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={`absolute z-50 mt-1 min-w-full rounded-lg border border-amber-200 shadow-lg overflow-hidden ${wideDropdown ? 'w-max max-w-[22rem]' : ''}`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                value === option.value
                  ? 'bg-amber-200 text-amber-900 font-medium'
                  : 'bg-amber-50 text-gray-800 hover:bg-amber-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
