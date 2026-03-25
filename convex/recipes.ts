import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: { userTelegramId: v.string() },
  handler: async (ctx, { userTelegramId }) => {
    return await ctx.db
      .query('recipes')
      .withIndex('by_user', (q) => q.eq('userTelegramId', userTelegramId))
      .order('desc')
      .collect()
  },
})

export const get = query({
  args: { id: v.id('recipes') },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id)
  },
})

export const create = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    userTelegramId: v.string(),
    metadata: v.optional(v.any()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('recipes', {
      ...args,
      noteType: 'recipe',
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('recipes'),
    metadata: v.optional(v.any()),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { id: v.id('recipes') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})
