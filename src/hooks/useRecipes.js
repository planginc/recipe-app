import { BACKEND } from '../lib/config'
import { useRecipes as useRecipesSupabase } from './backends/useRecipesSupabase'
import { useRecipes as useRecipesConvex } from './backends/useRecipesConvex'

// selectedImpl is determined once at module load (BACKEND is a build-time env constant).
// This means useRecipes() always calls the same underlying hook, satisfying Rules of Hooks.
const selectedImpl = BACKEND === 'convex' ? useRecipesConvex : useRecipesSupabase

export function useRecipes() {
  return selectedImpl()
}
