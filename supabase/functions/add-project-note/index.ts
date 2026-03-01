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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const USER_ID = '6285585111'
    
    const noteContent = `# Recipe App - Project Documentation

**Live URL:** https://recipe-app-pam.netlify.app  
**GitHub:** https://github.com/planginc/recipe-app (private)  
**Date Created:** February 8, 2026  
**Last Updated:** February 15, 2026

## Project Overview
Full-featured recipe management web application with AI assistance, freezer inventory tracking, bulk import, and dietary tagging capabilities.

## Tech Stack
- **Frontend:** React 18 + Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **AI:** Claude API (Anthropic) - claude-sonnet-4-20250514
- **Hosting:** Netlify (auto-deploy from GitHub main branch)
- **Version Control:** GitHub

## Key Features

### 1. Recipe Library & Management
- Homepage with searchable recipe cards
- Search across title, content, and tags
- Filter by folder (20 categories), status (tried/untried/ratings), dietary tags
- Recipe detail pages with full CRUD operations
- Star rating system (1-5 stars)
- Tried/Untried status tracking
- User notes section
- Image display

### 2. AI-Powered Auto-Tagging (Latest Feature - Feb 15, 2026)
- "✨ Auto-Tag with AI" button on recipe detail pages
- Uses Claude AI to analyze recipe content and suggest accurate dietary tags
- Understands recipe context (not just keyword matching)
- 8 dietary tags: keto, low-carb, paleo, whole30, gluten-free, vegetarian, dairy-free, high-protein
- Edge Function: supabase/functions/auto-tag-recipe/index.ts
- See SESSION-LOG-2026-02-15-AI-Tagging.md for detailed implementation

### 3. AI Recipe Assistant (Feb 14, 2026)
- Floating purple/blue chat bubble
- Voice input via Web Speech API
- Claude-powered recommendations based on all recipe data, freezer inventory, ratings, and notes
- Provides 2-3 confident "make THIS tonight" suggestions
- Executive function support - decisive, not overwhelming
- Clickable recommendations navigate to recipe pages
- Edge Function: supabase/functions/recipe-ai-suggest/index.ts

### 4. Bulk Recipe Import (Feb 13, 2026)
- Import multiple recipes via URL list
- Automatic web scraping using DOMParser and Open Graph meta tags
- Extracts title, image, description
- Default folder assignment
- Page: /bulk-import

### 5. Freezer Inventory Management (Feb 12, 2026)
- Add, edit, delete freezer items
- Grouped by category (Proteins, Prepared Foods, Nuts & Seeds)
- Low stock alerts (< 5 units)
- Recipe usage tracking from detail pages
- Automatic inventory reduction and usage logging
- Page: /freezer
- Database tables: freezer_inventory, recipe_usage_log

### 6. Folder Organization (Feb 11, 2026)
20 standardized recipe folders:
1. Chicken & Poultry
2. Beef
3. Pork & Lamb
4. Fish & Seafood
5. Eggs
6. Beans & Legumes
7. Pasta & Noodles
8. Rice & Grains
9. Potatoes
10. Vegetable Mains
11. Salads
12. Soups, Stews & Broth
13. Dressings, Sauces & Marinades
14. Dips & Spreads
15. Bread & Baking
16. Breakfast Items
17. Desserts & Sweets
18. Beverages & Smoothies
19. Snacks & Appetizers
20. Condiments & Preserves

Plus: "Digital Only - Not Yet Printed" for unfiled recipes

## Database Configuration

### Supabase Project
- **Project ID:** gnpzqjmeiusniabmxomt
- **User ID:** 6285585111
- **Tables:**
  - notes (recipes)
  - freezer_inventory
  - recipe_usage_log

### Edge Functions
- auto-tag-recipe (AI dietary tagging)
- recipe-ai-suggest (AI recommendations)
- Both deployed with --no-verify-jwt
- Use ANTHROPIC_API_KEY secret

## Important Files & Scripts
- CHANGELOG.md - All project updates by date
- SESSION-LOG-2026-02-15-AI-Tagging.md - Detailed implementation log for AI tagging feature
- fetch_recipe_images.js - Script to auto-fetch recipe images from URLs
- update_folder_names.js - Script to standardize folder names
- src/pages/HomePage.jsx - Main recipe library page
- src/pages/RecipeDetailPage.jsx - Recipe detail and editing
- src/pages/FreezerInventoryPage.jsx - Freezer management
- src/pages/BulkImportPage.jsx - Bulk recipe import
- src/components/AIChat.jsx - Floating AI assistant
- src/components/RecipeCard.jsx - Recipe card component

## Deployment

### GitHub
- Repository: https://github.com/planginc/recipe-app
- Private repository

### Netlify
- Site: recipe-app-pam
- Team: MRR
- Auto-deploys from GitHub main branch
- Build command: npm run build
- Publish directory: dist

## Development Commands
- npm run dev - Start local dev server
- npm run build - Build for production
- npx supabase functions deploy <function-name> --no-verify-jwt - Deploy Edge Function
- git push origin main - Push to GitHub (triggers auto-deploy)

## Data Statistics (as of Feb 15, 2026)
- 65+ recipes
- 8 freezer inventory items
- 20 folder categories
- 8 dietary tag options
- 2 AI Edge Functions deployed

## Session Logs
For detailed implementation notes, see:
- SESSION-LOG-2026-02-15-AI-Tagging.md (AI auto-tagging feature)
- CHANGELOG.md (all updates chronologically)

---

**Note:** This project note was created on February 15, 2026. For the most current information, check CHANGELOG.md and session logs in the repository.`

    const metadata = {
      project_type: 'Recipe Management Web App',
      github_url: 'https://github.com/planginc/recipe-app',
      live_url: 'https://recipe-app-pam.netlify.app',
      tech_stack: ['React', 'Vite', 'Tailwind CSS', 'Supabase', 'Claude AI', 'Netlify'],
      last_updated: '2026-02-15',
      session_log_reference: 'SESSION-LOG-2026-02-15-AI-Tagging.md',
      changelog_reference: 'CHANGELOG.md',
      supabase_project_id: 'gnpzqjmeiusniabmxomt'
    }

    const { data, error } = await supabaseClient
      .from('notes')
      .insert([
        {
          user_telegram_id: USER_ID,
          title: 'Recipe App - Project Documentation',
          content: noteContent,
          metadata: metadata
        }
      ])
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, note_id: data[0].id }),
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
