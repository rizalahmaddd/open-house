import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import {
  users,
  organizations,
  organizationMembers,
  properties,
  rooms,
  tenants,
  leases,
  invoices,
  expenses,
  maintenanceTickets,
} from './schema';
import { hashPassword } from '../utils/crypto';

export async function ensureDemoMalangData(d1: D1Database) {
  const db = drizzle(d1);
  const orgId = 'org_malang_demo01';
  const propId = 'prop_suhat_01';

  const existingLease5 = await db
    .select()
    .from(leases)
    .where(eq(leases.id, 'lse_05'))
    .limit(1);

  if (existingLease5.length > 0) {
    // Ensure existing demo data uses universal OpenHouse branding (no regional lock-in)
    await db
      .update(organizations)
      .set({ name: 'Griya Harmoni Kos Group' })
      .where(eq(organizations.id, orgId));
    await db
      .update(properties)
      .set({
        name: 'Kos Putra Griya Harmoni',
        areaMalang: 'Jakarta Selatan - Setiabudi (Kawasan Kampus & Perkantoran)',
        address: 'Jl. Karet Pedurenan No. 24, Setiabudi, Jakarta Selatan',
      })
      .where(eq(properties.id, propId));
    await db
      .update(expenses)
      .set({ title: 'Tagihan Air PAM Bulanan Kos' })
      .where(eq(expenses.id, 'exp_03'));
    return { alreadySeeded: true };
  }

  const now = new Date().toISOString();
  const passwordHash = await hashPassword('malang123');

  const ownerId = 'usr_owner_malang01';
  const staffId = 'usr_staff_malang01';

  // 1. Insert Owner & Staff Users
  await db
    .insert(users)
    .values([
      {
        id: ownerId,
        name: 'H. Bambang Sudjatmiko',
        phone: '081233445566',
        email: 'juragan@malangkos.id',
        passwordHash,
        createdAt: now,
      },
      {
        id: staffId,
        name: 'Pak Slamet (Penjaga Kos)',
        phone: '085649112233',
        email: 'penjaga@malangkos.id',
        passwordHash,
        createdAt: now,
      },
    ])
    .onConflictDoNothing();

  // 2. Insert Organization
  await db
    .insert(organizations)
    .values({
      id: orgId,
      ownerId,
      name: 'Griya Harmoni Kos Group',
      planTier: 'free',
      planExpiresAt: null,
      maxRooms: 10,
      maxProperties: 1,
      createdAt: now,
    })
    .onConflictDoNothing();

  // 3. Insert Organization Members (RBAC)
  await db
    .insert(organizationMembers)
    .values([
      {
        id: 'mem_owner_01',
        orgId,
        userId: ownerId,
        role: 'owner',
        assignedPropertyIds: '["*"]',
        createdAt: now,
      },
      {
        id: 'mem_staff_01',
        orgId,
        userId: staffId,
        role: 'staff',
        assignedPropertyIds: '["prop_suhat_01"]',
        createdAt: now,
      },
    ])
    .onConflictDoNothing();

  // 4. Insert Property
  await db
    .insert(properties)
    .values({
      id: propId,
      orgId,
      name: 'Kos Putra Griya Harmoni',
      slug: 'griya-brawijaya-suhat',
      areaMalang: 'Jakarta Selatan - Setiabudi (Kawasan Kampus & Perkantoran)',
      address: 'Jl. Karet Pedurenan No. 24, Setiabudi, Jakarta Selatan',
      genderType: 'putra',
      rulesText:
        'Jam malam tamu lawan jenis maks 21.00 WIB. Dilarang membawa hewan peliharaan. Kunci gerbang dibawa masing-masing penghuni.',
      bankName: 'BCA',
      bankAccountNumber: '8160992831',
      bankAccountHolder: 'Bambang Sudjatmiko',
      qrisImageUrl: null,
      isPublicCatalogEnabled: true,
      createdAt: now,
    })
    .onConflictDoNothing();

  // 5. Insert 8 Rooms (so usage is 8/10 on Free tier — right near the limit!)
  const roomRows = [
    {
      id: 'rm_suhat_101',
      propertyId: propId,
      roomNumber: '101',
      floor: 1,
      typeName: 'VIP KM Dalam + Water Heater',
      facilitiesJson: '["Kasur Springbed","KM Dalam","Water Heater","Meja Belajar","WiFi 100Mbps"]',
      status: 'occupied' as const,
      priceMonthly: 1150000,
      priceQuarterly: 3300000,
      priceSemester: 6300000,
      priceYearly: 12000000,
      photosJson: '[]',
      createdAt: now,
    },
    {
      id: 'rm_suhat_102',
      propertyId: propId,
      roomNumber: '102',
      floor: 1,
      typeName: 'VIP KM Dalam + Water Heater',
      facilitiesJson: '["Kasur Springbed","KM Dalam","Water Heater","Meja Belajar","WiFi 100Mbps"]',
      status: 'occupied' as const,
      priceMonthly: 1150000,
      priceQuarterly: 3300000,
      priceSemester: 6300000,
      priceYearly: 12000000,
      photosJson: '[]',
      createdAt: now,
    },
    {
      id: 'rm_suhat_103',
      propertyId: propId,
      roomNumber: '103',
      floor: 1,
      typeName: 'Reguler KM Dalam',
      facilitiesJson: '["Kasur","KM Dalam","Lemari Jati","Meja Belajar","WiFi"]',
      status: 'occupied' as const,
      priceMonthly: 900000,
      priceQuarterly: 2600000,
      priceSemester: 5000000,
      priceYearly: 9500000,
      photosJson: '[]',
      createdAt: now,
    },
    {
      id: 'rm_suhat_104',
      propertyId: propId,
      roomNumber: '104',
      floor: 1,
      typeName: 'Reguler KM Dalam',
      facilitiesJson: '["Kasur","KM Dalam","Lemari Jati","Meja Belajar","WiFi"]',
      status: 'available' as const,
      priceMonthly: 900000,
      priceQuarterly: 2600000,
      priceSemester: 5000000,
      priceYearly: 9500000,
      photosJson: '[]',
      createdAt: now,
    },
    {
      id: 'rm_suhat_201',
      propertyId: propId,
      roomNumber: '201',
      floor: 2,
      typeName: 'Reguler KM Dalam Balkon',
      facilitiesJson: '["Kasur","KM Dalam","Balkon","Meja Belajar","WiFi"]',
      status: 'occupied' as const,
      priceMonthly: 950000,
      priceQuarterly: 2750000,
      priceSemester: 5300000,
      priceYearly: 10000000,
      photosJson: '[]',
      createdAt: now,
    },
    {
      id: 'rm_suhat_202',
      propertyId: propId,
      roomNumber: '202',
      floor: 2,
      typeName: 'Reguler KM Dalam Balkon',
      facilitiesJson: '["Kasur","KM Dalam","Balkon","Meja Belajar","WiFi"]',
      status: 'available' as const,
      priceMonthly: 950000,
      priceQuarterly: 2750000,
      priceSemester: 5300000,
      priceYearly: 10000000,
      photosJson: '[]',
      createdAt: now,
    },
    {
      id: 'rm_suhat_203',
      propertyId: propId,
      roomNumber: '203',
      floor: 2,
      typeName: 'Ekonomis Mahasiswa',
      facilitiesJson: '["Kasur","KM Luar Bersih","Lemari","Meja Belajar","WiFi"]',
      status: 'occupied' as const,
      priceMonthly: 700000,
      priceQuarterly: 2000000,
      priceSemester: 3900000,
      priceYearly: 7500000,
      photosJson: '[]',
      createdAt: now,
    },
    {
      id: 'rm_suhat_204',
      propertyId: propId,
      roomNumber: '204',
      floor: 2,
      typeName: 'Ekonomis Mahasiswa',
      facilitiesJson: '["Kasur","KM Luar Bersih","Lemari","Meja Belajar","WiFi"]',
      status: 'maintenance' as const,
      priceMonthly: 700000,
      priceQuarterly: 2000000,
      priceSemester: 3900000,
      priceYearly: 7500000,
      photosJson: '[]',
      createdAt: now,
    },
  ];
  // Insert rooms one by one to stay well under Cloudflare D1's 100 SQLite parameter limit per query
  for (const rm of roomRows) {
    await db.insert(rooms).values(rm).onConflictDoNothing();
  }

  // 6. Insert Tenants (Mahasiswa UB, Polinema, UM, UMM)
  const tenantRows = [
    {
      id: 'tnt_01',
      orgId,
      fullName: 'Raka Pratama Putra',
      phoneWa: '081234567801',
      idCardNumber: '3578041205040001',
      universityOrWork: 'Mahasiswa UB - Fakultas Ilmu Komputer',
      originCity: 'Surabaya',
      emergencyContactName: 'Bpk. Hendra Putra (Ayah)',
      emergencyContactPhone: '08113224455',
      emergencyContactRelation: 'Orang Tua',
      createdAt: now,
    },
    {
      id: 'tnt_02',
      orgId,
      fullName: 'Dimas Wahyu Saputra',
      phoneWa: '085733112299',
      idCardNumber: '3507180901050002',
      universityOrWork: 'Mahasiswa Polinema - Teknik Sipil',
      originCity: 'Kediri',
      emergencyContactName: 'Ibu Sri Wahyuni (Ibu)',
      emergencyContactPhone: '081335667788',
      emergencyContactRelation: 'Orang Tua',
      createdAt: now,
    },
    {
      id: 'tnt_03',
      orgId,
      fullName: 'Naufal Azhar Ramadhan',
      phoneWa: '082144556677',
      idCardNumber: '3174051508040003',
      universityOrWork: 'Mahasiswa UB - Fakultas Ekonomi & Bisnis',
      originCity: 'Jakarta Selatan',
      emergencyContactName: 'Bpk. Kurniawan (Ayah)',
      emergencyContactPhone: '081288990011',
      emergencyContactRelation: 'Orang Tua',
      createdAt: now,
    },
    {
      id: 'tnt_04',
      orgId,
      fullName: 'Bagas Adi Nugroho',
      phoneWa: '081355667788',
      idCardNumber: '3573021103050004',
      universityOrWork: 'Mahasiswa UM - Sastra Inggris',
      originCity: 'Banyuwangi',
      emergencyContactName: 'Bpk. Supriyadi (Ayah)',
      emergencyContactPhone: '081233998877',
      emergencyContactRelation: 'Orang Tua',
      createdAt: now,
    },
    {
      id: 'tnt_05',
      orgId,
      fullName: 'Farhan Maulana',
      phoneWa: '085899001122',
      idCardNumber: '3515082207040005',
      universityOrWork: 'Mahasiswa UMM - Teknik Informatika',
      originCity: 'Sidoarjo',
      emergencyContactName: 'Ibu Nurhayati (Ibu)',
      emergencyContactPhone: '081344556611',
      emergencyContactRelation: 'Orang Tua',
      createdAt: now,
    },
  ];
  for (const t of tenantRows) {
    await db.insert(tenants).values(t).onConflictDoNothing();
  }

  // 7. Insert Leases
  const leaseRows = [
    {
      id: 'lse_01',
      propertyId: propId,
      roomId: 'rm_suhat_101',
      tenantId: 'tnt_01',
      billingCycle: 'semester' as const,
      startDate: '2026-08-01',
      nextDueDate: '2027-02-01',
      baseRentAmount: 6300000,
      recurringAddonsJson: '[{"label":"Parkir Mobil","amount":600000}]',
      depositAmount: 500000,
      depositStatus: 'held' as const,
      depositNotes: 'Deposit kunci & remote pagar',
      status: 'active' as const,
      createdAt: now,
    },
    {
      id: 'lse_02',
      propertyId: propId,
      roomId: 'rm_suhat_102',
      tenantId: 'tnt_02',
      billingCycle: 'monthly' as const,
      startDate: '2026-06-05',
      nextDueDate: '2026-11-05',
      baseRentAmount: 1150000,
      recurringAddonsJson: '[{"label":"Iuran Sampah & Kebersihan","amount":30000}]',
      depositAmount: 300000,
      depositStatus: 'held' as const,
      depositNotes: 'Deposit kunci kamar',
      status: 'active' as const,
      createdAt: now,
    },
    {
      id: 'lse_03',
      propertyId: propId,
      roomId: 'rm_suhat_103',
      tenantId: 'tnt_03',
      billingCycle: 'monthly' as const,
      startDate: '2026-09-01',
      nextDueDate: '2026-11-01',
      baseRentAmount: 900000,
      recurringAddonsJson: '[]',
      depositAmount: 250000,
      depositStatus: 'held' as const,
      depositNotes: 'Lunas saat check-in',
      status: 'active' as const,
      createdAt: now,
    },
    {
      id: 'lse_04',
      propertyId: propId,
      roomId: 'rm_suhat_201',
      tenantId: 'tnt_04',
      billingCycle: 'quarterly' as const,
      startDate: '2026-09-15',
      nextDueDate: '2026-12-15',
      baseRentAmount: 2750000,
      recurringAddonsJson: '[{"label":"Tambahan Sekamar Berdua","amount":450000}]',
      depositAmount: 300000,
      depositStatus: 'held' as const,
      depositNotes: 'Deposit 2 set kunci kamar',
      status: 'active' as const,
      createdAt: now,
    },
    {
      id: 'lse_05',
      propertyId: propId,
      roomId: 'rm_suhat_203',
      tenantId: 'tnt_05',
      billingCycle: 'yearly' as const,
      startDate: '2026-07-20',
      nextDueDate: '2027-07-20',
      baseRentAmount: 7500000,
      recurringAddonsJson: '[]',
      depositAmount: 400000,
      depositStatus: 'held' as const,
      depositNotes: 'Sewa 1 tahun mahasiswa baru UMM',
      status: 'active' as const,
      createdAt: now,
    },
  ];
  for (const l of leaseRows) {
    await db.insert(leases).values(l).onConflictDoNothing();
  }

  // 8. Insert Invoices
  await db.insert(invoices).values([
    {
      id: 'inv_01',
      leaseId: 'lse_01',
      propertyId: propId,
      tenantId: 'tnt_01',
      invoiceNumber: 'INV/2026/11/001',
      publicToken: 'tk_brawijaya_001',
      periodStart: '2026-08-01',
      periodEnd: '2027-01-31',
      dueDate: '2026-08-05',
      baseAmount: 6300000,
      additionalItemsJson: '[{"label":"Parkir Mobil (6 Bulan)","amount":600000}]',
      discountAmount: 0,
      totalAmount: 6900000,
      paidAmount: 6900000,
      status: 'paid',
      paidAt: '2026-08-02T10:15:00Z',
      verifiedByUserId: ownerId,
      notes: 'Lunas sewa semester ganjil UB',
      createdAt: now,
    },
    {
      id: 'inv_02',
      leaseId: 'lse_02',
      propertyId: propId,
      tenantId: 'tnt_02',
      invoiceNumber: 'INV/2026/11/002',
      publicToken: 'tk_brawijaya_002',
      periodStart: '2026-11-05',
      periodEnd: '2026-12-04',
      dueDate: '2026-11-05',
      baseAmount: 1150000,
      additionalItemsJson: '[{"label":"Iuran Sampah & Kebersihan","amount":30000}]',
      discountAmount: 0,
      totalAmount: 1180000,
      paidAmount: 0,
      status: 'waiting_verification',
      notes: 'Penghuni sudah upload bukti transfer BCA',
      createdAt: now,
    },
    {
      id: 'inv_03',
      leaseId: 'lse_03',
      propertyId: propId,
      tenantId: 'tnt_03',
      invoiceNumber: 'INV/2026/11/003',
      publicToken: 'tk_brawijaya_003',
      periodStart: '2026-11-01',
      periodEnd: '2026-11-30',
      dueDate: '2026-11-01',
      baseAmount: 900000,
      additionalItemsJson: '[{"label":"Denda Keterlambatan","amount":25000}]',
      discountAmount: 0,
      totalAmount: 925000,
      paidAmount: 0,
      status: 'overdue',
      notes: 'Lewat jatuh tempo 2 hari',
      createdAt: now,
    },
  ]).onConflictDoNothing();

  // 9. Insert Expenses
  await db.insert(expenses).values([
    {
      id: 'exp_01',
      propertyId: propId,
      recordedByUserId: staffId,
      category: 'internet',
      title: 'Langganan WiFi Biznet Home 100Mbps November',
      amount: 435000,
      expenseDate: '2026-11-01',
      notes: 'Dibayar via m-banking',
      createdAt: now,
    },
    {
      id: 'exp_02',
      propertyId: propId,
      recordedByUserId: staffId,
      category: 'electricity',
      title: 'Token Listrik Pompa Air & Lampu Lorong Kos',
      amount: 350000,
      expenseDate: '2026-11-02',
      notes: 'Token PLN 200rb + 150rb',
      createdAt: now,
    },
    {
      id: 'exp_03',
      propertyId: propId,
      recordedByUserId: ownerId,
      category: 'water',
      title: 'Tagihan Air PAM Bulanan Kos',
      amount: 285000,
      expenseDate: '2026-11-02',
      notes: 'Pemakaian Oktober-November',
      createdAt: now,
    },
  ]).onConflictDoNothing();

  // 10. Insert Maintenance Tickets
  await db.insert(maintenanceTickets).values([
    {
      id: 'tkt_01',
      propertyId: propId,
      roomId: 'rm_suhat_204',
      reporterName: 'Pak Slamet (Cek Kamar)',
      reporterWa: '085649112233',
      title: 'Shower & Kran Kamar Mandi Kamar 204 Rembes',
      description: 'Seal kran shower aus, sedang diganti tukang sebelum kamar disewakan lagi.',
      priority: 'high',
      status: 'in_progress',
      createdAt: now,
    },
    {
      id: 'tkt_02',
      propertyId: propId,
      roomId: 'rm_suhat_102',
      reporterName: 'Dimas Wahyu (Kamar 102)',
      reporterWa: '085733112299',
      title: 'Lampu Teras Depan Kamar 102 Putus',
      description: 'Mohon diganti bohlam LED teras depan kamar 102 karena berkedip.',
      priority: 'low',
      status: 'open',
      createdAt: now,
    },
  ]).onConflictDoNothing();

  return { alreadySeeded: false };
}
