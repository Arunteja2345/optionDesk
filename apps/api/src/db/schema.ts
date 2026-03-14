import { pgTable, uuid, varchar, numeric, integer, boolean, timestamp, date, pgEnum } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['user', 'admin'])
export const orderSideEnum = pgEnum('order_side', ['BUY', 'SELL'])
export const optionTypeEnum = pgEnum('option_type', ['CE', 'PE'])
export const orderStatusEnum = pgEnum('order_status', ['pending', 'executed', 'cancelled', 'rejected'])
export const positionStatusEnum = pgEnum('position_status', ['open', 'closed'])
export const orderTypeEnum = pgEnum('order_type', ['MARKET', 'LIMIT'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  passwordHash: varchar('password_hash').notNull(),
  role: roleEnum('role').default('user').notNull(),
  balance: numeric('balance', { precision: 14, scale: 2 }).default('100000').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const positions = pgTable('positions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  contractId: varchar('contract_id', { length: 30 }).notNull(),
  indexName: varchar('index_name', { length: 10 }).notNull(),
  strikePrice: integer('strike_price').notNull(),
  expiryDate: date('expiry_date').notNull(),
  optionType: optionTypeEnum('option_type').notNull(),
  quantity: integer('quantity').notNull(),
  avgBuyPrice: numeric('avg_buy_price', { precision: 10, scale: 2 }).notNull(),
  side: orderSideEnum('side').notNull(),
  status: positionStatusEnum('status').default('open').notNull(),
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  closePrice: numeric('close_price', { precision: 10, scale: 2 }),
})

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  contractId: varchar('contract_id', { length: 30 }).notNull(),
  indexName: varchar('index_name', { length: 10 }).notNull(),
  strikePrice: integer('strike_price').notNull(),
  expiryDate: date('expiry_date').notNull(),
  optionType: optionTypeEnum('option_type').notNull(),
  orderType: orderTypeEnum('order_type').notNull(),
  side: orderSideEnum('side').notNull(),
  quantity: integer('quantity').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  executedAt: timestamp('executed_at', { withTimezone: true }),
})

export const watchlist = pgTable('watchlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  contractId: varchar('contract_id', { length: 30 }).notNull(),
  indexName: varchar('index_name', { length: 10 }).notNull(),
  strikePrice: integer('strike_price').notNull(),
  optionType: optionTypeEnum('option_type').notNull(),
  expiryDate: date('expiry_date').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
})