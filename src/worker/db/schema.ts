import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// 1. Users (Pemilik Kos & Penjaga Kos)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
});

// Sessions (HTTP-only Cookie / Bearer Token Session di D1)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  orgId: text('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// 2. Organizations (Akun SaaS Juragan Kos)
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  planTier: text('plan_tier', { enum: ['free', 'pro'] })
    .notNull()
    .default('free'),
  planExpiresAt: text('plan_expires_at'),
  maxRooms: integer('max_rooms').notNull().default(10),
  maxProperties: integer('max_properties').notNull().default(1),
  createdAt: text('created_at').notNull(),
});

// 3. Organization Members (RBAC: Owner vs Penjaga Kos)
export const organizationMembers = sqliteTable('organization_members', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'staff'] }).notNull(),
  // JSON array of property IDs assigned to staff (empty or ["*"] for all in org)
  assignedPropertyIds: text('assigned_property_ids').notNull().default('["*"]'),
  createdAt: text('created_at').notNull(),
});

// 4. Properties (Cabang / Lokasi Kos di Malang)
export const properties = sqliteTable('properties', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  areaMalang: text('area_malang').notNull(), // e.g., "Lowokwaru - Soekarno Hatta", "Sigura-gura", "Sumbersari"
  address: text('address').notNull(),
  genderType: text('gender_type', { enum: ['putra', 'putri', 'campur'] })
    .notNull()
    .default('putra'),
  rulesText: text('rules_text').notNull().default(''),
  bankName: text('bank_name').notNull().default('BCA'),
  bankAccountNumber: text('bank_account_number').notNull().default(''),
  bankAccountHolder: text('bank_account_holder').notNull().default(''),
  qrisImageUrl: text('qris_image_url'),
  isPublicCatalogEnabled: integer('is_public_catalog_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  createdAt: text('created_at').notNull(),
});

// 5. Rooms (Kamar Kos dengan Multi-Siklus Harga)
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  propertyId: text('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  roomNumber: text('room_number').notNull(),
  floor: integer('floor').notNull().default(1),
  typeName: text('type_name').notNull().default('Standar Kamar Mandi Dalam'),
  facilitiesJson: text('facilities_json').notNull().default('["Kasur","Lemari","Meja Belajar","WiFi","KM Dalam"]'),
  status: text('status', { enum: ['available', 'occupied', 'maintenance'] })
    .notNull()
    .default('available'),
  priceMonthly: integer('price_monthly').notNull().default(850000),
  priceQuarterly: integer('price_quarterly'), // 3 Bulanan
  priceSemester: integer('price_semester'),   // 6 Bulanan (khas UB/UM/UMM)
  priceYearly: integer('price_yearly'),       // Tahunan
  photosJson: text('photos_json').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
});

// 6. Tenants (Data Anak Kos + Kontak Darurat Orang Tua)
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  orgId: text('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  phoneWa: text('phone_wa').notNull(),
  idCardNumber: text('id_card_number').notNull().default(''),
  idCardPhotoR2Key: text('id_card_photo_r2_key'),
  universityOrWork: text('university_or_work').notNull().default(''), // e.g., "Mahasiswa UB - FEB", "Mahasiswa UM"
  originCity: text('origin_city').notNull().default(''),
  emergencyContactName: text('emergency_contact_name').notNull().default(''),
  emergencyContactPhone: text('emergency_contact_phone').notNull().default(''),
  emergencyContactRelation: text('emergency_contact_relation').notNull().default('Orang Tua'),
  createdAt: text('created_at').notNull(),
});

// 7. Leases (Kontrak Sewa, Biaya Tambahan Rutin & Deposit)
export const leases = sqliteTable('leases', {
  id: text('id').primaryKey(),
  propertyId: text('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  roomId: text('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  billingCycle: text('billing_cycle', {
    enum: ['monthly', 'quarterly', 'semester', 'yearly'],
  })
    .notNull()
    .default('monthly'),
  startDate: text('start_date').notNull(),
  nextDueDate: text('next_due_date').notNull(),
  endDate: text('end_date'),
  baseRentAmount: integer('base_rent_amount').notNull(),
  // JSON array: [{ label: "Sekamar Berdua", amount: 200000 }, { label: "Iuran Sampah & WiFi", amount: 50000 }]
  recurringAddonsJson: text('recurring_addons_json').notNull().default('[]'),
  depositAmount: integer('deposit_amount').notNull().default(0),
  depositStatus: text('deposit_status', {
    enum: ['held', 'refunded', 'deducted'],
  })
    .notNull()
    .default('held'),
  depositNotes: text('deposit_notes').notNull().default(''),
  status: text('status', { enum: ['active', 'ended'] })
    .notNull()
    .default('active'),
  createdAt: text('created_at').notNull(),
});

// 8. Invoices (Tagihan, Biaya Tambahan Insidental & Verifikasi Bukti Bayar)
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  leaseId: text('lease_id')
    .notNull()
    .references(() => leases.id, { onDelete: 'cascade' }),
  propertyId: text('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceNumber: text('invoice_number').notNull().unique(),
  publicToken: text('public_token').notNull().unique(),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  dueDate: text('due_date').notNull(),
  baseAmount: integer('base_amount').notNull(),
  // JSON array: [{ label: "Parkir Mobil", amount: 150000 }, { label: "Denda Telat", amount: 50000 }]
  additionalItemsJson: text('additional_items_json').notNull().default('[]'),
  discountAmount: integer('discount_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull(),
  paidAmount: integer('paid_amount').notNull().default(0),
  status: text('status', {
    enum: ['unpaid', 'waiting_verification', 'partial', 'paid', 'overdue'],
  })
    .notNull()
    .default('unpaid'),
  paymentProofR2Key: text('payment_proof_r2_key'),
  paidAt: text('paid_at'),
  verifiedByUserId: text('verified_by_user_id'),
  notes: text('notes').notNull().default(''),
  createdAt: text('created_at').notNull(),
});

// 9. Expenses (Pengeluaran Operasional Kos)
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  propertyId: text('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  recordedByUserId: text('recorded_by_user_id')
    .notNull()
    .references(() => users.id),
  category: text('category', {
    enum: [
      'electricity',
      'water',
      'internet',
      'maintenance',
      'staff_salary',
      'tax_retribution',
      'other',
    ],
  })
    .notNull()
    .default('other'),
  title: text('title').notNull(),
  amount: integer('amount').notNull(),
  expenseDate: text('expense_date').notNull(),
  receiptPhotoR2Key: text('receipt_photo_r2_key'),
  notes: text('notes').notNull().default(''),
  createdAt: text('created_at').notNull(),
});

// 10. Maintenance Tickets (Komplain Kerusakan Fasilitas dari Anak Kos)
export const maintenanceTickets = sqliteTable('maintenance_tickets', {
  id: text('id').primaryKey(),
  propertyId: text('property_id')
    .notNull()
    .references(() => properties.id, { onDelete: 'cascade' }),
  roomId: text('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  reporterName: text('reporter_name').notNull(),
  reporterWa: text('reporter_wa').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  photoR2Key: text('photo_r2_key'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] })
    .notNull()
    .default('medium'),
  status: text('status', { enum: ['open', 'in_progress', 'resolved'] })
    .notNull()
    .default('open'),
  expenseId: text('expense_id'),
  createdAt: text('created_at').notNull(),
  resolvedAt: text('resolved_at'),
});
