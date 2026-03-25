import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, history = [] } = await req.json()

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const userId = '6285585111'

    const { data: recipes, error: recipesError } = await supabase
      .from('notes')
      .select('id, title, content, metadata')
      .eq('note_type', 'recipe')

    if (recipesError) throw recipesError

    const { data: freezerItems, error: freezerError } = await supabase
      .from('freezer_inventory')
      .select('*')
      .eq('user_telegram_id', userId)

    if (freezerError) throw freezerError

    const recipeContext = recipes.map(recipe => {
      const metadata = typeof recipe.metadata === 'string'
        ? JSON.parse(recipe.metadata || '{}')
        : (recipe.metadata || {})

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

    // Recipe and freezer data lives in the system prompt so it's available across all turns
    const systemPrompt = `You are a personal recipe assistant for Pam. She has executive function challenges around food decisions, so your job is to cut through overwhelm and give her 2-3 specific, confident recommendations — not a list of 10 options.

When recommending, always mention:
- The recipe name
- Why it matches what she's asking for right now
- Her previous rating if she's tried it
- Whether she has the freezer components needed
- Any relevant notes she wrote about it (like "this was quick" or "very spicy" or "comfort food")

Be warm, direct, and decisive. She wants "make THIS tonight" energy, not "here are some options to consider."

For follow-up questions in a conversation, use the context of what was already discussed — if she asks "why did I rate that one 4 stars instead of 5?" she means the recipe just recommended.

Always respond with JSON in this exact format:
{
  "message": "Your friendly conversational response",
  "recommendations": [
    {
      "recipe_id": 123,
      "recipe_title": "Recipe Name",
      "reason": "Why this recipe matches her request"
    }
  ]
}

If no recipe recommendations apply (e.g. a follow-up question about a specific recipe), return an empty recommendations array.

Available recipes:
${JSON.stringify(recipeContext, null, 2)}

Current freezer inventory:
${JSON.stringify(freezerContext, null, 2)}`

    // Build multi-turn messages: history + current query
    const messages = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content
      })),
      {
        role: 'user',
        content: query
      }
    ]

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

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
        messages
      })
    })

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text()
      throw new Error(`Anthropic API error: ${errorText}`)
    }

    const anthropicData = await anthropicResponse.json()
    const responseText = anthropicData.content[0].text

    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseText)
    } catch {
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
