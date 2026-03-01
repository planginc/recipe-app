import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import FreezerInventoryPage from './pages/FreezerInventoryPage'
import BulkImportPage from './pages/BulkImportPage'
import InspirationPage from './pages/InspirationPage'
import PinGate from './components/PinGate'

function App() {
  return (
    <PinGate>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
        <Route path="/freezer" element={<FreezerInventoryPage />} />
        <Route path="/bulk-import" element={<BulkImportPage />} />
        <Route path="/inspiration" element={<InspirationPage />} />
      </Routes>
    </PinGate>
  )
}

export default App
