import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

async function requireUser(ctx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('You must be signed in to manage profit records.')
  return userId
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)
    const records = await ctx.db.query('profit').order('desc').collect()
    return records.filter((record) => typeof record.totalProfit === 'number')
  },
})

export const add = mutation({
  args: { totalProfit: v.number() },
  handler: async (ctx, { totalProfit }) => {
    const userId = await requireUser(ctx)
    if (totalProfit <= 0) throw new Error('Profit investment must be greater than zero.')
    return await ctx.db.insert('profit', {
      totalProfit,
      createdBy: userId,
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: { id: v.id('profit'), totalProfit: v.number() },
  handler: async (ctx, { id, totalProfit }) => {
    await requireUser(ctx)
    if (totalProfit <= 0) throw new Error('Profit investment must be greater than zero.')
    const record = await ctx.db.get(id)
    if (!record) throw new Error('Profit record not found.')
    await ctx.db.patch(id, { totalProfit, updatedAt: Date.now() })
  },
})

export const remove = mutation({
  args: { id: v.id('profit') },
  handler: async (ctx, { id }) => {
    await requireUser(ctx)
    const record = await ctx.db.get(id)
    if (!record) throw new Error('Profit record not found.')
    await ctx.db.delete(id)
  },
})
