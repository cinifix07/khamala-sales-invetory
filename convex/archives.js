import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

async function requireUser(ctx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('You must be signed in to manage archives.')
  return userId
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)
    const archives = await ctx.db
      .query('archives')
      .withIndex('deletedBy', (q) => q.eq('deletedBy', userId))
      .collect()
    return archives.sort((a, b) => b.deletedAt - a.deletedAt)
  },
})

export const restore = mutation({
  args: { id: v.id('archives') },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx)
    const archived = await ctx.db.get(id)
    if (!archived) throw new Error('Archived item not found.')
    if (archived.deletedBy !== userId) throw new Error('You do not have permission to restore this item.')
    await ctx.db.insert(archived.source, archived.data)
    await ctx.db.delete(id)
  },
})

export const remove = mutation({
  args: { id: v.id('archives') },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx)
    const archived = await ctx.db.get(id)
    if (!archived) throw new Error('Archived item not found.')
    if (archived.deletedBy !== userId) throw new Error('You do not have permission to delete this item.')
    await ctx.db.delete(id)
  },
})
