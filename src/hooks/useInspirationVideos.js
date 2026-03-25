import { BACKEND } from '../lib/config'
import { useInspirationVideos as useInspirationVideosSupabase } from './backends/useInspirationVideosSupabase'
import { useInspirationVideos as useInspirationVideosConvex } from './backends/useInspirationVideosConvex'

const selectedImpl = BACKEND === 'convex' ? useInspirationVideosConvex : useInspirationVideosSupabase

export function useInspirationVideos() {
  return selectedImpl()
}
