import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X, Plus, Trash2, GripVertical, Clipboard, Sparkles, Loader2, ImageIcon } from 'lucide-react'

function StepCaptureModal({ item, onClose, onStepsSaved }) {
  const [steps, setSteps] = useState(item.steps || [])
  const [saving, setSaving] = useState(false)
  const [polishing, setPolishing] = useState(false)
  const [polishedRecipe, setPolishedRecipe] = useState('')
  const [uploadingStep, setUploadingStep] = useState(null)
  const pasteZoneRef = useRef(null)
  const fileInputRef = useRef(null)

  // Global paste handler
  useEffect(() => {
    function handlePaste(e) {
      const items = e.clipboardData?.items
      if (!items) return

      for (const clipItem of items) {
        if (clipItem.type.startsWith('image/')) {
          e.preventDefault()
          const blob = clipItem.getAsFile()
          uploadImage(blob)
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [steps])

  async function uploadImage(blob) {
    const stepIndex = steps.length
    setUploadingStep(stepIndex)

    try {
      const fileName = `${item.id}/${Date.now()}-step-${stepIndex + 1}.${blob.type.split('/')[1] || 'png'}`

      const { data, error } = await supabase.storage
        .from('inspiration-steps')
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('inspiration-steps')
        .getPublicUrl(fileName)

      const newStep = {
        image_url: urlData.publicUrl,
        narration: '',
        order: steps.length + 1
      }

      setSteps(prev => [...prev, newStep])
    } catch (err) {
      console.error('Upload error:', err)
      alert('Failed to upload image: ' + err.message)
    } finally {
      setUploadingStep(null)
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      uploadImage(file)
    }
    e.target.value = ''
  }

  function updateNarration(index, text) {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, narration: text } : s))
  }

  function removeStep(index) {
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })))
  }

  function moveStep(fromIndex, direction) {
    const toIndex = fromIndex + direction
    if (toIndex < 0 || toIndex >= steps.length) return
    const newSteps = [...steps]
    const temp = newSteps[fromIndex]
    newSteps[fromIndex] = newSteps[toIndex]
    newSteps[toIndex] = temp
    setSteps(newSteps.map((s, i) => ({ ...s, order: i + 1 })))
  }

  async function saveSteps() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('inspiration_videos')
        .update({ steps, updated_at: new Date().toISOString() })
        .eq('id', item.id)

      if (error) throw error
      onStepsSaved(steps)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save steps: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAIPolish() {
    if (steps.length === 0) {
      alert('Add some steps first!')
      return
    }

    const stepsWithNarration = steps.filter(s => s.narration.trim())
    if (stepsWithNarration.length === 0) {
      alert('Add narration to at least one step so AI has something to work with.')
      return
    }

    setPolishing(true)
    try {
      // Build the prompt from steps
      const stepDescriptions = steps.map((s, i) =>
        `Step ${i + 1}: ${s.narration || '(no description)'}`
      ).join('\n')

      const prompt = `You are a recipe assistant. Based on these step-by-step observations from watching a cooking video titled "${item.title}", create a clean, well-formatted recipe.

Video notes: ${item.notes || 'None'}
Tags: ${(item.tags || []).join(', ')}

Observed steps:
${stepDescriptions}

Please generate:
1. A brief description of the dish
2. An estimated ingredients list (based on what was described)
3. Clear, numbered cooking directions
4. Any tips or notes

Format it cleanly. If you're unsure about exact quantities, give reasonable estimates and mark them with "~" (approximate). Keep it practical and home-cook friendly.`

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('polish-recipe', {
        body: { prompt, title: item.title }
      })

      if (error) throw error
      setPolishedRecipe(data.recipe || 'No recipe generated')
    } catch (err) {
      console.error('AI polish error:', err)
      // Fallback: generate a simple recipe from the narrations
      const fallback = steps
        .filter(s => s.narration)
        .map((s, i) => `${i + 1}. ${s.narration}`)
        .join('\n')
      setPolishedRecipe(`**Directions (from your notes):**\n\n${fallback}\n\n(AI polish unavailable. Edge function may need to be deployed. These are your raw narrations.)`)
    } finally {
      setPolishing(false)
    }
  }

  async function promotePolishedRecipe() {
    if (!polishedRecipe) return
    if (!confirm(`Create a full recipe from "${item.title}"?`)) return

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          title: item.title,
          content: polishedRecipe,
          note_type: 'recipe',
          user_telegram_id: '6285585111',
          metadata: {
            source_url: item.url,
            source_type: 'inspiration_video_with_steps',
            dietary_tags: [],
            category: [],
            tried_status: false,
            rating: 0,
            your_notes: item.notes ? [{ date: new Date().toISOString().split('T')[0], text: item.notes }] : [],
            step_images: steps.map(s => s.image_url).filter(Boolean)
          },
          tags: item.tags || []
        }])
        .select()

      if (error) throw error

      if (data?.[0]) {
        await supabase
          .from('inspiration_videos')
          .update({ promoted_to_recipe_id: data[0].id })
          .eq('id', item.id)
      }

      alert('Recipe created! Head to My Recipes to see it.')
      onClose()
    } catch (err) {
      console.error('Promote error:', err)
      alert('Error creating recipe: ' + err.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Capture Steps</h2>
            <p className="text-sm text-gray-500 mt-1">{item.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Paste Zone */}
          <div
            ref={pasteZoneRef}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-amber-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/50 transition-all"
          >
            {uploadingStep !== null ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <p className="text-sm text-amber-700">Uploading screenshot...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <Clipboard className="w-6 h-6 text-amber-500" />
                  <ImageIcon className="w-6 h-6 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Paste screenshot (Cmd+V anywhere) or click to upload
                </p>
                <p className="text-xs text-gray-400">
                  Take a screenshot while watching, then paste it here
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Steps List */}
          {steps.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {steps.length} step{steps.length !== 1 ? 's' : ''} captured
              </h3>
              {steps.map((step, index) => (
                <div key={index} className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  {/* Step image */}
                  <div className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-gray-200">
                    {step.image_url ? (
                      <img
                        src={step.image_url}
                        alt={`Step ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  {/* Narration + controls */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        Step {index + 1}
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={() => moveStep(index, -1)}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move up"
                      >
                        <GripVertical className="w-4 h-4 rotate-180" />
                      </button>
                      <button
                        onClick={() => moveStep(index, 1)}
                        disabled={index === steps.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        title="Move down"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeStep(index)}
                        className="p-1 text-red-400 hover:text-red-600"
                        title="Remove step"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={step.narration}
                      onChange={(e) => updateNarration(index, e.target.value)}
                      placeholder="What's happening here? (e.g., coating chicken in mayo, adding garlic powder...)"
                      rows={2}
                      className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Polish Section */}
          {steps.length > 0 && (
            <div className="border-t border-gray-100 pt-6">
              <button
                onClick={handleAIPolish}
                disabled={polishing}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 w-full justify-center"
              >
                {polishing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating recipe...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Recipe with AI
                  </>
                )}
              </button>

              {polishedRecipe && (
                <div className="mt-4 bg-violet-50 rounded-xl p-4 border border-violet-200">
                  <h4 className="text-sm font-semibold text-violet-800 mb-2">AI-Generated Recipe</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {polishedRecipe}
                  </div>
                  <button
                    onClick={promotePolishedRecipe}
                    className="mt-4 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    Save as Full Recipe
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400">
            {steps.length === 0 ? 'Paste or upload your first screenshot to begin' : `${steps.length} steps ready`}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveSteps}
              disabled={saving || steps.length === 0}
              className="flex items-center gap-2 bg-amber-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Steps
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StepCaptureModal
