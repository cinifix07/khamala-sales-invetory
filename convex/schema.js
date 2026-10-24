import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    username: v.string(),
    role: v.union(v.literal('admin'), v.literal('staff')),
  })
    .index('email', ['email'])
    .index('username', ['username']),
  addproduct: defineTable({
    name: v.optional(v.string()),
    category: v.optional(v.union(v.literal('Cake'), v.literal('Snacks'))),
    stock: v.optional(v.number()),
    price: v.optional(v.number()),
    createdBy: v.optional(v.id('users')),
    updatedAt: v.optional(v.number()),
    stockUpdatedAt: v.optional(v.number()),
  }).index('createdBy', ['createdBy']),
  profit: defineTable({
    totalProfit: v.optional(v.number()),
    createdBy: v.optional(v.id('users')),
    updatedAt: v.optional(v.number()),
  }).index('createdBy', ['createdBy']),
  historysale: defineTable({
    date: v.optional(v.number()),
    productName: v.optional(v.string()),
    eachPrice: v.optional(v.number()),
    totalQty: v.optional(v.number()),
    totalPrice: v.optional(v.number()),
    transactionId: v.optional(v.string()),
    recordType: v.optional(v.union(v.literal('earning'), v.literal('sale'))),
    notes: v.optional(v.string()),
    createdBy: v.optional(v.id('users')),
  }).index('date', ['date']),
  earnings: defineTable({
    amount: v.number(),
    amountCents: v.optional(v.number()),
    date: v.number(),
    notes: v.optional(v.string()),
    transactionId: v.optional(v.string()),
    requestId: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
    createdBy: v.id('users'),
  }).index('date', ['date']).index('createdBy', ['createdBy']).index('requestId', ['requestId']),
  archives: defineTable({
    source: v.union(v.literal('addproduct'), v.literal('profit'), v.literal('historysale')),
    data: v.any(),
    label: v.string(),
    deletedAt: v.number(),
    deletedBy: v.id('users'),
  })
    .index('deletedAt', ['deletedAt'])
    .index('deletedBy', ['deletedBy']),
})
