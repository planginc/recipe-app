import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: { userTelegramId: v.string() },
  handler: async (ctx, { userTelegramId }) => {
    return await ctx.db
      .query('inspirationVideos')
      .withIndex('by_user', (q) => q.eq('userTelegramId', userTelegramId))
      .order('desc')
      .collect()
  },
})

export const create = mutation({
  args: {
    userTelegramId: v.string(),
    url: v.string(),
    title: v.string(),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('inspirationVideos', {
      ...args,
      steps: [],
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('inspirationVideos'),
    url: v.optional(v.string()),
    title: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    promotedToRecipeId: v.optional(v.id('recipes')),
    steps: v.optional(v.array(v.any())),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { id: v.id('inspirationVideos') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId)
  },
})
