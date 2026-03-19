import { z } from 'zod'

export const TradeSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').toUpperCase(),
  direction: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number().positive('Entry price must be positive'),
  exitPrice: z.number().positive('Exit price must be positive'),
  quantity: z.number().positive('Quantity must be positive'),
  entryDate: z.string().min(1, 'Entry date is required'),
  exitDate: z.string().min(1, 'Exit date is required'),
  pnl: z.number(),
  fees: z.number().default(0),
  commission: z.number().default(0),
  swap: z.number().default(0),
  setupType: z.string().optional(),
  notes: z.string().optional(),
  tagIds: z.array(z.string()).default([]),
})

export type TradeFormData = z.infer<typeof TradeSchema>

export const ImportRowSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(['LONG', 'SHORT']),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive(),
  quantity: z.number().positive(),
  entryDate: z.string(),
  exitDate: z.string(),
  profit: z.number(),
  commission: z.number().default(0),
  swap: z.number().default(0),
  externalId: z.string().optional(),
})

export type ImportRowData = z.infer<typeof ImportRowSchema>

export const TagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
})

export type TagFormData = z.infer<typeof TagSchema>
