import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

const supabaseUrl = 'https://gnpzqjmeiusniabmxomt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImducHpxam1laXVzbmlhYm14b210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Nzc1NDAsImV4cCI6MjA2MzM1MzU0MH0.JnL0eLrvcJ3Fo2eEkMM9pHvX6VKfJmgxy9gJNEnV_84'

const supabase = createClient(supabaseUrl, supabaseKey)

async function extractImageUrl(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Try Open Graph image first
    let imageUrl = $('meta[property="og:image"]').attr('content')
    
    // Fallback to twitter:image
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr('content')
    }
    
    // Fallback to first large image
    if (!imageUrl) {
      const imgs = $('img').toArray()
      for (const img of imgs) {
        const src = $(img).attr('src')
        if (src && !src.includes('logo') && !src.includes('icon')) {
          imageUrl = src
          break
        }
      }
    }
    
    // Make sure it's an absolute URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url)
      imageUrl = new URL(imageUrl, baseUrl.origin).toString()
    }
    
    return imageUrl
  } catch (err) {
    console.error(`  ❌ Error fetching ${url}: ${err.message}`)
    return null
  }
}

async function main() {
  console.log('🔍 Fetching recipes that need images...\n')
  
  // Get all recipes with source_url but no image_url
  const { data: recipes, error } = await supabase
    .from('notes')
    .select('id, title, metadata')
    .eq('note_type', 'recipe')
    .eq('user_telegram_id', '6285585111')
  
  if (error) {
    console.error('Error querying recipes:', error)
    return
  }
  
  // Filter for recipes that have source_url but no image_url
  const recipesNeedingImages = recipes.filter(recipe => {
    const metadata = typeof recipe.metadata === 'string' 
      ? JSON.parse(recipe.metadata || '{}')
      : (recipe.metadata || {})
    return metadata.source_url && !metadata.image_url
  })
  
  console.log(`Found ${recipesNeedingImages.length} recipes with source URLs but no images\n`)
  
  let successCount = 0
  let failCount = 0
  
  for (let i = 0; i < recipesNeedingImages.length; i++) {
    const recipe = recipesNeedingImages[i]
    const metadata = typeof recipe.metadata === 'string' 
      ? JSON.parse(recipe.metadata || '{}')
      : (recipe.metadata || {})
    
    console.log(`[${i + 1}/${recipesNeedingImages.length}] ${recipe.title}`)
    console.log(`  🌐 ${metadata.source_url}`)
    
    const imageUrl = await extractImageUrl(metadata.source_url)
    
    if (imageUrl) {
      // Update the recipe with the image URL
      const updatedMetadata = {
        ...metadata,
        image_url: imageUrl
      }
      
      const { error: updateError } = await supabase
        .from('notes')
        .update({ metadata: updatedMetadata })
        .eq('id', recipe.id)
      
      if (updateError) {
        console.log(`  ❌ Failed to update database: ${updateError.message}`)
        failCount++
      } else {
        console.log(`  ✅ Added image: ${imageUrl.substring(0, 60)}...`)
        successCount++
      }
    } else {
      console.log(`  ⚠️  No image found`)
      failCount++
    }
    
    console.log('')
    
    // Small delay to be nice to servers
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`✅ Successfully added images: ${successCount}`)
  console.log(`❌ Failed or no image found: ${failCount}`)
  console.log(`📊 Total processed: ${recipesNeedingImages.length}`)
  console.log('='.repeat(60))
}

main()
