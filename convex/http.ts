import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { api } from './_generated/api'

const http = httpRouter()

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// AI recipe suggestion chat endpoint
http.route({
  path: '/recipeAiSuggest',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

http.route({
  path: '/recipeAiSuggest',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const { query, history = [], userTelegramId } = await request.json()

      if (!query) {
        return new Response(JSON.stringify({ error: 'Query is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const recipes = await ctx.runQuery(api.recipes.list, { userTelegramId })
      const freezerItems = await ctx.runQuery(api.freezer.list, { userTelegramId })

      const recipeContext = recipes.map((recipe) => {
        const metadata = recipe.metadata || {}
        const rawNotes = metadata.your_notes
        let notesText = ''
        if (Array.isArray(rawNotes)) {
          notesText = rawNotes.map((n: any) => `${n.date || 'Undated'}: ${n.text}`).join(' | ')
        } else if (rawNotes) {
          notesText = rawNotes
        }
        return {
          id: recipe._id,
          title: recipe.title,
          rating: metadata.rating || 0,
          tried: metadata.tried_status || false,
          dietary_tags: metadata.dietary_tags || [],
          folder: metadata.physical_location || 'Uncategorized',
          notes: notesText || undefined,
        }
      })

      const freezerContext = freezerItems.map((item) => ({
        name: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
      }))

      const systemPrompt = `You are a personal recipe assistant. Help the user decide what to cook based on their saved recipes and freezer inventory. Be warm, direct, and decisive — give 2-3 specific confident recommendations, not a long list of options.

When recommending, mention:
- The recipe name and why it matches the request
- Their previous rating if they've tried it
- Whether they have the freezer components needed
- Any relevant notes they wrote about it

For follow-up questions, use the context of what was already discussed.

Always respond with JSON in this exact format:
{
  "message": "Your friendly conversational response",
  "recommendations": [
    {
      "recipe_id": "id-here",
      "recipe_title": "Recipe Name",
      "reason": "Why this recipe matches the request"
    }
  ]
}

If no recipe recommendations apply, return an empty recommendations array.

Available recipes:
${JSON.stringify(recipeContext, null, 2)}

Current freezer inventory:
${JSON.stringify(freezerContext, null, 2)}`

      const messages = [
        ...history.map((m: any) => ({ role: m.role, content: m.content })),
        { role: 'user', content: query },
      ]

      const anthropicKey = process.env.ANTHROPIC_API_KEY
      if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      })

      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text()
        throw new Error(`Anthropic API error: ${errorText}`)
      }

      const anthropicData = await anthropicResponse.json()
      const responseText = anthropicData.content[0].text

      let parsed
      try {
        parsed = JSON.parse(responseText)
      } catch {
        const match = responseText.match(/\{[\s\S]*\}/)
        parsed = match ? JSON.parse(match[0]) : { message: responseText, recommendations: [] }
      }

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }),
})

// Auto-tag recipe endpoint
http.route({
  path: '/autoTagRecipe',
  method: 'OPTIONS',
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders })
  }),
})

http.route({
  path: '/autoTagRecipe',
  method: 'POST',
  handler: httpAction(async (_ctx, request) => {
    try {
      const { title, content } = await request.json()

      if (!title) {
        return new Response(JSON.stringify({ error: 'Title is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const anthropicKey = process.env.ANTHROPIC_API_KEY
      if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

      const systemPrompt = `You are a recipe analyzer. Determine which dietary tags apply to a recipe based on its ingredients and preparation.

Available tags:
- keto: Very low carb (under 20g net carbs), high fat
- low-carb: Moderate carbs (under 50g), not necessarily keto
- paleo: No grains, legumes, dairy, or processed foods
- whole30: Paleo + no sugar, alcohol, or additives
- gluten-free: No wheat, barley, rye, or gluten
- vegetarian: No meat, poultry, or fish
- dairy-free: No milk, cheese, cream, butter, or yogurt
- high-protein: Significant protein content (over 20g per serving)

Make reasonable inferences from available info. Respond with ONLY a JSON array like: ["keto", "gluten-free"]`

      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 256,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Recipe Title: ${title}\n\nRecipe Content:\n${content?.substring(0, 3000) || 'No content'}`,
            },
          ],
        }),
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
        const match = responseText.match(/\[[\s\S]*\]/)
        tags = match ? JSON.parse(match[0]) : []
      }

      return new Response(JSON.stringify({ tags }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }),
})

export default http
