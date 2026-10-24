import { getAuthUserId } from '@convex-dev/auth/server'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

async function requireEarningsAdmin(ctx, action) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error('You must be signed in to manage earnings.')
  const user = await ctx.db.get(userId)
  if (user?.role !== 'admin') throw new Error(`Only an admin can ${action} earnings.`)
  return userId
}

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

export const todayStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('You must be signed in to view sales history.')

    // Business dates use Asia/Manila time (UTC+8), matching dashboardStats and the POS.
    const dayMs = 24 * 60 * 60 * 1000
    const manilaOffset = 8 * 60 * 60 * 1000
    const shiftedNow = Date.now() + manilaOffset
    const todayStart = Math.floor(shiftedNow / dayMs) * dayMs - manilaOffset
    const tomorrowStart = todayStart + dayMs
    const sales = (await ctx.db.query('historysale').collect()).filter((sale) => {
      const saleDate = typeof sale.date === 'number' ? sale.date : sale._creationTime
      return typeof sale.productName === 'string' &&
        typeof sale.eachPrice === 'number' &&
        typeof sale.totalQty === 'number' &&
        typeof sale.totalPrice === 'number' && sale.recordType !== 'earning' &&
        saleDate >= todayStart && saleDate < tomorrowStart
    })
    const earnings = (await ctx.db.query('earnings').collect()).filter((earning) =>
      earning.date >= todayStart && earning.date < tomorrowStart
    )

    // A daily earnings entry represents that day's total, so it replaces the
    // POS detail rows for that day. Its linked historysale mirror is excluded.
    const totalCents = (rows, amountOf) => rows.reduce((sum, row) => sum + Math.round(amountOf(row) * 100), 0)
    return earnings.length > 0
      ? { total: totalCents(earnings, (earning) => Number.isInteger(earning.amountCents) ? earning.amountCents / 100 : earning.amount) / 100, count: earnings.length }
      : { total: totalCents(sales, (sale) => sale.totalPrice) / 100, count: sales.length }
  },
})

export const addEarning = mutation({
  args: {
    amount: v.number(),
    date: v.number(),
    notes: v.optional(v.string()),
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, { amount, date, notes, requestId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('You must be signed in to record earnings.')
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) {
      throw new Error('Earnings amount must be positive and have no more than two decimal places.')
    }
    if (!Number.isFinite(date)) throw new Error('A valid earning date is required.')
    const cleanNotes = notes?.trim()
    if (cleanNotes && cleanNotes.length > 500) throw new Error('Notes must be 500 characters or fewer.')
    if (requestId !== undefined && (requestId.length < 16 || requestId.length > 100)) throw new Error('Invalid request identifier.')
    if (requestId) {
      const existing = await ctx.db.query('earnings').withIndex('requestId', (q) => q.eq('requestId', requestId)).first()
      if (existing) {
        if (existing.createdBy !== userId) throw new Error('This request identifier is already in use.')
        return { id: existing._id, transactionId: existing.transactionId ?? `legacy-${existing._id}`, duplicate: true }
      }
    }
    const transactionId = `earning-${requestId ?? `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`}`
    const earningId = await ctx.db.insert('earnings', {
      amount,
      amountCents: Math.round(amount * 100),
      date,
      transactionId,
      ...(requestId ? { requestId } : {}),
      ...(cleanNotes ? { notes: cleanNotes } : {}),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: userId,
    })
    await ctx.db.insert('historysale', {
      date,
      productName: 'Daily earnings',
      eachPrice: amount,
      totalQty: 1,
      totalPrice: amount,
      transactionId,
      recordType: 'earning',
      ...(cleanNotes ? { notes: cleanNotes } : {}),
      createdBy: userId,
    })
    return { id: earningId, transactionId, duplicate: false }
  },
})

export const earningsList = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('You must be signed in to view earnings.')
    return (await ctx.db.query('earnings').withIndex('date').order('desc').collect())
      .map((earning) => ({ ...earning, date: earning.date ?? earning._creationTime }))
  },
})

export const updateEarning = mutation({
  args: {
    id: v.id('earnings'),
    amount: v.number(),
    date: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { id, amount, date, notes }) => {
    const userId = await requireEarningsAdmin(ctx, 'edit')
    if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) {
      throw new Error('Earnings amount must be positive and have no more than two decimal places.')
    }
    if (!Number.isFinite(date)) throw new Error('A valid earning date is required.')
    const cleanNotes = notes?.trim()
    if (cleanNotes && cleanNotes.length > 500) throw new Error('Notes must be 500 characters or fewer.')

    const earning = await ctx.db.get(id)
    if (!earning) throw new Error('Earnings transaction not found.')
    const transactionId = earning.transactionId ?? `earning-${id}`
    const existingMirror = earning.transactionId
      ? (await ctx.db.query('historysale').withIndex('date', (q) => q.eq('date', earning.date)).collect())
        .find((sale) => sale.transactionId === earning.transactionId)
        ?? (await ctx.db.query('historysale').collect()).find((sale) => sale.transactionId === earning.transactionId)
      : null
    await ctx.db.patch(id, {
      amount,
      amountCents: Math.round(amount * 100),
      date,
      transactionId,
      notes: cleanNotes || undefined,
      updatedAt: Date.now(),
    })
    const mirrorValues = {
      date,
      productName: 'Daily earnings',
      eachPrice: amount,
      totalQty: 1,
      totalPrice: amount,
      transactionId,
      recordType: 'earning',
      notes: cleanNotes || undefined,
      createdBy: earning.createdBy ?? userId,
    }
    if (existingMirror) await ctx.db.patch(existingMirror._id, mirrorValues)
    else await ctx.db.insert('historysale', mirrorValues)
    return { id, transactionId }
  },
})

export const removeEarning = mutation({
  args: { id: v.id('earnings') },
  handler: async (ctx, { id }) => {
    await requireEarningsAdmin(ctx, 'remove')
    const earning = await ctx.db.get(id)
    if (!earning) throw new Error('Earnings transaction not found.')
    if (earning.transactionId) {
      const sameDayRows = await ctx.db.query('historysale').withIndex('date', (q) => q.eq('date', earning.date)).collect()
      const mirror = sameDayRows.find((sale) => sale.transactionId === earning.transactionId)
        ?? (await ctx.db.query('historysale').collect()).find((sale) => sale.transactionId === earning.transactionId)
      if (mirror) await ctx.db.delete(mirror._id)
    }
    await ctx.db.delete(id)
    return { removed: true }
  },
})

export const add = mutation({
  args: {
    date: v.number(),
    productName: v.string(),
    eachPrice: v.number(),
    totalQty: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) throw new Error('You must be signed in to add a sale.')

    const productName = args.productName.trim()
    if (!productName) throw new Error('Product name is required.')
    if (!Number.isFinite(args.date)) throw new Error('A valid sale date is required.')
    if (!Number.isFinite(args.eachPrice) || args.eachPrice < 0) throw new Error('Each price must be zero or greater.')
    if (!Number.isInteger(args.totalQty) || args.totalQty < 1) throw new Error('Total quantity must be at least one.')

    return await ctx.db.insert('historysale', {
      date: args.date,
      productName,
      eachPrice: args.eachPrice,
      totalQty: args.totalQty,
      totalPrice: args.eachPrice * args.totalQty,
    })
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
      typeof sale.totalQty === 'number' && typeof sale.totalPrice === 'number' && sale.recordType !== 'earning'
    )
    const earnings = await ctx.db.query('earnings').collect()
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

    const dateKey = (timestamp) => {
      const shifted = new Date(timestamp + singaporeOffset)
      return `${shifted.getUTCFullYear()}-${shifted.getUTCMonth()}-${shifted.getUTCDate()}`
    }
    const earningDays = new Set(earnings.map((earning) => dateKey(earning.date)))
    const canonicalRecords = [
      ...sales.filter((sale) => !earningDays.has(dateKey(typeof sale.date === 'number' ? sale.date : sale._creationTime)))
        .map((sale) => ({ date: typeof sale.date === 'number' ? sale.date : sale._creationTime, amountCents: Math.round(sale.totalPrice * 100), units: sale.totalQty })),
      ...earnings.map((earning) => ({ date: earning.date, amountCents: Number.isInteger(earning.amountCents) ? earning.amountCents : Math.round(earning.amount * 100), units: 1 })),
    ]
    for (const sale of canonicalRecords) {
      const saleDate = typeof sale.date === 'number' ? sale.date : sale._creationTime
      const saleDateInSingapore = new Date(saleDate + singaporeOffset)
      const saleYear = saleDateInSingapore.getUTCFullYear()
      const saleMonth = saleDateInSingapore.getUTCMonth()
      grossRevenue += sale.amountCents
      if (saleYear === currentYear) monthlyRevenue[saleMonth] += sale.amountCents
      const yearlyIndex = yearlyLabels.indexOf(saleYear)
      if (yearlyIndex !== -1) yearlyRevenue[yearlyIndex] += sale.amountCents
      if (saleDate >= todayStart) {
        dailyUnits += sale.units
        dailyRevenue += sale.amountCents
      }
      if (saleDate >= weekStart) {
        weeklyUnits += sale.units
        weeklyRevenue += sale.amountCents
        const bucket = Math.floor((saleDate - weekStart) / dayMs)
        if (bucket >= 0 && bucket < 7) {
          dailyBuckets[bucket] += sale.units
          dailyRevenueBuckets[bucket] += sale.amountCents
        }
      }
      if (saleDate >= monthStart) {
        monthlyUnits += sale.units
        monthlyRevenueTotal += sale.amountCents
      }
    }

    grossRevenue /= 100
    dailyRevenue /= 100
    weeklyRevenue /= 100
    monthlyRevenueTotal /= 100
    for (let index = 0; index < monthlyRevenue.length; index += 1) monthlyRevenue[index] /= 100
    for (let index = 0; index < yearlyRevenue.length; index += 1) yearlyRevenue[index] /= 100
    for (let index = 0; index < dailyRevenueBuckets.length; index += 1) dailyRevenueBuckets[index] /= 100
    const investedProfit = investments.reduce((sum, record) => sum + Math.round(record.totalProfit * 100), 0) / 100
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
    if (sale.recordType === 'earning') throw new Error('Linked earnings history must be updated through the earnings transaction.')
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
    if (sale.recordType === 'earning') throw new Error('Linked earnings history must be removed through the earnings transaction.')
    const data = { ...sale }
    delete data._id
    delete data._creationTime
    await ctx.db.insert('archives', { source: 'historysale', data, label: sale.productName ?? 'Unnamed sale', deletedAt: Date.now(), deletedBy: userId })
    await ctx.db.delete(args.id)
  },
})
