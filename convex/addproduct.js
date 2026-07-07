import { getAuthUserId } from '@convex-dev/auth/server'
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

async function requireUser(ctx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('You must be signed in to manage products.')
  return userId
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx)
    const products = await ctx.db.query('addproduct').order('desc').collect()
    return products.filter((product) =>
      typeof product.name === 'string' &&
      typeof product.stock === 'number' &&
      typeof product.price === 'number'
    )
  },
})

export const add = mutation({
  args: {
    name: v.string(),
    category: v.union(v.literal('Cake'), v.literal('Snacks')),
    stock: v.number(),
    price: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx)
    return await ctx.db.insert('addproduct', {
      ...args,
      createdBy: userId,
      updatedAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('addproduct'),
    name: v.string(),
    category: v.union(v.literal('Cake'), v.literal('Snacks')),
    stock: v.number(),
    price: v.number(),
  },
  handler: async (ctx, { id, ...changes }) => {
    await requireUser(ctx)
    const product = await ctx.db.get(id)
    if (!product) throw new Error('Product not found.')
    const now = Date.now()
    await ctx.db.patch(id, {
      ...changes,
      updatedAt: now,
      ...(product.stock !== changes.stock ? { stockUpdatedAt: now } : {}),
    })
  },
})

export const remove = mutation({
  args: { id: v.id('addproduct') },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx)
    const product = await ctx.db.get(id)
    if (!product) throw new Error('Product not found.')
    const data = { ...product }
    delete data._id
    delete data._creationTime
    await ctx.db.insert('archives', { source: 'addproduct', data, label: product.name ?? 'Unnamed product', deletedAt: Date.now(), deletedBy: userId })
    await ctx.db.delete(id)
  },
})

export const checkout = mutation({
  args: {
    items: v.array(v.object({
      productId: v.id('addproduct'),
      quantity: v.number(),
    })),
  },
  handler: async (ctx, { items }) => {
    await requireUser(ctx)
    if (items.length === 0) throw new Error('The order is empty.')

    const products = []
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error('Product quantities must be positive whole numbers.')
      }
      const product = await ctx.db.get(item.productId)
      if (!product || typeof product.name !== 'string' || typeof product.price !== 'number' || typeof product.stock !== 'number') {
        throw new Error('A product in this order is no longer available.')
      }
      if (product.stock < item.quantity) {
        throw new Error(`${product.name} only has ${product.stock} item(s) in stock.`)
      }
      products.push({ product, quantity: item.quantity })
    }

    const now = Date.now()
    for (const { product, quantity } of products) {
      await ctx.db.patch(product._id, {
        stock: product.stock - quantity,
        updatedAt: now,
        stockUpdatedAt: now,
      })
      await ctx.db.insert('historysale', {
        date: now,
        productName: product.name,
        eachPrice: product.price,
        totalQty: quantity,
        totalPrice: product.price * quantity,
      })
    }

    return { itemCount: products.length }
  },
})
