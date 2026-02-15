import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import FreezerInventoryPage from './pages/FreezerInventoryPage'
import BulkImportPage from './pages/BulkImportPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/recipe/:id" element={<RecipeDetailPage />} />
      <Route path="/freezer" element={<FreezerInventoryPage />} />
      <Route path="/bulk-import" element={<BulkImportPage />} />
    </Routes>
  )
}

export default App
