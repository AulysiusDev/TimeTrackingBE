import { relations } from "drizzle-orm";
import {
  text,
  pgTable,
  timestamp,
  serial,
  integer,
  numeric,
  boolean,
} from "drizzle-orm/pg-core";

const UsersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }).default(0),
  startTime: integer("start_time"),
  endTime: integer("end_time"),
  days: text("days_array"),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
});

const ItemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  isSubitem: boolean("is_subitem").default(false),
  parentItemId: integer("parent_item_id"),
  boardId: text("board_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

const LogConfigTable = pgTable("logconfig", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  userId: integer("user_id")
    .notNull()
    .references(() => UsersTable.id),
  itemId: integer("item_id").references(() => ItemsTable.id),
  // This gets set when the automation gets started, and it gets cleared when automation is stopped
  startDate: timestamp("start_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  peopleColumnId: text("people_column_id").notNull(),
  // 0 is Hours per Day, 1 is Work Schedule, 2 is RateCard
  schedule: integer("schedule").default(0).notNull(),
  // Mon-fri = false, custom days = true
  custom: boolean("custom").default(false),
  // Empty if custom is true
  customDays: text("custom_days_array").default("[]"),
  // Default status column or custom
  default: boolean("default").default(true),
  statusColumnId: text("status_column_id").notNull(),
  startLabels: text("start_labels_array").default("[]"),
  endLabels: text("end_labels_array").default("[]"),
  // Time user starts work if schedule is 0 or 1
  startTime: integer("start_time"),
  // Time user enxs work if schedule is 1
  endTime: integer("end_time"),
  subitemId: integer("subitem_id"),
  hours: numeric("hours", { precision: 8, scale: 2 }),
  name: text("name"),
  // This will be the user id if schedule is 2
  rateCardId: integer("rate_card_id").references(() => UsersTable.id, {
    relationName: "rateCard",
  }),
  // Can be set, can be null, anc can use rate card instead
  ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }),
  currency: text("currency").default("USD"),
  boardId: text("board_id").notNull(),
  active: boolean("active").default(false),
});

const logsConfigRelations = relations(LogConfigTable, ({ one }) => ({
  user: one(UsersTable, {
    relationName: "user",
    fields: [LogConfigTable.userId],
    references: [UsersTable.id],
  }),
  item: one(ItemsTable, {
    fields: [LogConfigTable.itemId],
    references: [ItemsTable.id],
  }),
  rateCard: one(UsersTable, {
    relationName: "rateCard",
    fields: [LogConfigTable.rateCardId],
    references: [UsersTable.id],
  }),
}));

const LogsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => UsersTable.id),
  itemId: integer("item_id")
    .notNull()
    .references(() => ItemsTable.id),
  date: timestamp("start_date").defaultNow().notNull(),
  totalHours: numeric("total_hours", { precision: 8, scale: 2 }),
  billableHours: numeric("billable_hours", { precision: 8, scale: 2 }),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }).default(
    null
  ),
  currency: text("currency").default(null),
});

const logsRelations = relations(LogsTable, ({ many }) => ({
  users: many(UsersTable),
  items: many(ItemsTable),
}));

export {
  UsersTable,
  ItemsTable,
  LogConfigTable,
  logsConfigRelations,
  LogsTable,
  logsRelations,
};
const schema = {
  UsersTable,
  ItemsTable,
  LogConfigTable,
  logsConfigRelations,
  LogsTable,
  logsRelations,
};

export default schema;
