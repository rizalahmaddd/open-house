import React, { useState, useEffect } from 'react';
import {
  Plus,
  UserPlus,
  LogOut as CheckOutIcon,
  Edit3,
  Trash2,
  ArrowRightLeft,
  Phone,
  IdCard,
  GraduationCap,
  ShieldAlert,
  CheckCircle2,
  Upload,
  X,
  Search,
  History,
  DoorOpen,
  Wrench,
  Calendar,
  Wallet,
  MessageCircle,
} from 'lucide-react';
import { uploadFileToR2 } from '../utils/image';

export interface RoomRecord {
  id: string;
  propertyId: string;
  roomNumber: string;
  floor: number;
  typeName: string;
  facilitiesJson?: string;
  status: 'available' | 'occupied' | 'maintenance';
  priceMonthly: number;
  priceQuarterly: number | null;
  priceSemester: number | null;
  priceYearly: number | null;
}

export interface LeaseRecord {
  leaseId: string;
  propertyId: string;
  roomId: string;
  tenantId: string;
  billingCycle: 'monthly' | 'quarterly' | 'semester' | 'yearly';
  startDate: string;
  nextDueDate: string;
  endDate: string | null;
  baseRentAmount: number;
  recurringAddons: Array<{ label: string; amount: number }>;
  depositAmount: number;
  depositStatus: 'held' | 'refunded' | 'deducted';
  depositNotes: string;
  leaseStatus: 'active' | 'ended';
  roomNumber: string;
  roomFloor: number;
  roomTypeName: string;
  propertyName: string;
  fullName: string;
  phoneWa: string;
  idCardNumber: string;
  idCardPhotoR2Key: string | null;
  idCardPhotoUrl: string | null;
  universityOrWork: string;
  originCity: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
}

interface Props {
  rooms: RoomRecord[];
  leases: LeaseRecord[];
  defaultPropertyId: string;
  token: string | null;
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
  onNotifySuccess: (msg: string) => void;
  onNotifyError: (msg: string) => void;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const CYCLE_LABELS: Record<string, string> = {
  monthly: 'Bulanan',
  quarterly: '3 Bulanan',
  semester: 'Semester (6 Bln)',
  yearly: 'Tahunan',
};

export default function RoomsAndTenantsTab({
  rooms,
  leases,
  defaultPropertyId,
  token,
  apiFetch,
  onRefresh,
  onNotifySuccess,
  onNotifyError,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'available' | 'occupied' | 'maintenance'
  >(() => {
    const s = new URLSearchParams(window.location.search).get('status');
    if (s === 'available' || s === 'occupied' || s === 'maintenance') return s;
    return 'all';
  });

  const changeStatusFilter = (
    newStatus: 'all' | 'available' | 'occupied' | 'maintenance'
  ) => {
    setStatusFilter(newStatus);
    const url = new URL(window.location.href);
    if (newStatus === 'all') {
      url.searchParams.delete('status');
    } else {
      url.searchParams.set('status', newStatus);
    }
    window.history.replaceState({}, '', url.pathname + url.search);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [viewHistory, setViewHistory] = useState(false);

  // Room Add/Edit Modal State
  const [editingRoom, setEditingRoom] = useState<RoomRecord | null>(null);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [rmNumber, setRmNumber] = useState('');
  const [rmFloor, setRmFloor] = useState('1');
  const [rmType, setRmType] = useState('Reguler KM Dalam');
  const [rmStatus, setRmStatus] = useState<
    'available' | 'occupied' | 'maintenance'
  >('available');
  const [rmMonthly, setRmMonthly] = useState('900000');
  const [rmQuarterly, setRmQuarterly] = useState('2600000');
  const [rmSemester, setRmSemester] = useState('5000000');
  const [rmYearly, setRmYearly] = useState('9500000');
  const [rmFacilities, setRmFacilities] = useState(
    'Kasur, KM Dalam, Lemari, Meja Belajar, WiFi'
  );

  // Check-in Modal State
  const [checkinRoom, setCheckinRoom] = useState<RoomRecord | null>(null);
  const [ciName, setCiName] = useState('');
  const [ciPhone, setCiPhone] = useState('');
  const [ciNik, setCiNik] = useState('');
  const [ciKtpKey, setCiKtpKey] = useState<string | null>(null);
  const [ciKtpPreview, setCiKtpPreview] = useState<string | null>(null);
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [ciKampus, setCiKampus] = useState('Mahasiswa UB');
  const [ciOrigin, setCiOrigin] = useState('');
  const [ciParentName, setCiParentName] = useState('');
  const [ciParentPhone, setCiParentPhone] = useState('');
  const [ciParentRel, setCiParentRel] = useState('Orang Tua (Ayah/Ibu)');
  const [ciCycle, setCiCycle] = useState<
    'monthly' | 'quarterly' | 'semester' | 'yearly'
  >('semester');
  const [ciStartDate, setCiStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [ciBaseRent, setCiBaseRent] = useState('5000000');
  const [ciAddons, setCiAddons] = useState<
    Array<{ label: string; amount: number }>
  >([]);
  const [ciDeposit, setCiDeposit] = useState('300000');
  const [ciDepositNotes, setCiDepositNotes] = useState(
    'Deposit kunci kamar & gerbang'
  );
  const [ciPaymentStatus, setCiPaymentStatus] = useState<'paid' | 'unpaid'>(
    'paid'
  );
  const [submitting, setSubmitting] = useState(false);

  // Check-out Modal State
  const [checkoutLease, setCheckoutLease] = useState<LeaseRecord | null>(null);
  const [coDepositStatus, setCoDepositStatus] = useState<
    'refunded' | 'deducted'
  >('refunded');
  const [coDepositNotes, setCoDepositNotes] = useState('');
  const [coNextRoomStatus, setCoNextRoomStatus] = useState<
    'available' | 'maintenance'
  >('available');

  // Move Room Modal State
  const [moveLease, setMoveLease] = useState<LeaseRecord | null>(null);
  const [targetMoveRoomId, setTargetMoveRoomId] = useState('');

  // Slide-over Detail Drawer for Occupied Room / Tenant
  const [selectedLeaseDrawer, setSelectedLeaseDrawer] =
    useState<LeaseRecord | null>(null);

  // Close modals/drawers on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowRoomModal(false);
        setCheckinRoom(null);
        setCheckoutLease(null);
        setMoveLease(null);
        setSelectedLeaseDrawer(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const activeLeasesByRoom = new Map<string, LeaseRecord>();
  leases
    .filter((l) => l.leaseStatus === 'active')
    .forEach((l) => activeLeasesByRoom.set(l.roomId, l));

  const endedLeases = leases.filter((l) => l.leaseStatus === 'ended');
  const availableRooms = rooms.filter((r) => r.status === 'available');
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied');
  const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance');

  const filteredRooms = rooms.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const lse = activeLeasesByRoom.get(r.id);
    return (
      r.roomNumber.toLowerCase().includes(q) ||
      r.typeName.toLowerCase().includes(q) ||
      (lse && lse.fullName.toLowerCase().includes(q)) ||
      (lse && lse.universityOrWork.toLowerCase().includes(q))
    );
  });

  const openAddRoomModal = () => {
    setEditingRoom(null);
    setRmNumber('');
    setRmFloor('1');
    setRmType('Reguler KM Dalam');
    setRmStatus('available');
    setRmMonthly('900000');
    setRmQuarterly('2600000');
    setRmSemester('5000000');
    setRmYearly('9500000');
    setRmFacilities('Kasur, KM Dalam, Lemari, Meja Belajar, WiFi');
    setShowRoomModal(true);
  };

  const openEditRoomModal = (rm: RoomRecord) => {
    setEditingRoom(rm);
    setRmNumber(rm.roomNumber);
    setRmFloor(String(rm.floor));
    setRmType(rm.typeName);
    setRmStatus(rm.status);
    setRmMonthly(String(rm.priceMonthly));
    setRmQuarterly(rm.priceQuarterly ? String(rm.priceQuarterly) : '');
    setRmSemester(rm.priceSemester ? String(rm.priceSemester) : '');
    setRmYearly(rm.priceYearly ? String(rm.priceYearly) : '');
    try {
      const parsed = rm.facilitiesJson ? JSON.parse(rm.facilitiesJson) : [];
      setRmFacilities(Array.isArray(parsed) ? parsed.join(', ') : '');
    } catch {
      setRmFacilities('Kasur, KM Dalam, Lemari, Meja Belajar, WiFi');
    }
    setShowRoomModal(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const facilities = rmFacilities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      if (editingRoom) {
        await apiFetch(`/api/rooms/${editingRoom.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            roomNumber: rmNumber,
            floor: Number(rmFloor),
            typeName: rmType,
            status: rmStatus,
            facilities,
            priceMonthly: Number(rmMonthly),
            priceQuarterly: rmQuarterly ? Number(rmQuarterly) : null,
            priceSemester: rmSemester ? Number(rmSemester) : null,
            priceYearly: rmYearly ? Number(rmYearly) : null,
          }),
        });
        onNotifySuccess(`Data Kamar ${rmNumber} berhasil diperbarui!`);
      } else {
        await apiFetch('/api/rooms', {
          method: 'POST',
          body: JSON.stringify({
            propertyId: defaultPropertyId,
            roomNumber: rmNumber,
            floor: Number(rmFloor),
            typeName: rmType,
            status: rmStatus,
            facilities,
            priceMonthly: Number(rmMonthly),
            priceQuarterly: rmQuarterly ? Number(rmQuarterly) : null,
            priceSemester: rmSemester ? Number(rmSemester) : null,
            priceYearly: rmYearly ? Number(rmYearly) : null,
          }),
        });
        onNotifySuccess(`Kamar ${rmNumber} berhasil ditambahkan!`);
      }
      setShowRoomModal(false);
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (rm: RoomRecord) => {
    try {
      await apiFetch(`/api/rooms/${rm.id}`, { method: 'DELETE' });
      onNotifySuccess(`Kamar ${rm.roomNumber} berhasil dihapus.`);
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    }
  };

  const openCheckinForRoom = (rm: RoomRecord) => {
    setCheckinRoom(rm);
    setCiName('');
    setCiPhone('');
    setCiNik('');
    setCiKtpKey(null);
    setCiKtpPreview(null);
    setCiKampus('Mahasiswa UB');
    setCiOrigin('');
    setCiParentName('');
    setCiParentPhone('');
    setCiParentRel('Orang Tua (Ayah/Ibu)');
    setCiCycle('semester');
    setCiBaseRent(String(rm.priceSemester || rm.priceMonthly * 5.5));
    setCiAddons([]);
    setCiDeposit('300000');
    setCiDepositNotes('Deposit kunci kamar & gerbang');
    setCiPaymentStatus('paid');
  };

  const handleCycleChange = (
    cycle: 'monthly' | 'quarterly' | 'semester' | 'yearly'
  ) => {
    setCiCycle(cycle);
    if (!checkinRoom) return;
    if (cycle === 'monthly') setCiBaseRent(String(checkinRoom.priceMonthly));
    if (cycle === 'quarterly')
      setCiBaseRent(
        String(
          checkinRoom.priceQuarterly ||
            Math.round(checkinRoom.priceMonthly * 2.85)
        )
      );
    if (cycle === 'semester')
      setCiBaseRent(
        String(
          checkinRoom.priceSemester ||
            Math.round(checkinRoom.priceMonthly * 5.5)
        )
      );
    if (cycle === 'yearly')
      setCiBaseRent(
        String(
          checkinRoom.priceYearly || Math.round(checkinRoom.priceMonthly * 11)
        )
      );
  };

  const handleKtpFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKtp(true);
    try {
      const uploaded = await uploadFileToR2(file, 'ktp', token);
      setCiKtpKey(uploaded.key);
      setCiKtpPreview(uploaded.url);
      onNotifySuccess(
        'Foto KTP berhasil disimpan dengan aman!'
      );
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setUploadingKtp(false);
    }
  };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinRoom) return;
    setSubmitting(true);
    try {
      await apiFetch('/api/tenants-leases/checkin', {
        method: 'POST',
        body: JSON.stringify({
          roomId: checkinRoom.id,
          fullName: ciName,
          phoneWa: ciPhone,
          idCardNumber: ciNik,
          idCardPhotoR2Key: ciKtpKey,
          universityOrWork: ciKampus,
          originCity: ciOrigin,
          emergencyContactName: ciParentName,
          emergencyContactPhone: ciParentPhone,
          emergencyContactRelation: ciParentRel,
          billingCycle: ciCycle,
          startDate: ciStartDate,
          baseRentAmount: Number(ciBaseRent),
          recurringAddons: ciAddons,
          depositAmount: Number(ciDeposit),
          depositNotes: ciDepositNotes,
          initialPaymentStatus: ciPaymentStatus,
        }),
      });
      setCheckinRoom(null);
      onNotifySuccess(
        `Check-in ${ciName} di Kamar ${checkinRoom.roomNumber} berhasil dicatat beserta tagihan awal!`
      );
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutLease) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/tenants-leases/${checkoutLease.leaseId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({
          depositStatus: coDepositStatus,
          depositNotes: coDepositNotes,
          nextRoomStatus: coNextRoomStatus,
        }),
      });
      const prevRoom = checkoutLease.roomNumber;
      const prevTenant = checkoutLease.fullName;
      setCheckoutLease(null);
      setSelectedLeaseDrawer(null);
      onNotifySuccess(
        `Check-out ${prevTenant} selesai. Kamar ${prevRoom} kini berstatus ${
          coNextRoomStatus === 'available' ? 'Kosong (Siap Huni)' : 'Perbaikan'
        }.`
      );
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMoveRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveLease || !targetMoveRoomId) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/tenants-leases/${moveLease.leaseId}/move-room`, {
        method: 'POST',
        body: JSON.stringify({
          targetRoomId: targetMoveRoomId,
        }),
      });
      setMoveLease(null);
      setSelectedLeaseDrawer(null);
      onNotifySuccess(
        `Penghuni ${moveLease.fullName} berhasil dipindahkan ke kamar baru!`
      );
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Interactive Status Summary Cards (Tappable Filter Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => changeStatusFilter('all')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                statusFilter === 'all' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              Total Kamar
            </span>
            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
          </div>
          <strong className="text-2xl sm:text-3xl font-extrabold mt-2 block tracking-tight">
            {rooms.length}
          </strong>
        </button>

        <button
          type="button"
          onClick={() => changeStatusFilter('occupied')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            statusFilter === 'occupied'
              ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                statusFilter === 'occupied'
                  ? 'text-emerald-200'
                  : 'text-slate-500'
              }`}
            >
              Terisi Aktif
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </div>
          <strong className="text-2xl sm:text-3xl font-extrabold mt-2 block tracking-tight">
            {occupiedRooms.length}
          </strong>
        </button>

        <button
          type="button"
          onClick={() => changeStatusFilter('available')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            statusFilter === 'available'
              ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                statusFilter === 'available'
                  ? 'text-emerald-200'
                  : 'text-slate-500'
              }`}
            >
              Kosong Siap Huni
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          </div>
          <strong className="text-2xl sm:text-3xl font-extrabold mt-2 block tracking-tight">
            {availableRooms.length}
          </strong>
        </button>

        <button
          type="button"
          onClick={() => changeStatusFilter('maintenance')}
          className={`p-4 sm:p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
            statusFilter === 'maintenance'
              ? 'bg-amber-800 text-white border-amber-800 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between w-full gap-2">
            <span
              className={`text-xs font-semibold truncate ${
                statusFilter === 'maintenance'
                  ? 'text-amber-200'
                  : 'text-slate-500'
              }`}
            >
              Sedang Perbaikan
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          </div>
          <strong className="text-2xl sm:text-3xl font-extrabold mt-2 block tracking-tight">
            {maintenanceRooms.length}
          </strong>
        </button>
      </div>

      {/* 2. Search & Action Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor kamar, tipe kamar, nama penghuni, atau kampus..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 bg-stone-50/70 text-xs sm:text-sm focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setViewHistory(!viewHistory)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition ${
              viewHistory
                ? 'bg-stone-900 text-white border-stone-900'
                : 'border-stone-300 text-stone-700 hover:bg-stone-50'
            }`}
          >
            Alumni ({endedLeases.length})
          </button>
          <button
            type="button"
            onClick={openAddRoomModal}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold whitespace-nowrap flex items-center justify-center gap-1 shadow-xs transition"
          >
            <span>+ Tambah Kamar</span>
          </button>
        </div>
      </div>

      {/* 3. Riwayat Alumni Drawer/Section (When toggled) */}
      {viewHistory && (
        <section className="bg-white rounded-2xl p-5 border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              Riwayat Alumni Kos & Penyelesaian Deposit ({endedLeases.length})
            </h3>
            <button
              type="button"
              onClick={() => setViewHistory(false)}
              className="text-xs font-semibold text-stone-500 hover:text-stone-900"
            >
              Tutup
            </button>
          </div>
          {endedLeases.length === 0 ? (
            <p className="text-xs text-stone-500 py-4 text-center">
              Belum ada riwayat penghuni yang check-out.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {endedLeases.map((l) => (
                <div
                  key={l.leaseId}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-stone-900">{l.fullName}</span>{' '}
                    <span className="text-stone-500">
                      (Eks Kamar {l.roomNumber} • {l.universityOrWork})
                    </span>
                    <p className="text-stone-600 mt-0.5">
                      Masa Sewa: {l.startDate} s/d {l.endDate} • {l.depositNotes}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg font-bold self-start sm:self-center shrink-0 ${
                      l.depositStatus === 'refunded'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    Deposit {formatRupiah(l.depositAmount)}:{' '}
                    {l.depositStatus === 'refunded'
                      ? 'DIKEMBALIKAN'
                      : 'DIPOTONG'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. Clean, Scannable Room Grid */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-stone-200 text-center space-y-2">
          <DoorOpen className="w-8 h-8 text-stone-400 mx-auto" />
          <p className="text-sm font-bold text-stone-800">
            Tidak ada kamar yang sesuai filter pencarian
          </p>
          <p className="text-xs text-stone-500">
            Coba ubah filter status kamar atau kata kunci pencarian di atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredRooms.map((rm) => {
            const activeLease = activeLeasesByRoom.get(rm.id);
            let facilities: string[] = [];
            try {
              facilities = rm.facilitiesJson
                ? JSON.parse(rm.facilitiesJson)
                : [];
            } catch {
              facilities = [];
            }

            return (
              <div
                key={rm.id}
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-2xs ${
                  rm.status === 'occupied'
                    ? 'border-slate-200/90 hover:border-emerald-500 hover:shadow-sm'
                    : rm.status === 'maintenance'
                    ? 'border-amber-300/80 bg-amber-50/10'
                    : 'border-slate-200/90 hover:border-emerald-500 hover:shadow-sm'
                }`}
              >
                {/* Top Card Header */}
                <div className="p-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 ${
                        rm.status === 'occupied'
                          ? 'bg-emerald-800 text-white'
                          : rm.status === 'maintenance'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {rm.roomNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          Kamar {rm.roomNumber}
                        </h3>
                        <span className="text-[11px] font-medium text-slate-400 shrink-0">
                          • Lt. {rm.floor}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {rm.typeName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        rm.status === 'occupied'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                          : rm.status === 'maintenance'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {rm.status === 'occupied'
                        ? 'Terisi'
                        : rm.status === 'maintenance'
                        ? 'Perbaikan'
                        : 'Kosong'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditRoomModal(rm)}
                      title="Edit kamar & tarif"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-center">
                  {rm.status === 'occupied' && activeLease ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {activeLease.fullName}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {activeLease.universityOrWork || 'Umum'} • WA: {activeLease.phoneWa}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0 whitespace-nowrap">
                          {CYCLE_LABELS[activeLease.billingCycle]}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            Jatuh Tempo
                          </span>
                          <strong className="text-slate-900 font-semibold block mt-0.5">
                            {activeLease.nextDueDate}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            Deposit
                          </span>
                          <strong className="text-emerald-800 font-semibold block mt-0.5">
                            {formatRupiah(activeLease.depositAmount)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            Tarif Bulanan
                          </span>
                          <strong className="text-slate-900 text-xs sm:text-sm font-bold">
                            {formatRupiah(rm.priceMonthly)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            Semester (6 Bln)
                          </span>
                          <strong className="text-emerald-800 text-xs sm:text-sm font-bold">
                            {rm.priceSemester
                              ? formatRupiah(rm.priceSemester)
                              : '-'}
                          </strong>
                        </div>
                      </div>

                      {facilities.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {facilities.slice(0, 4).map((fac) => (
                            <span
                              key={fac}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                            >
                              {fac}
                            </span>
                          ))}
                          {facilities.length > 4 && (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                              +{facilities.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  {rm.status === 'available' && (
                    <>
                      <button
                        type="button"
                        onClick={() => openCheckinForRoom(rm)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold whitespace-nowrap text-center transition"
                      >
                        + Check-in Penghuni
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(rm)}
                        title="Hapus kamar"
                        className="p-2.5 rounded-xl border border-stone-200 text-stone-400 hover:text-red-700 hover:bg-red-50 transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {rm.status === 'occupied' && activeLease && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedLeaseDrawer(activeLease)}
                        className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-semibold whitespace-nowrap text-center transition"
                      >
                        Detail & KTP
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutLease(activeLease);
                          setCoDepositStatus('refunded');
                          setCoDepositNotes(
                            `Deposit ${formatRupiah(
                              activeLease.depositAmount
                            )} dikembalikan penuh saat kunci diserahkan.`
                          );
                          setCoNextRoomStatus('available');
                        }}
                        className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 text-xs font-semibold whitespace-nowrap transition"
                      >
                        Check-out
                      </button>
                    </>
                  )}

                  {rm.status === 'maintenance' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch(`/api/rooms/${rm.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({ status: 'available' }),
                        });
                        onNotifySuccess(
                          `Kamar ${rm.roomNumber} selesai diperbaiki dan kini Siap Huni!`
                        );
                        await onRefresh();
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap text-center transition"
                    >
                      Selesai Perbaikan (Siap Huni)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= SLIDE-OVER DRAWER: DETAIL PENGHUNI, KTP & KONTAK WALI ================= */}
      {selectedLeaseDrawer && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-[1px] flex justify-end items-end sm:items-stretch">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-none sm:rounded-l-2xl h-[88vh] sm:h-full flex flex-col justify-between border-l border-stone-200 shadow-xl overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 bg-emerald-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                  Kamar {selectedLeaseDrawer.roomNumber} •{' '}
                  {CYCLE_LABELS[selectedLeaseDrawer.billingCycle]}
                </span>
                <h3 className="text-base font-bold mt-0.5">
                  {selectedLeaseDrawer.fullName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeaseDrawer(null)}
                className="p-2 rounded-xl bg-emerald-800/80 text-emerald-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Quick Contact Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={`https://wa.me/${selectedLeaseDrawer.phoneWa
                    .replace(/^0/, '62')
                    .replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-950 flex items-center gap-2.5 transition"
                >
                  <Phone className="w-4 h-4 text-emerald-800 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[11px] text-emerald-700 block">
                      WA Penghuni
                    </span>
                    <strong className="text-xs truncate block">
                      {selectedLeaseDrawer.phoneWa}
                    </strong>
                  </div>
                </a>

                {selectedLeaseDrawer.emergencyContactPhone ? (
                  <a
                    href={`https://wa.me/${selectedLeaseDrawer.emergencyContactPhone
                      .replace(/^0/, '62')
                      .replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-950 flex items-center gap-2.5 transition"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[11px] text-amber-800 block truncate">
                        Wali: {selectedLeaseDrawer.emergencyContactName}
                      </span>
                      <strong className="text-xs truncate block">
                        {selectedLeaseDrawer.emergencyContactPhone}
                      </strong>
                    </div>
                  </a>
                ) : (
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-400 flex items-center">
                    Kontak wali belum diisi
                  </div>
                )}
              </div>

              {/* Biodata & Kontrak */}
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5 text-xs">
                <div className="flex items-baseline justify-between gap-3 py-1 border-b border-stone-200/60">
                  <span className="text-stone-500 shrink-0">NIK KTP</span>
                  <strong className="text-stone-900 font-mono text-right break-all">
                    {selectedLeaseDrawer.idCardNumber || '-'}
                  </strong>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1 border-b border-stone-200/60">
                  <span className="text-stone-500 shrink-0">Kampus / Instansi</span>
                  <strong className="text-stone-900 text-right">
                    {selectedLeaseDrawer.universityOrWork || '-'}
                  </strong>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1 border-b border-stone-200/60">
                  <span className="text-stone-500 shrink-0">Kota Asal</span>
                  <strong className="text-stone-900 text-right">
                    {selectedLeaseDrawer.originCity || '-'}
                  </strong>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1 border-b border-stone-200/60">
                  <span className="text-stone-500 shrink-0">Mulai Masuk Kos</span>
                  <strong className="text-stone-900 text-right whitespace-nowrap">
                    {selectedLeaseDrawer.startDate}
                  </strong>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1 border-b border-stone-200/60">
                  <span className="text-stone-500 shrink-0">Jatuh Tempo Berikutnya</span>
                  <strong className="text-emerald-900 text-right whitespace-nowrap">
                    {selectedLeaseDrawer.nextDueDate}
                  </strong>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1 border-b border-stone-200/60">
                  <span className="text-stone-500 shrink-0">Sewa Pokok</span>
                  <strong className="text-stone-900 text-right">
                    {formatRupiah(selectedLeaseDrawer.baseRentAmount)} /{' '}
                    {CYCLE_LABELS[selectedLeaseDrawer.billingCycle]}
                  </strong>
                </div>
                <div className="flex items-baseline justify-between gap-3 py-1">
                  <span className="text-stone-500 shrink-0">Uang Deposit Jaminan</span>
                  <strong className="text-emerald-900 text-right">
                    {formatRupiah(selectedLeaseDrawer.depositAmount)} (Ditahan)
                  </strong>
                </div>
                {selectedLeaseDrawer.depositAmount > 0 && (
                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-stone-500">Tanda Terima:</span>
                    <a
                      href={`https://wa.me/${selectedLeaseDrawer.phoneWa
                        .replace(/^0/, '62')
                        .replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Halo Kak *${selectedLeaseDrawer.fullName}*, kami mengonfirmasi penerimaan *Uang Jaminan Deposit sebesar ${formatRupiah(
                          selectedLeaseDrawer.depositAmount
                        )}* untuk *Kamar ${selectedLeaseDrawer.roomNumber}*. Catatan: ${
                          selectedLeaseDrawer.depositNotes || 'Jaminan kunci & inventaris kamar'
                        }. Uang deposit akan dicairkan/dikembalikan saat check-out setelah serah terima kunci dan kamar dalam kondisi baik. Terima kasih! — Pengelola Kos`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-[11px] flex items-center gap-1 transition"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-800" />
                      <span>Kirim Bukti Deposit ke WA</span>
                    </a>
                  </div>
                )}
                {selectedLeaseDrawer.recurringAddons.length > 0 && (
                  <div className="pt-2 border-t border-stone-200/60">
                    <span className="text-stone-500 block mb-1">
                      Biaya Tambahan Rutin:
                    </span>
                    {selectedLeaseDrawer.recurringAddons.map((a, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-stone-800 font-medium"
                      >
                        <span>+ {a.label}</span>
                        <span>{formatRupiah(a.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dokumen Foto KTP */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-stone-800">
                  Dokumen Foto KTP Penghuni
                </p>
                {selectedLeaseDrawer.idCardPhotoUrl ? (
                  <img
                    src={selectedLeaseDrawer.idCardPhotoUrl}
                    alt={`KTP ${selectedLeaseDrawer.fullName}`}
                    width={400}
                    height={240}
                    className="w-full h-44 object-cover rounded-xl border border-stone-300"
                  />
                ) : (
                  <div className="p-6 rounded-xl bg-stone-50 border border-dashed border-stone-300 text-center text-xs text-stone-500">
                    Belum ada foto KTP yang diunggah untuk penghuni ini.
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 w-full rounded-xl border border-emerald-700 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 cursor-pointer transition">
                  <Upload className="w-4 h-4" />
                  <span>
                    {uploadingKtp
                      ? 'Mengunggah foto KTP...'
                      : 'Upload / Ganti Foto KTP'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingKtp(true);
                      try {
                        const up = await uploadFileToR2(file, 'ktp', token);
                        await apiFetch(
                          `/api/tenants-leases/tenant/${selectedLeaseDrawer.tenantId}`,
                          {
                            method: 'PUT',
                            body: JSON.stringify({ idCardPhotoR2Key: up.key }),
                          }
                        );
                        setSelectedLeaseDrawer({
                          ...selectedLeaseDrawer,
                          idCardPhotoR2Key: up.key,
                          idCardPhotoUrl: up.url,
                        });
                        onNotifySuccess(
                          'Foto KTP berhasil disimpan dengan aman!'
                        );
                        await onRefresh();
                      } catch (err: any) {
                        onNotifyError(err.message);
                      } finally {
                        setUploadingKtp(false);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-2">
              {availableRooms.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setMoveLease(selectedLeaseDrawer);
                    setTargetMoveRoomId(availableRooms[0].id);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Pindah Kamar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCheckoutLease(selectedLeaseDrawer);
                  setCoDepositStatus('refunded');
                  setCoDepositNotes(
                    `Deposit ${formatRupiah(
                      selectedLeaseDrawer.depositAmount
                    )} dikembalikan penuh.`
                  );
                  setCoNextRoomStatus('available');
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <CheckOutIcon className="w-4 h-4" />
                Proses Check-out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: TAMBAH / EDIT KAMAR ================= */}
      {showRoomModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-6 border border-stone-200 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                {editingRoom
                  ? `Edit Kamar ${editingRoom.roomNumber}`
                  : 'Tambah Kamar Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowRoomModal(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nomor Kamar
                  </label>
                  <input
                    type="text"
                    required
                    value={rmNumber}
                    onChange={(e) => setRmNumber(e.target.value)}
                    placeholder="105"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Lantai
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={rmFloor}
                    onChange={(e) => setRmFloor(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Status Kamar
                  </label>
                  <select
                    value={rmStatus}
                    onChange={(e) =>
                      setRmStatus(
                        e.target.value as
                          | 'available'
                          | 'occupied'
                          | 'maintenance'
                      )
                    }
                    className="w-full rounded-xl border border-stone-300 px-2.5 py-2 text-sm bg-white"
                  >
                    <option value="available">Kosong</option>
                    <option value="occupied">Terisi</option>
                    <option value="maintenance">Perbaikan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Nama Tipe Kamar
                </label>
                <input
                  type="text"
                  required
                  value={rmType}
                  onChange={(e) => setRmType(e.target.value)}
                  placeholder="Contoh: VIP KM Dalam + Water Heater"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Fasilitas Kamar (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={rmFacilities}
                  onChange={(e) => setRmFacilities(e.target.value)}
                  placeholder="Kasur, KM Dalam, Lemari, Meja Belajar, WiFi"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <p className="text-xs font-bold text-stone-800">
                  Pengaturan Tarif Multi-Siklus (Rp)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Sewa Bulanan (Wajib)
                    </label>
                    <input
                      type="number"
                      required
                      value={rmMonthly}
                      onChange={(e) => setRmMonthly(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Sewa 3 Bulanan
                    </label>
                    <input
                      type="number"
                      value={rmQuarterly}
                      onChange={(e) => setRmQuarterly(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Semesteran (6 Bulan)
                    </label>
                    <input
                      type="number"
                      value={rmSemester}
                      onChange={(e) => setRmSemester(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Tahunan (12 Bulan)
                    </label>
                    <input
                      type="number"
                      value={rmYearly}
                      onChange={(e) => setRmYearly(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Kamar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: CHECK-IN PENGHUNI BARU ================= */}
      {checkinRoom && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-2xl w-full p-6 border border-stone-200 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Check-in Penghuni Baru — Kamar {checkinRoom.roomNumber}
                </h3>
                <p className="text-xs text-stone-600">
                  {checkinRoom.typeName} • Otomatis membuat kontrak sewa & tagihan pertama
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckinRoom(null)}
                className="p-1.5 text-stone-500 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckinSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  1. Identitas & KTP Penghuni
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nama Lengkap Sesuai KTP *
                    </label>
                    <input
                      type="text"
                      required
                      value={ciName}
                      onChange={(e) => setCiName(e.target.value)}
                      placeholder="Contoh: Rizky Pratama"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nomor WhatsApp Aktif *
                    </label>
                    <input
                      type="tel"
                      required
                      value={ciPhone}
                      onChange={(e) => setCiPhone(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      NIK KTP
                    </label>
                    <input
                      type="text"
                      value={ciNik}
                      onChange={(e) => setCiNik(e.target.value)}
                      placeholder="16 Digit NIK KTP"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Kampus / Instansi / Pekerjaan
                    </label>
                    <input
                      type="text"
                      value={ciKampus}
                      onChange={(e) => setCiKampus(e.target.value)}
                      placeholder="Contoh: Mahasiswa / Karyawan Swasta"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Kota Asal
                    </label>
                    <input
                      type="text"
                      value={ciOrigin}
                      onChange={(e) => setCiOrigin(e.target.value)}
                      placeholder="Contoh: Surabaya / Jakarta"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Foto KTP Penghuni (Opsional)
                    </label>
                    <label className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-emerald-700 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>
                        {uploadingKtp
                          ? 'Mengunggah...'
                          : ciKtpKey
                          ? 'KTP Tersimpan (Ganti)'
                          : 'Pilih Foto KTP'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleKtpFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {ciKtpPreview && (
                  <img
                    src={ciKtpPreview}
                    alt="Preview KTP"
                    width={240}
                    height={140}
                    className="h-28 w-auto rounded-xl border border-stone-300 object-cover"
                  />
                )}
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  2. Kontak Darurat Orang Tua / Wali
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nama Orang Tua / Wali
                    </label>
                    <input
                      type="text"
                      value={ciParentName}
                      onChange={(e) => setCiParentName(e.target.value)}
                      placeholder="Bpk. Agus / Ibu Ratna"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      No. WA Orang Tua
                    </label>
                    <input
                      type="tel"
                      value={ciParentPhone}
                      onChange={(e) => setCiParentPhone(e.target.value)}
                      placeholder="0811xxxxxxxx"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Hubungan
                    </label>
                    <input
                      type="text"
                      value={ciParentRel}
                      onChange={(e) => setCiParentRel(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                  3. Siklus Sewa, Biaya Tambahan & Deposit
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Siklus Pembayaran
                    </label>
                    <select
                      value={ciCycle}
                      onChange={(e) =>
                        handleCycleChange(
                          e.target.value as
                            | 'monthly'
                            | 'quarterly'
                            | 'semester'
                            | 'yearly'
                        )
                      }
                      className="w-full rounded-xl border border-stone-300 px-2.5 py-2 text-sm bg-white font-semibold"
                    >
                      <option value="monthly">Bulanan</option>
                      <option value="quarterly">3 Bulanan</option>
                      <option value="semester">Semesteran (6 Bulan)</option>
                      <option value="yearly">Tahunan (12 Bulan)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tanggal Mulai Masuk
                    </label>
                    <input
                      type="date"
                      required
                      value={ciStartDate}
                      onChange={(e) => setCiStartDate(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tarif Sewa Pokok (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      value={ciBaseRent}
                      onChange={(e) => setCiBaseRent(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-700">
                      Biaya Tambahan Rutin (Sekamar berdua, parkir mobil, sampah)
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCiAddons([
                          ...ciAddons,
                          { label: 'Iuran Sampah & Kebersihan', amount: 30000 },
                        ])
                      }
                      className="text-xs font-bold text-emerald-800 hover:underline"
                    >
                      + Tambah Biaya
                    </button>
                  </div>
                  {ciAddons.map((addon, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={addon.label}
                        onChange={(e) => {
                          const next = [...ciAddons];
                          next[idx].label = e.target.value;
                          setCiAddons(next);
                        }}
                        className="flex-1 rounded-xl border border-stone-300 px-3 py-1.5 text-xs bg-white"
                      />
                      <input
                        type="number"
                        value={addon.amount}
                        onChange={(e) => {
                          const next = [...ciAddons];
                          next[idx].amount = Number(e.target.value);
                          setCiAddons(next);
                        }}
                        className="w-32 rounded-xl border border-stone-300 px-3 py-1.5 text-xs bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setCiAddons(ciAddons.filter((_, i) => i !== idx))
                        }
                        className="text-xs text-red-700 px-2"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-200/70">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Uang Deposit (Rp)
                    </label>
                    <input
                      type="number"
                      value={ciDeposit}
                      onChange={(e) => setCiDeposit(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Catatan Deposit
                    </label>
                    <input
                      type="text"
                      value={ciDepositNotes}
                      onChange={(e) => setCiDepositNotes(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tagihan Pertama
                    </label>
                    <select
                      value={ciPaymentStatus}
                      onChange={(e) =>
                        setCiPaymentStatus(
                          e.target.value as 'paid' | 'unpaid'
                        )
                      }
                      className="w-full rounded-xl border border-stone-300 px-2.5 py-2 text-sm bg-white font-semibold"
                    >
                      <option value="paid">Lunas Saat Masuk</option>
                      <option value="unpaid">Belum Dibayar (Tagihkan WA)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckinRoom(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingKtp}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                >
                  {submitting
                    ? 'Memproses Check-in...'
                    : 'Simpan Check-in & Aktifkan Sewa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CHECK-OUT & PENYELESAIAN DEPOSIT ================= */}
      {checkoutLease && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                Check-out Penghuni — Kamar {checkoutLease.roomNumber}
              </h3>
              <button
                type="button"
                onClick={() => setCheckoutLease(null)}
                className="p-1.5 text-stone-500 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <p>
                Penghuni: <strong>{checkoutLease.fullName}</strong>
              </p>
              <p>
                Deposit Tertahan Saat Ini:{' '}
                <strong className="text-emerald-900">
                  {formatRupiah(checkoutLease.depositAmount)}
                </strong>
              </p>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Penyelesaian Uang Deposit
                </label>
                <select
                  value={coDepositStatus}
                  onChange={(e) =>
                    setCoDepositStatus(
                      e.target.value as 'refunded' | 'deducted'
                    )
                  }
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white font-semibold"
                >
                  <option value="refunded">
                    Dikembalikan Penuh ke Penghuni (Refunded)
                  </option>
                  <option value="deducted">
                    Dipotong Kerusakan Kamar / Tunggakan (Deducted)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Catatan Penyelesaian Deposit / Kondisi Kamar
                </label>
                <textarea
                  rows={2}
                  value={coDepositNotes}
                  onChange={(e) => setCoDepositNotes(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Status Kamar {checkoutLease.roomNumber} Setelah Check-out
                </label>
                <select
                  value={coNextRoomStatus}
                  onChange={(e) =>
                    setCoNextRoomStatus(
                      e.target.value as 'available' | 'maintenance'
                    )
                  }
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white"
                >
                  <option value="available">
                    Langsung Kosong (Siap Disewakan Lagi)
                  </option>
                  <option value="maintenance">
                    Masuk Status Perbaikan / Pembersihan Dulu
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutLease(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-semibold"
                >
                  {submitting
                    ? 'Memproses...'
                    : 'Konfirmasi Check-out & Kosongkan Kamar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: PINDAH KAMAR ================= */}
      {moveLease && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                Pindah Kamar — {moveLease.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setMoveLease(null)}
                className="p-1.5 text-stone-500 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleMoveRoomSubmit} className="space-y-3.5">
              <p className="text-xs text-stone-600">
                Pindahkan dari <strong>Kamar {moveLease.roomNumber}</strong> ke
                kamar kosong berikut:
              </p>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Pilih Kamar Tujuan
                </label>
                <select
                  value={targetMoveRoomId}
                  onChange={(e) => setTargetMoveRoomId(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white"
                >
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Kamar {r.roomNumber} (Lt. {r.floor} - {r.typeName} -{' '}
                      {formatRupiah(r.priceMonthly)}/bln)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMoveLease(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                >
                  Simpan Pindah Kamar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
