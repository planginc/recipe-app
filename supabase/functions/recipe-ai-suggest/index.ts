import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const userId = '6285585111'

    // Fetch recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('notes')
      .select('id, title, content, metadata')
      .eq('note_type', 'recipe')

    if (recipesError) throw recipesError

    // Fetch freezer inventory
    const { data: freezerItems, error: freezerError } = await supabase
      .from('freezer_inventory')
      .select('*')
      .eq('user_telegram_id', userId)

    if (freezerError) throw freezerError

    // Parse recipe metadata and build context
    const recipeContext = recipes.map(recipe => {
      const metadata = typeof recipe.metadata === 'string' 
        ? JSON.parse(recipe.metadata || '{}')
        : (recipe.metadata || {})
      
      // Support both old string notes and new dated array format
      const rawNotes = metadata.your_notes
      let notesText = ''
      if (Array.isArray(rawNotes)) {
        notesText = rawNotes.map(n => `${n.date || 'Undated'}: ${n.text}`).join(' | ')
      } else if (rawNotes) {
        notesText = rawNotes
      }

      return {
        id: recipe.id,
        title: recipe.title,
        rating: metadata.rating || 0,
        tried: metadata.tried_status || false,
        dietary_tags: metadata.dietary_tags || [],
        folder: metadata.physical_location || 'Uncategorized',
        notes: notesText || undefined
      }
    })

    const freezerContext = freezerItems.map(item => ({
      name: item.item_name,
      quantity: item.quantity,
      unit: item.unit
    }))

    // Build Claude prompt
    const systemPrompt = `You are a personal recipe assistant for Pam. She has executive function challenges around food decisions, so your job is to cut through overwhelm and give her 2-3 specific, confident recommendations — not a list of 10 options.

When recommending, always mention:
- The recipe name
- Why it matches what she's asking for right now
- Her previous rating if she's tried it
- Whether she has the freezer components needed
- Any relevant notes she wrote about it (like "this was quick" or "very spicy" or "comfort food")

Be warm, direct, and decisive. She wants "make THIS tonight" energy, not "here are some options to consider."

Format your response as JSON with this structure:
{
  "message": "Your friendly conversational response",
  "recommendations": [
    {
      "recipe_id": 123,
      "recipe_title": "Recipe Name",
      "reason": "Why this recipe matches her request"
    }
  ]
}`

    const userPrompt = `Current request: "${query}"

Available recipes:
${JSON.stringify(recipeContext, null, 2)}

Current freezer inventory:
${JSON.stringify(freezerContext, null, 2)}

Based on this information, recommend 2-3 recipes that best match what Pam is looking for.`

    // Call Anthropic API
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    })

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text()
      throw new Error(`Anthropic API error: ${errorText}`)
    }

    const anthropicData = await anthropicResponse.json()
    const responseText = anthropicData.content[0].text

    // Parse Claude's JSON response
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
      // Claude sometimes wraps JSON in markdown — extract the object
      const match = responseText.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          parsedResponse = JSON.parse(match[0])
        } catch {
          parsedResponse = { message: responseText, recommendations: [] }
        }
      } else {
        parsedResponse = { message: responseText, recommendations: [] }
      }
    }

    return new Response(
      JSON.stringify(parsedResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
