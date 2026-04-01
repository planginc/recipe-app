import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'

const BACKEND = import.meta.env.VITE_DB_BACKEND || 'supabase'

async function init() {
  let Wrapper = ({ children }) => children

  if (BACKEND === 'convex') {
    const { ConvexProvider, ConvexReactClient } = await import('convex/react')
    const client = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)
    Wrapper = ({ children }) => <ConvexProvider client={client}>{children}</ConvexProvider>
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <Wrapper>
          <ToastProvider>
            <App />
          </ToastProvider>
        </Wrapper>
      </BrowserRouter>
    </StrictMode>,
  )
}

init()
