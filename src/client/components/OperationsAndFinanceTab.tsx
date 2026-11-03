import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Wrench,
  QrCode,
  ExternalLink,
  Download,
  Upload,
  Trash2,
  Lock,
  MessageCircle,
  Receipt,
  CheckCircle2,
  Share2,
  X,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
} from 'lucide-react';
import { uploadFileToR2 } from '../utils/image';
import type { PropertyRecord } from './PropertySettingsModal';

export interface ExpenseRecord {
  id: string;
  propertyId: string;
  propertyName: string;
  recordedByUserId: string;
  recordedByName: string;
  category:
    | 'electricity'
    | 'water'
    | 'internet'
    | 'maintenance'
    | 'staff_salary'
    | 'tax_retribution'
    | 'other';
  title: string;
  amount: number;
  expenseDate: string;
  receiptPhotoUrl: string | null;
  notes: string;
}

export interface FullTicketRecord {
  id: string;
  propertyId: string;
  propertyName: string;
  propertySlug: string;
  roomId: string | null;
  roomNumber: string;
  reporterName: string;
  reporterWa: string;
  title: string;
  description: string;
  photoUrl: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved';
  expenseId: string | null;
  createdAt: string;
}

interface Props {
  isOwner: boolean;
  financials: {
    totalRevenuePaid: number;
    totalUnpaidReceivables: number;
    totalExpenses: number;
    netCashflow: number;
  } | null;
  expenses: ExpenseRecord[];
  tickets: FullTicketRecord[];
  currentProperty: PropertyRecord;
  token: string | null;
  apiFetch: (path: string, options?: RequestInit) => Promise<any>;
  onRefresh: () => Promise<void>;
  onOpenPublicComplaint: (slug: string) => void;
  onOpenPublicCatalog: (slug: string) => void;
  onNotifySuccess: (msg: string) => void;
  onNotifyError: (msg: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  electricity: 'Listrik / Token PLN',
  water: 'Air PDAM',
  internet: 'Internet / WiFi',
  maintenance: 'Perbaikan & Tukang',
  staff_salary: 'Gaji Penjaga Kos',
  tax_retribution: 'Pajak / Iuran RT & Sampah',
  other: 'Lainnya',
};

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Generate Poster QR Code Lapor Kerusakan via Canvas
function downloadComplaintPosterPng(property: PropertyRecord) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const url = `${window.location.origin}/lapor/${property.slug}`;

  ctx.fillStyle = '#064e3b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

  // Header
  ctx.fillStyle = '#065f46';
  ctx.fillRect(40, 40, canvas.width - 80, 150);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('LAPOR KERUSAKAN FASILITAS KOS', canvas.width / 2, 105);
  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(property.name.toUpperCase(), canvas.width / 2, 150);

  // Instructions
  ctx.fillStyle = '#1c1917';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(
    'Ada Kran Bocor, Lampu Mati, atau WiFi Gangguan?',
    canvas.width / 2,
    260
  );
  ctx.fillStyle = '#57534e';
  ctx.font = '20px sans-serif';
  ctx.fillText(
    'Buka tautan di bawah ini dari HP Anda (Tanpa Perlu Login):',
    canvas.width / 2,
    305
  );

  // Visual QR Code Placeholder Box with deterministic matrix pattern + URL
  const qrSize = 320;
  const qrX = (canvas.width - qrSize) / 2;
  const qrY = 350;

  ctx.strokeStyle = '#065f46';
  ctx.lineWidth = 6;
  ctx.strokeRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);

  const drawFinder = (fx: number, fy: number) => {
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(fx, fy, 70, 70);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx + 10, fy + 10, 50, 50);
    ctx.fillStyle = '#065f46';
    ctx.fillRect(fx + 20, fy + 20, 30, 30);
  };
  drawFinder(qrX, qrY);
  drawFinder(qrX + qrSize - 70, qrY);
  drawFinder(qrX, qrY + qrSize - 70);

  ctx.fillStyle = '#1c1917';
  const cells = 16;
  const cellSize = qrSize / cells;
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const inTopLeft = r < 4 && c < 4;
      const inTopRight = r < 4 && c >= cells - 4;
      const inBottomLeft = r >= cells - 4 && c < 4;
      if (inTopLeft || inTopRight || inBottomLeft) continue;
      const hash =
        (r * 31 + c * 17 + property.slug.charCodeAt(r % property.slug.length)) % 3;
      if (hash === 0) {
        ctx.fillRect(
          qrX + c * cellSize + 2,
          qrY + r * cellSize + 2,
          cellSize - 4,
          cellSize - 4
        );
      }
    }
  }

  // Link Box
  ctx.fillStyle = '#ecfdf5';
  ctx.fillRect(80, 730, canvas.width - 160, 74);
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 2;
  ctx.strokeRect(80, 730, canvas.width - 160, 74);

  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(url, canvas.width / 2, 775);

  ctx.fillStyle = '#44403c';
  ctx.font = '18px sans-serif';
  ctx.fillText(
    '1. Pilih Nomor Kamar  •  2. Tulis Keluhan & Foto  •  3. Langsung Ditangani',
    canvas.width / 2,
    865
  );

  ctx.fillStyle = '#065f46';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Dikelola dengan OpenHouse • openhouse.my.id', canvas.width / 2, 920);

  const link = document.createElement('a');
  link.download = `Poster-Lapor-Kos-${property.slug}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export default function OperationsAndFinanceTab({
  isOwner,
  financials,
  expenses,
  tickets,
  currentProperty,
  token,
  apiFetch,
  onRefresh,
  onOpenPublicComplaint,
  onOpenPublicCatalog,
  onNotifySuccess,
  onNotifyError,
}: Props) {
  // Segmented Sub-Tab for clean mobile/tablet/desktop experience
  const [subTab, setSubTab] = useState<'expenses' | 'tickets' | 'public-links'>(
    () => {
      const p = new URLSearchParams(window.location.search).get('sub');
      if (p === 'tickets' || p === 'komplain') return 'tickets';
      if (p === 'public-links' || p === 'poster' || p === 'katalog') return 'public-links';
      return 'expenses';
    }
  );

  const changeSubTab = (newSub: 'expenses' | 'tickets' | 'public-links') => {
    setSubTab(newSub);
    const url = new URL(window.location.href);
    if (newSub === 'expenses') {
      url.searchParams.delete('sub');
    } else {
      url.searchParams.set('sub', newSub);
    }
    window.history.replaceState({}, '', url.pathname + url.search);
  };

  // Expense Form Modal State
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [expCategory, setExpCategory] =
    useState<ExpenseRecord['category']>('electricity');
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [expNotes, setExpNotes] = useState('');
  const [expReceiptKey, setExpReceiptKey] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ticket Resolution Modal State
  const [resolvingTicket, setResolvingTicket] =
    useState<FullTicketRecord | null>(null);
  const [tktStatus, setTktStatus] = useState<
    'open' | 'in_progress' | 'resolved'
  >('resolved');
  const [repairCost, setRepairCost] = useState('0');
  const [repairNotes, setRepairNotes] = useState('');

  // Preview Receipt Image
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(
    null
  );

  // Petty Cash (Kas Kecil Penjaga)
  const [pettyCashModal, setPettyCashModal] = useState(false);
  const [pettyCashFund, setPettyCashFund] = useState<number>(() => {
    const val = localStorage.getItem(`jk_petty_cash_${currentProperty.id}`);
    return val ? Number(val) : 500000;
  });
  const [newFundAmount, setNewFundAmount] = useState<string>('500000');

  const totalExpensesAmount = React.useMemo(() => {
    return expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses]);

  const remainingPettyCash = pettyCashFund - totalExpensesAmount;

  const handleUpdatePettyCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newFundAmount) || 0;
    setPettyCashFund(val);
    localStorage.setItem(`jk_petty_cash_${currentProperty.id}`, String(val));
    setPettyCashModal(false);
    onNotifySuccess(`Saldo kas pegangan operasional berhasil diatur menjadi ${formatRupiah(val)}!`);
  };

  const handleShareExpensesWa = () => {
    const lines = [
      `*Laporan Kas Operasional — ${currentProperty.name}*`,
      `Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      `Modal Kas Diberikan: ${formatRupiah(pettyCashFund)}`,
      `Total Pengeluaran: ${formatRupiah(totalExpensesAmount)}`,
      `*Sisa Saldo Kas di Tangan: ${formatRupiah(remainingPettyCash)}*`,
      '',
      '*Rincian Pengeluaran Terakhir:*',
      ...expenses.slice(0, 8).map(
        (e) => `• ${e.expenseDate}: ${e.title} (${CATEGORY_LABELS[e.category] || e.category}) — ${formatRupiah(e.amount)}`
      ),
      '',
      `Catatan: Laporan otomatis terverifikasi via OpenHouse (openhouse.my.id).`,
    ];
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const openTicketsCount = tickets.filter((t) => t.status !== 'resolved').length;

  const handleReceiptUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const up = await uploadFileToR2(file, 'receipt', token);
      setExpReceiptKey(up.key);
      onNotifySuccess('Foto nota pengeluaran berhasil disimpan!');
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/api/operations/expenses', {
        method: 'POST',
        body: JSON.stringify({
          propertyId: currentProperty.id,
          category: expCategory,
          title: expTitle,
          amount: Number(expAmount),
          expenseDate: expDate,
          receiptPhotoR2Key: expReceiptKey,
          notes: expNotes,
        }),
      });
      setExpTitle('');
      setExpAmount('');
      setExpNotes('');
      setExpReceiptKey(null);
      setShowAddExpense(false);
      onNotifySuccess('Catatan pengeluaran operasional berhasil disimpan!');
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await apiFetch(`/api/operations/expenses/${id}`, { method: 'DELETE' });
      onNotifySuccess('Catatan pengeluaran dihapus.');
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/operations/tickets/${resolvingTicket.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: tktStatus,
          repairCostAmount: Number(repairCost),
          repairCostNotes: repairNotes,
        }),
      });
      setResolvingTicket(null);
      onNotifySuccess(
        Number(repairCost) > 0
          ? 'Status tiket diperbarui & biaya perbaikan otomatis tercatat di Jurnal Pengeluaran!'
          : 'Status tiket komplain berhasil diperbarui!'
      );
      await onRefresh();
    } catch (err: any) {
      onNotifyError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    if (!financials) return;
    const rows = [
      [
        'Tanggal',
        'Kategori',
        'Deskripsi Pengeluaran',
        'Properti Kos',
        'Dicatat Oleh',
        'Nominal (Rp)',
      ],
      ...expenses.map((e) => [
        e.expenseDate,
        CATEGORY_LABELS[e.category] || e.category,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${e.propertyName}"`,
        `"${e.recordedByName}"`,
        String(e.amount),
      ]),
      [],
      ['RINGKASAN KAS BERSIH PEMILIK KOS'],
      ['Total Pemasukan Sewa Lunas', String(financials.totalRevenuePaid)],
      ['Total Piutang Belum Tertagih', String(financials.totalUnpaidReceivables)],
      ['Total Pengeluaran Operasional', String(financials.totalExpenses)],
      ['Laba / Kas Bersih', String(financials.netCashflow)],
    ];

    const csvContent = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan-Kas-${currentProperty.slug}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const catalogUrl = `${window.location.origin}/kos/${currentProperty.slug}`;

  return (
    <div className="space-y-5">
      {/* 1. Ringkasan Kas Bersih (Khusus Pemilik Kos) */}
      {isOwner && financials && (
        <section className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 truncate">
                  Pemasukan Lunas
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 truncate tracking-tight">
                {formatRupiah(financials.totalRevenuePaid)}
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 truncate">
                  Piutang Sewa
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-700 mt-2 truncate tracking-tight">
                {formatRupiah(financials.totalUnpaidReceivables)}
              </p>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500 truncate">
                  Pengeluaran Kos
                </span>
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-extrabold text-red-700 mt-2 truncate tracking-tight">
                {formatRupiah(financials.totalExpenses)}
              </p>
            </div>

            <div className="bg-emerald-950 text-white p-4 sm:p-5 rounded-2xl border border-emerald-900 shadow-sm shadow-emerald-950/20 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-emerald-200 truncate">
                  Laba / Kas Bersih
                </span>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="text-[11px] font-bold text-emerald-300 hover:text-white underline shrink-0 whitespace-nowrap transition"
                  title="Unduh Laporan CSV / Excel"
                >
                  Unduh CSV
                </button>
              </div>
              <p className="text-xl sm:text-2xl font-extrabold mt-2 truncate tracking-tight text-white">
                {formatRupiah(financials.netCashflow)}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. Segmented Sub-Navigation + Contextual Action Button */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="grid grid-cols-3 sm:flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => changeSubTab('expenses')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center whitespace-nowrap ${
              subTab === 'expenses'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="truncate">Pengeluaran ({expenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => changeSubTab('tickets')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              subTab === 'tickets'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="truncate">Komplain ({tickets.length})</span>
            {openTicketsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-red-600 text-white text-[10px] font-bold shrink-0">
                {openTicketsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => changeSubTab('public-links')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center whitespace-nowrap ${
              subTab === 'public-links'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="truncate">Poster QR & Katalog</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {subTab === 'expenses' && (
            <button
              type="button"
              onClick={() => setShowAddExpense(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold whitespace-nowrap text-center shadow-xs transition"
            >
              + Catat Pengeluaran
            </button>
          )}
          {subTab === 'tickets' && (
            <button
              type="button"
              onClick={() => onOpenPublicComplaint(currentProperty.slug)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold whitespace-nowrap text-center"
            >
              Lihat Form Lapor Penghuni →
            </button>
          )}
          {subTab === 'public-links' && (
            <button
              type="button"
              onClick={() => downloadComplaintPosterPng(currentProperty)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold whitespace-nowrap text-center"
            >
              Unduh Poster QR (PNG)
            </button>
          )}
        </div>
      </div>

      {/* 3A. SUB-TAB: JURNAL PENGELUARAN OPERASIONAL */}
      {subTab === 'expenses' && (
        <div className="space-y-4">
          {/* Buku Kas Kecil Pegangan Penjaga (Petty Cash) */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Kas Kecil Pegangan Penjaga (Operasional Harian)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Saldo uang tunai pegangan untuk beli token PLN, galon, sampah RT & perbaikan darurat
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleShareExpensesWa}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Bagikan rincian kas operasional ke WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Kirim Laporan WA</span>
                </button>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewFundAmount(String(pettyCashFund));
                      setPettyCashModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Isi / Atur Modal Kas</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-500 block text-[11px]">Modal Kas Diberikan:</span>
                <strong className="text-slate-900 text-sm font-bold block mt-0.5">
                  {formatRupiah(pettyCashFund)}
                </strong>
                <span className="text-[10px] text-slate-400">Total uang operasional diserahkan</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-500 block text-[11px]">Total Pengeluaran:</span>
                <strong className="text-red-700 text-sm font-bold block mt-0.5">
                  {formatRupiah(totalExpensesAmount)}
                </strong>
                <span className="text-[10px] text-slate-400">Dari {expenses.length} nota tercatat</span>
              </div>

              <div
                className={`p-3 rounded-xl border text-xs ${
                  remainingPettyCash < 100000
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-medium">Sisa Kas di Tangan:</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      remainingPettyCash < 100000
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {remainingPettyCash < 100000 ? 'Perlu Diisi Ulang' : 'Saldo Aman'}
                  </span>
                </div>
                <strong className="text-base font-extrabold block mt-0.5">
                  {formatRupiah(remainingPettyCash)}
                </strong>
                <span className="text-[10px] opacity-80">Siap dipakai pengeluaran harian</span>
              </div>
            </div>
          </div>
          {expenses.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-stone-200 text-center space-y-2">
              <Receipt className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-sm font-bold text-stone-800">
                Belum ada catatan pengeluaran operasional
              </p>
              <p className="text-xs text-stone-500">
                Catat pembelian token listrik PLN, air PDAM, WiFi, atau ongkos tukang.
              </p>
            </div>
          ) : (
            expenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-xs transition"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-stone-900">
                      {exp.title}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                      {CATEGORY_LABELS[exp.category] || exp.category}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Tanggal: <strong className="text-stone-700">{exp.expenseDate}</strong> • Dicatat oleh{' '}
                    <strong className="text-stone-700">{exp.recordedByName}</strong>
                    {exp.notes ? ` • "${exp.notes}"` : ''}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100 shrink-0">
                  {exp.receiptPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewReceiptUrl(exp.receiptPhotoUrl)}
                      className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-100"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Lihat Nota</span>
                    </button>
                  )}
                  <span className="text-sm sm:text-base font-extrabold text-red-700">
                    - {formatRupiah(exp.amount)}
                  </span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-2 rounded-lg text-stone-400 hover:text-red-700 hover:bg-red-50 transition"
                      title="Hapus pengeluaran"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3B. SUB-TAB: TIKET KOMPLAIN & PERBAIKAN FASILITAS */}
      {subTab === 'tickets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tickets.length === 0 ? (
            <div className="md:col-span-2 bg-white rounded-2xl p-10 border border-stone-200 text-center space-y-2">
              <Wrench className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="text-sm font-bold text-stone-800">
                Tidak ada komplain kerusakan fasilitas
              </p>
              <p className="text-xs text-stone-500">
                Semua fasilitas kamar kos dalam kondisi prima.
              </p>
            </div>
          ) : (
            tickets.map((tkt) => (
              <div
                key={tkt.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 flex flex-col justify-between gap-4 hover:shadow-xs transition"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-stone-900 text-white text-xs font-bold">
                        Kamar {tkt.roomNumber}
                      </span>
                      <h4 className="text-sm font-bold text-stone-900">
                        {tkt.title}
                      </h4>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md shrink-0 ${
                        tkt.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-900'
                          : tkt.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-red-100 text-red-900'
                      }`}
                    >
                      {tkt.status === 'resolved'
                        ? 'SELESAI'
                        : tkt.status === 'in_progress'
                        ? 'DIPROSES'
                        : 'BARU'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {tkt.description}
                  </p>

                  {tkt.photoUrl && (
                    <img
                      src={tkt.photoUrl}
                      alt={tkt.title}
                      width={280}
                      height={160}
                      className="h-36 w-full rounded-xl border border-stone-200 object-cover"
                    />
                  )}
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="text-xs text-stone-500 truncate">
                    Pelapor: <strong className="text-stone-800">{tkt.reporterName}</strong>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`https://wa.me/${tkt.reporterWa
                        .replace(/^0/, '62')
                        .replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-1 hover:bg-emerald-100"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WA Pelapor</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setResolvingTicket(tkt);
                        setTktStatus(
                          tkt.status === 'resolved' ? 'resolved' : 'resolved'
                        );
                        setRepairCost('0');
                        setRepairNotes('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3C. SUB-TAB: POSTER QR & KATALOG PUBLIK */}
      {subTab === 'public-links' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                <QrCode className="w-4 h-4" />
                QR Code Lapor Kerusakan
              </span>
              <h3 className="text-base font-bold text-stone-900">
                Tempel Poster QR di Lorong Kos ({currentProperty.name})
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Penghuni cukup scan atau buka{' '}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono">
                  /lapor/{currentProperty.slug}
                </code>{' '}
                tanpa perlu login untuk melapor kran bocor, lampu mati, atau WiFi gangguan beserta foto bukti.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => downloadComplaintPosterPng(currentProperty)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Poster QR (PNG)</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenPublicComplaint(currentProperty.slug)}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Form Publik</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                <Share2 className="w-4 h-4" />
                Microsite Katalog Kamar Kosong
              </span>
              <h3 className="text-base font-bold text-stone-900">
                Bagikan Info Kamar Kosong ke WA / IG ({currentProperty.name})
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Calon penghuni kos bisa melihat daftar kamar kosong, fasilitas, dan tarif Bulanan/Semesteran secara real-time di{' '}
                <code className="bg-stone-100 px-1.5 py-0.5 rounded font-mono">
                  /kos/{currentProperty.slug}
                </code>
                .
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => onOpenPublicCatalog(currentProperty.slug)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Katalog Kos</span>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Info Kamar Kosong *${currentProperty.name}* (${currentProperty.areaMalang}). Cek ketersediaan kamar, fasilitas, dan harga sewa Bulanan/Semesteran di sini: ${catalogUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Bagikan ke WA</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: CATAT PENGELUARAN OPERASIONAL ================= */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-stone-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                Catat Pengeluaran Operasional Kos
              </h3>
              <button
                type="button"
                onClick={() => setShowAddExpense(false)}
                className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Kategori Pengeluaran
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) =>
                      setExpCategory(
                        e.target.value as ExpenseRecord['category']
                      )
                    }
                    className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-xs sm:text-sm bg-white font-semibold"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Tanggal Pengeluaran
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs sm:text-sm bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nama / Keperluan Pengeluaran *
                  </label>
                  <input
                    type="text"
                    required
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="Contoh: Beli Token Listrik Pompa Air"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Nominal (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="200000"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Catatan Tambahan
                  </label>
                  <input
                    type="text"
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    placeholder="Opsional"
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Upload Foto Nota / Bukti Pembelian
                  </label>
                  <label className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-dashed border-emerald-700 bg-emerald-50/40 px-3 py-2 text-xs font-semibold text-emerald-900 cursor-pointer hover:bg-emerald-50">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadingReceipt
                        ? 'Mengunggah...'
                        : expReceiptKey
                        ? 'Nota Tersimpan (Ganti)'
                        : 'Pilih Foto Nota'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingReceipt}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: UPDATE STATUS TIKET & CATAT BIAYA PERBAIKAN OTOMATIS ================= */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 border border-stone-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">
                Tindak Lanjut Komplain — Kamar {resolvingTicket.roomNumber}
              </h3>
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="p-1.5 rounded-xl text-stone-500 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1">
              <p className="font-bold text-stone-900">{resolvingTicket.title}</p>
              <p className="text-stone-600">{resolvingTicket.description}</p>
            </div>

            <form onSubmit={handleUpdateTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Status Penanganan
                </label>
                <select
                  value={tktStatus}
                  onChange={(e) =>
                    setTktStatus(
                      e.target.value as 'open' | 'in_progress' | 'resolved'
                    )
                  }
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white font-semibold"
                >
                  <option value="open">Baru (Menunggu Tukang)</option>
                  <option value="in_progress">Sedang Dikerjakan / Diproses</option>
                  <option value="resolved">Selesai Diperbaiki</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <p className="text-xs font-bold text-emerald-950">
                  Integrasi Otomatis ke Jurnal Pengeluaran (Opsional)
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                    Biaya Perbaikan / Beli Alat (Rp) — Isi 0 jika tanpa biaya
                  </label>
                  <input
                    type="number"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white font-bold"
                  />
                </div>
                {Number(repairCost) > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      Keterangan Nota Tukang / Sparepart
                    </label>
                    <input
                      type="text"
                      value={repairNotes}
                      onChange={(e) => setRepairNotes(e.target.value)}
                      placeholder="Contoh: Ganti kran shower + ongkos tukang"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: PREVIEW FOTO NOTA PENGELUARAN ================= */}
      {previewReceiptUrl && (
        <div
          className="fixed inset-0 z-50 bg-stone-900/75 flex items-center justify-center p-4"
          onClick={() => setPreviewReceiptUrl(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">
                Bukti Nota / Struk Pengeluaran
              </h3>
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(null)}
                className="p-1 text-stone-500 hover:text-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewReceiptUrl}
              alt="Struk Pengeluaran"
              width={400}
              height={300}
              className="w-full max-h-96 object-contain rounded-xl border border-stone-200 bg-stone-50"
            />
          </div>
        </div>
      )}

      {/* ================= MODAL 4: ATUR MODAL KAS KECIL PENJAGA ================= */}
      {pettyCashModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-800" />
                <span>Modal Kas Pegangan Penjaga</span>
              </h3>
              <button
                type="button"
                onClick={() => setPettyCashModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tentukan jumlah uang tunai yang diserahkan pemilik kepada penjaga kos untuk keperluan operasional harian (token PLN, PDAM, galon, sampah RT, perbaikan).
            </p>

            <form onSubmit={handleUpdatePettyCash} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Kas Pegangan (Rp)
                </label>
                <input
                  type="number"
                  required
                  step="10000"
                  value={newFundAmount}
                  onChange={(e) => setNewFundAmount(e.target.value)}
                  placeholder="500000"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base font-bold text-slate-900 bg-white"
                />
                <div className="flex gap-2 mt-2">
                  {[300000, 500000, 1000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNewFundAmount(String(amt))}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPettyCashModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-xs"
                >
                  Simpan Saldo Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
