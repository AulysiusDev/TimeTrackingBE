import { relations } from "drizzle-orm";
import {
  text,
  pgTable,
  timestamp,
  serial,
  integer,
  numeric,
  boolean,
  index,
} from "drizzle-orm/pg-core";

// Rate and currency heirarchy:
// Client > ClientRatecard > Ratecard

const UsersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    team: text("team"),
    languages: text("languages").default("[ENG]"),
    location: text("location"),
    timezoneOffset: integer("timezone_offset").default(0),
    accessKey: text("access_key"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    role: text("role"),
    updatedBy: integer("updated_by").references(() => UsersTable.id),
  },
  (table) => ({
    usersUpdatedByIndex: index("idx_users_updated_by").on(table.updatedBy),
  })
);

const UsersRelations = relations(UsersTable, ({ one }) => ({
  updatedBy: one(UsersTable, {
    relationName: "updatedBy",
    fields: [UsersTable.updatedBy],
    references: [UsersTable.id],
  }),
}));

const ClientsTable = pgTable(
  "clients",
  {
    id: serial("id").primaryKey(),
    companyName: text("company_name").notNull(),
    industry: text("industry"),
    rate: numeric("rate", { precision: 8, scale: 2 }).default(0),
    currency: text("currency").default("USD"),
    languages: text("languages").default("[ENG]"),
    location: text("location"),
    timezoneOffset: integer("timezone_offset").default(0),
    accessKey: text("access_key"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: integer("updated_by").references(() => UsersTable.id),
  },
  (table) => ({
    clientsUpdatedByIndex: index("idx_clients_updated_by").on(table.updatedBy),
  })
);

const ClientsRelations = relations(ClientsTable, ({ one }) => ({
  updatedBy: one(UsersTable, {
    relationName: "updatedBy",
    fields: [ClientsTable.updatedBy],
    references: [UsersTable.id],
  }),
}));

const RatecardTable = pgTable(
  "ratecards",
  {
    id: serial("id").primaryKey(),
    startTime: numeric("start_time", { precision: 8, scale: 2 }).default(0),
    endTime: numeric("end_time", { precision: 8, scale: 2 }).default(0),
    days: text("days"),
    rate: numeric("rate", { precision: 8, scale: 2 }).default(0),
    currency: text("currency").default("USD"),
    department: text("department"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
    role: text("role"),
    updatedBy: integer("updated_by").references(() => UsersTable.id),
  },
  (table) => ({
    ratecardsUpdatedByIndex: index("idx_ratecards_updated_by").on(
      table.updatedBy
    ),
  })
);

const RateCardRelations = relations(RatecardTable, ({ one }) => ({
  updatedBy: one(UsersTable, {
    relationName: "updatedBy",
    fields: [RatecardTable.updatedBy],
    references: [UsersTable.id],
  }),
}));

const UserRatecardTable = pgTable(
  "user_ratecards",
  {
    userId: integer("user_id")
      .references(() => UsersTable.id, { onDelete: "cascade" })
      .notNull(),
    ratecardId: integer("ratecard_id")
      .references(() => RatecardTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: integer("updated_by").references(() => UsersTable.id),
  },
  (table) => ({
    userRatecardIndex: index("idx_user_ratecard").on(
      table.userId,
      table.ratecardId
    ),
    userRatecardUpdatedByIndex: index("idx_user_ratecard_updated_by").on(
      table.updatedBy
    ),
  })
);

const UserRatecardRelations = relations(UserRatecardTable, ({ one }) => ({
  user: one(UsersTable, {
    relationName: "user",
    fields: [UserRatecardTable.userId],
    references: [UsersTable.id],
  }),
  ratecard: one(RatecardTable, {
    relationName: "ratecard",
    fields: [UserRatecardTable.ratecardId],
    references: [RatecardTable.id],
  }),
  updatedBy: one(UsersTable, {
    relationName: "updatedBy",
    fields: [UserRatecardTable.updatedBy],
    references: [UsersTable.id],
  }),
}));

const ClientRatecardTable = pgTable(
  "client_ratecards",
  {
    clientId: integer("client_id")
      .references(() => ClientsTable.id, { onDelete: "cascade" })
      .notNull(),
    ratecardId: integer("ratecard_id")
      .references(() => RatecardTable.id, { onDelete: "cascade" })
      .notNull(),
    rate: numeric("rate", { precision: 8, scale: 2 }).default(0),
    currency: text("currency").default("USD"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: integer("updated_by").references(() => UsersTable.id),
  },
  (table) => ({
    clientRatecardIndex: index("idx_client_ratecard").on(
      table.clientId,
      table.ratecardId
    ),
    clientRatecardUpdatedByIndex: index("idx_client_ratecard_updated_by").on(
      table.updatedBy
    ),
  })
);

const ClientRatecardRelations = relations(ClientRatecardTable, ({ one }) => ({
  client: one(ClientsTable, {
    relationName: "client",
    fields: [ClientRatecardTable.clientId],
    references: [ClientsTable.id],
  }),
  ratecard: one(RatecardTable, {
    relationName: "ratecard",
    fields: [ClientRatecardTable.ratecardId],
    references: [RatecardTable.id],
  }),
  updatedBy: one(UsersTable, {
    relationName: "updatedBy",
    fields: [ClientRatecardTable.updatedBy],
    references: [UsersTable.id],
  }),
}));

const AutomationConfigTable = pgTable(
  "automationconfig",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => UsersTable.id),
    itemId: text("item_id"),
    subitemId: text("subitem_id"),
    // Automation has to set on a certian board with specific status/people columns,
    // ...unlike creating logs etc. Thus board id is required
    //
    boardId: text("board_id").notNull(),
    groupId: text("group_id"),
    workspaceId: text("workspace_id").notNull(),
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
    hours: numeric("hours", { precision: 8, scale: 2 }),
    name: text("name"),
    // This will be the user id if schedule is 2
    ratecardId: integer("ratecard_id").references(() => RatecardTable.id, {
      relationName: "ratecard",
    }),
    clientId: integer("client_id").references(() => ClientsTable.id, {
      onDelete: "cascade",
    }),
    category: text("category").default("NB").notNull(),
    // Can be set, can be null, anc can use rate card instead
    ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }),
    currency: text("currency").default("USD"),
    active: boolean("active").default(false),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: integer("updated_by").references(() => UsersTable.id),
  },
  (table) => ({
    ratecardsUserIdIndex: index("idx_automation_config_user_id").on(
      table.userId
    ),
  })
);

const AutomationConfigRelations = relations(
  AutomationConfigTable,
  ({ one }) => ({
    user: one(UsersTable, {
      relationName: "user",
      fields: [AutomationConfigTable.userId],
      references: [UsersTable.id],
    }),
    client: one(ClientsTable, {
      relationName: "client",
      fields: [AutomationConfigTable.clientId],
      references: [ClientsTable.id],
    }),
    updatedBy: one(UsersTable, {
      relationName: "updatedBy",
      fields: [AutomationConfigTable.updatedBy],
      references: [UsersTable.id],
    }),
    rateCard: one(RatecardTable, {
      relationName: "ratecard",
      fields: [AutomationConfigTable.ratecardId],
      references: [RatecardTable.id],
    }),
  })
);

const LogsTable = pgTable(
  "logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => UsersTable.id, { onDelete: "cascade" })
      .notNull(),
    ratecardId: integer("ratecard_id")
      .references(() => RatecardTable.id, { onDelete: "cascade" })
      .notNull(),
    clientId: integer("client_id").references(() => ClientsTable.id, {
      onDelete: "cascade",
    }),
    itemId: text("item_id"),
    subitemId: text("subitem_id"),
    boardId: text("board_id"),
    groupId: text("group_id"),
    workspaceId: text("workspace_id").notNull(),
    targetName: text("target_name"),
    date: timestamp("date").defaultNow().notNull(),
    totalHours: numeric("total_hours", { precision: 8, scale: 2 }),
    billableHours: numeric("billable_hours", { precision: 8, scale: 2 }),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
    updatedBy: integer("updated_by").references(() => UsersTable.id),
    ratePerHour: numeric("rate_per_hour", { precision: 8, scale: 2 }).default(
      null
    ),
    currency: text("currency").default(null),
    // status: 0 = Open, 1 = Pending/submitted, 2 = approved 3 =rejected
    status: integer("status").default(0).notNull(),
  },
  (table) => ({
    logsUserIdIndex: index("idx_logs_user_id").on(table.userId),
    logsRatecardIdIndex: index("idx_logs_ratecard_id").on(table.ratecardId),
    logsClientIdIndex: index("idx_logs_client_id").on(table.clientId),
    logsUpdatedByIndex: index("idx_logs_updated_by").on(table.updatedBy),
  })
);

const LogsRelations = relations(LogsTable, ({ one }) => ({
  user: one(UsersTable, {
    relationName: "user",
    fields: [LogsTable.userId],
    references: [UsersTable.id],
  }),
  ratecard: one(RatecardTable, {
    relationName: "ratecard",
    fields: [LogsTable.ratecardId],
    references: [RatecardTable.id],
  }),
  client: one(ClientsTable, {
    relationName: "client",
    fields: [LogsTable.clientId],
    references: [ClientsTable.id],
  }),
  updatedBy: one(UsersTable, {
    relationName: "updatedBy",
    fields: [LogsTable.updatedBy],
    references: [UsersTable.id],
  }),
}));

export {
  UsersTable,
  UsersRelations,
  ClientsTable,
  ClientsRelations,
  RatecardTable,
  RateCardRelations,
  UserRatecardTable,
  UserRatecardRelations,
  ClientRatecardTable,
  ClientRatecardRelations,
  LogsTable,
  LogsRelations,
  AutomationConfigTable,
  AutomationConfigRelations,
};

const schema = {
  UsersTable,
  UsersRelations,
  ClientsTable,
  ClientsRelations,
  RatecardTable,
  RateCardRelations,
  UserRatecardTable,
  UserRatecardRelations,
  ClientRatecardTable,
  ClientRatecardRelations,
  LogsTable,
  LogsRelations,
  AutomationConfigTable,
  AutomationConfigRelations,
};

export default schema;
