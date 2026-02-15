import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { title, content } = await req.json()

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const systemPrompt = `You are a recipe analyzer. Your job is to determine which dietary tags apply to a recipe based on its ingredients and preparation.

Available tags:
- keto: Very low carb (under 20g net carbs), high fat
- low-carb: Moderate carbs (under 50g), not necessarily keto
- paleo: No grains, legumes, dairy, or processed foods
- whole30: Paleo + no sugar, alcohol, or additives
- gluten-free: No wheat, barley, rye, or gluten
- vegetarian: No meat, poultry, or fish
- dairy-free: No milk, cheese, cream, butter, or yogurt
- high-protein: Significant protein content (over 20g per serving)

Respond with ONLY a JSON array of applicable tag IDs. For example: ["keto", "gluten-free", "dairy-free"]

If no tags apply, return an empty array: []`

    const userPrompt = `Recipe Title: ${title}

Recipe Content/Ingredients:
${content?.substring(0, 3000) || 'No detailed content provided'}

Which dietary tags apply to this recipe?`

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
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

    let tags
    try {
      tags = JSON.parse(responseText)
    } catch {
      // If Claude didn't return valid JSON, return empty array
      tags = []
    }

    return new Response(
      JSON.stringify({ tags }),
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
