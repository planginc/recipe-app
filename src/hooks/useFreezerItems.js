import { BACKEND } from '../lib/config'
import { useFreezerItems as useFreezerItemsSupabase } from './backends/useFreezerItemsSupabase'
import { useFreezerItems as useFreezerItemsConvex } from './backends/useFreezerItemsConvex'

const selectedImpl = BACKEND === 'convex' ? useFreezerItemsConvex : useFreezerItemsSupabase

export function useFreezerItems() {
  return selectedImpl()
}
