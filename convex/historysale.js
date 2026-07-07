import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('You must be signed in to view sales history.')

    const sales = await ctx.db.query('historysale').order('desc').collect()
    return sales.filter((sale) =>
      typeof sale.productName === 'string' &&
      typeof sale.eachPrice === 'number' &&
      typeof sale.totalQty === 'number' &&
      typeof sale.totalPrice === 'number'
    ).map((sale) => ({
      ...sale,
      date: typeof sale.date === 'number' ? sale.date : sale._creationTime,
    }))
  },
})

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('You must be signed in to view dashboard statistics.')

    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    const singaporeOffset = 8 * 60 * 60 * 1000
    const shiftedNow = now + singaporeOffset
    const todayStart = Math.floor(shiftedNow / dayMs) * dayMs - singaporeOffset
    const weekStart = todayStart - 6 * dayMs
    const shiftedDate = new Date(shiftedNow)
    const monthStart = Date.UTC(shiftedDate.getUTCFullYear(), shiftedDate.getUTCMonth(), 1) - singaporeOffset
    const currentYear = shiftedDate.getUTCFullYear()

    const sales = (await ctx.db.query('historysale').collect()).filter((sale) =>
      typeof sale.totalQty === 'number' && typeof sale.totalPrice === 'number'
    )
    const investments = (await ctx.db.query('profit').collect()).filter((record) =>
      typeof record.totalProfit === 'number'
    )
    const dailyBuckets = Array.from({ length: 7 }, () => 0)
    const dailyRevenueBuckets = Array.from({ length: 7 }, () => 0)
    const monthlyRevenue = Array.from({ length: 12 }, () => 0)
    const yearlyLabels = Array.from({ length: 5 }, (_, index) => currentYear - 4 + index)
    const yearlyRevenue = Array.from({ length: 5 }, () => 0)
    let grossRevenue = 0
    let dailyUnits = 0
    let weeklyUnits = 0
    let monthlyUnits = 0
    let dailyRevenue = 0
    let weeklyRevenue = 0
    let monthlyRevenueTotal = 0

    for (const sale of sales) {
      const saleDate = typeof sale.date === 'number' ? sale.date : sale._creationTime
      const saleDateInSingapore = new Date(saleDate + singaporeOffset)
      const saleYear = saleDateInSingapore.getUTCFullYear()
      const saleMonth = saleDateInSingapore.getUTCMonth()
      grossRevenue += sale.totalPrice
      if (saleYear === currentYear) monthlyRevenue[saleMonth] += sale.totalPrice
      const yearlyIndex = yearlyLabels.indexOf(saleYear)
      if (yearlyIndex !== -1) yearlyRevenue[yearlyIndex] += sale.totalPrice
      if (saleDate >= todayStart) {
        dailyUnits += sale.totalQty
        dailyRevenue += sale.totalPrice
      }
      if (saleDate >= weekStart) {
        weeklyUnits += sale.totalQty
        weeklyRevenue += sale.totalPrice
        const bucket = Math.floor((saleDate - weekStart) / dayMs)
        if (bucket >= 0 && bucket < 7) {
          dailyBuckets[bucket] += sale.totalQty
          dailyRevenueBuckets[bucket] += sale.totalPrice
        }
      }
      if (saleDate >= monthStart) {
        monthlyUnits += sale.totalQty
        monthlyRevenueTotal += sale.totalPrice
      }
    }

    const investedProfit = investments.reduce((sum, record) => sum + record.totalProfit, 0)
    const netProfit = grossRevenue - investedProfit
    const profitPercentage = investedProfit > 0 ? (netProfit / investedProfit) * 100 : grossRevenue > 0 ? 100 : 0
    const monthlyTarget = 4000

    return {
      netProfit,
      profitPercentage,
      dailyUnits,
      weeklyUnits,
      monthlyUnits,
      dailyRevenue,
      weeklyRevenue,
      monthlyRevenueTotal,
      monthlyTarget,
      monthlyPercentage: Math.min(100, (monthlyUnits / monthlyTarget) * 100),
      dailyBuckets,
      dailyRevenueBuckets,
      monthlyRevenue,
      yearlyRevenue,
      yearlyLabels,
    }
  },
})

export const update = mutation({
  args: {
    id: v.id('historysale'),
    date: v.number(),
    productName: v.string(),
    eachPrice: v.number(),
    totalQty: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('You must be signed in to update a sale.')

    const sale = await ctx.db.get(args.id)
    if (!sale) throw new Error('Sale record not found.')
    const productName = args.productName.trim()
    if (!productName) throw new Error('Product name is required.')
    if (!Number.isFinite(args.date)) throw new Error('A valid sale date is required.')
    if (!Number.isFinite(args.eachPrice) || args.eachPrice < 0) throw new Error('Each price must be zero or greater.')
    if (!Number.isInteger(args.totalQty) || args.totalQty < 1) throw new Error('Total quantity must be at least one.')

    await ctx.db.patch(args.id, {
      date: args.date,
      productName,
      eachPrice: args.eachPrice,
      totalQty: args.totalQty,
      totalPrice: args.eachPrice * args.totalQty,
    })
  },
})

export const remove = mutation({
  args: { id: v.id('historysale') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('You must be signed in to delete a sale.')
    const sale = await ctx.db.get(args.id)
    if (!sale) throw new Error('Sale record not found.')
    const data = { ...sale }
    delete data._id
    delete data._creationTime
    await ctx.db.insert('archives', { source: 'historysale', data, label: sale.productName ?? 'Unnamed sale', deletedAt: Date.now(), deletedBy: userId })
    await ctx.db.delete(args.id)
  },
})
