import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: { userTelegramId: v.string() },
  handler: async (ctx, { userTelegramId }) => {
    const items = await ctx.db
      .query('freezerInventory')
      .withIndex('by_user', (q) => q.eq('userTelegramId', userTelegramId))
      .collect()

    // Sort by category then itemName
    return items.sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return a.itemName.localeCompare(b.itemName)
    })
  },
})

export const create = mutation({
  args: {
    userTelegramId: v.string(),
    itemName: v.string(),
    quantity: v.number(),
    unit: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('freezerInventory', {
      ...args,
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('freezerInventory'),
    itemName: v.optional(v.string()),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { id: v.id('freezerInventory') },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id)
  },
})
