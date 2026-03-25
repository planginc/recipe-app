import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  recipes: defineTable({
    title: v.string(),
    content: v.optional(v.string()),
    userTelegramId: v.string(),
    metadata: v.optional(v.any()),
    tags: v.optional(v.array(v.string())),
    noteType: v.string(),
    updatedAt: v.optional(v.number()),
  }).index('by_user', ['userTelegramId']),

  freezerInventory: defineTable({
    userTelegramId: v.string(),
    itemName: v.string(),
    quantity: v.number(),
    unit: v.string(),
    category: v.string(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user', ['userTelegramId'])
    .index('by_user_category', ['userTelegramId', 'category']),

  inspirationVideos: defineTable({
    userTelegramId: v.string(),
    url: v.string(),
    title: v.string(),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    promotedToRecipeId: v.optional(v.id('recipes')),
    steps: v.optional(v.array(v.any())),
    updatedAt: v.optional(v.number()),
  }).index('by_user', ['userTelegramId']),
})
