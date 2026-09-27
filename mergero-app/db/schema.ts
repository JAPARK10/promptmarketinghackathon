import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const profiles = sqliteTable('profiles', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), data: text('data').notNull(),
  modelVersion: text('model_version').notNull(), viewCount: integer('view_count').notNull().default(0), createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(),
}, t => [index('idx_profiles_owner').on(t.ownerId)]);
