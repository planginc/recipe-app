import { useContext } from 'react'
import { ToastContext } from '../lib/toastContext'

export function useToast() {
  const addToast = useContext(ToastContext)
  if (!addToast) throw new Error('useToast must be used within a ToastProvider')
  return addToast
}
