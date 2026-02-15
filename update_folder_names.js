import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gnpzqjmeiusniabmxomt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImducHpxam1laXVzbmlhYm14b210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3Nzc1NDAsImV4cCI6MjA2MzM1MzU0MH0.JnL0eLrvcJ3Fo2eEkMM9pHvX6VKfJmgxy9gJNEnV_84'

const supabase = createClient(supabaseUrl, supabaseKey)

const FOLDER_MAP = {
  '1': 'Folder 1 - Chicken & Poultry',
  '2': 'Folder 2 - Beef',
  '3': 'Folder 3 - Pork & Lamb',
  '4': 'Folder 4 - Fish & Seafood',
  '5': 'Folder 5 - Eggs',
  '6': 'Folder 6 - Beans & Legumes',
  '7': 'Folder 7 - Pasta & Noodles',
  '8': 'Folder 8 - Rice & Grains',
  '9': 'Folder 9 - Potatoes',
  '10': 'Folder 10 - Vegetable Mains',
  '11': 'Folder 11 - Salads',
  '12': 'Folder 12 - Soups & Stews',
  '13': 'Folder 13 - Dressings, Sauces & Marinades',
  '14': 'Folder 14 - Dips & Spreads',
  '15': 'Folder 15 - Bread & Baking',
  '16': 'Folder 16 - Breakfast Items',
  '17': 'Folder 17 - Desserts & Sweets',
  '18': 'Folder 18 - Beverages & Smoothies',
  '19': 'Folder 19 - Snacks & Appetizers',
  '20': 'Folder 20 - Condiments & Preserves'
}

async function main() {
  console.log('🔍 Fetching all recipes...\n')
  
  const { data: recipes, error } = await supabase
    .from('notes')
    .select('id, title, metadata')
    .eq('note_type', 'recipe')
    .eq('user_telegram_id', '6285585111')

  if (error) {
    console.error('Error fetching recipes:', error)
    return
  }

  console.log(`Found ${recipes.length} recipes\n`)

  let updateCount = 0
  let skipCount = 0

  for (const recipe of recipes) {
    const metadata = typeof recipe.metadata === 'string' 
      ? JSON.parse(recipe.metadata || '{}')
      : (recipe.metadata || {})

    const currentFolder = metadata.physical_location

    if (!currentFolder) {
      console.log(`⏭️  Skipping "${recipe.title}" - no folder assigned`)
      skipCount++
      continue
    }

    // Extract folder number from current folder name
    const folderMatch = currentFolder.match(/Folder (\d+)/)
    if (!folderMatch) {
      console.log(`⏭️  Skipping "${recipe.title}" - not a numbered folder: ${currentFolder}`)
      skipCount++
      continue
    }

    const folderNum = folderMatch[1]
    const standardName = FOLDER_MAP[folderNum]

    if (!standardName) {
      console.log(`⚠️  Unknown folder number ${folderNum} for "${recipe.title}"`)
      skipCount++
      continue
    }

    // Check if already using standard name
    if (currentFolder === standardName) {
      console.log(`✓ "${recipe.title}" already has standard name: ${standardName}`)
      skipCount++
      continue
    }

    // Update to standard name
    const updatedMetadata = {
      ...metadata,
      physical_location: standardName
    }

    const { error: updateError } = await supabase
      .from('notes')
      .update({ metadata: updatedMetadata })
      .eq('id', recipe.id)

    if (updateError) {
      console.error(`❌ Error updating "${recipe.title}":`, updateError.message)
    } else {
      console.log(`✅ Updated "${recipe.title}": "${currentFolder}" → "${standardName}"`)
      updateCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log(`✅ Updated: ${updateCount} recipes`)
  console.log(`⏭️  Skipped: ${skipCount} recipes (already correct or no folder)`)
  console.log(`📊 Total processed: ${recipes.length} recipes`)
  console.log('='.repeat(60))
}

main()
