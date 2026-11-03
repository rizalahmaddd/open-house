import React, { useEffect, useState } from 'react';
import { JuraganKosLogo, WhatsAppIcon } from './BrandIcons';

interface Props {
  slug: string;
  onBackToApp?: () => void;
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function PublicCatalogPage({ slug, onBackToApp }: Props) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/kos/${slug}`);
        const json = (await res.json()) as any;
        if (!res.ok) throw new Error(json.error || 'Katalog kos tidak ditemukan');
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <p className="text-sm font-medium text-stone-600">
          Memuat katalog ketersediaan kamar kos...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-stone-200 text-center space-y-3">
          <h1 className="text-base font-bold text-stone-900">
            Katalog Kos Tidak Ditemukan
          </h1>
          <p className="text-xs text-stone-600">{error}</p>
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold"
            >
              ← Kembali ke Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const { property, rooms } = data;
  const availableCount = rooms.filter(
    (r: any) => r.status === 'available'
  ).length;
  const displayedRooms = onlyAvailable
    ? rooms.filter((r: any) => r.status === 'available')
    : rooms;
  const cleanOwnerWa = (property.ownerPhone || '081233445566')
    .replace(/^0/, '62')
    .replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs transition"
          >
            <span>← Kembali ke Dashboard Pengelola</span>
          </button>
        )}

        {/* Hero Banner Kos */}
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 whitespace-nowrap">
                  KOS {property.genderType.toUpperCase()}
                </span>
                <span className="text-xs text-emerald-300">
                  • {property.areaMalang}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
                {property.name}
              </h1>
              <p className="text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
                {property.address}
              </p>
            </div>

            <div className="bg-emerald-900/60 border border-emerald-700/60 rounded-2xl p-4 sm:text-right shrink-0">
              <span className="text-[11px] text-emerald-200 block whitespace-nowrap">
                Ketersediaan Kamar:
              </span>
              <strong className="text-xl font-extrabold text-amber-300 block whitespace-nowrap">
                {availableCount} Kamar Kosong
              </strong>
              <span className="text-[11px] text-emerald-300 block whitespace-nowrap">
                dari total {rooms.length} kamar
              </span>
              <a
                href={`https://wa.me/${cleanOwnerWa}?text=${encodeURIComponent(
                  `Halo Pengelola *${property.name}*, saya ingin bertanya seputar info kamar kos ini. Terima kasih.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs whitespace-nowrap"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span>Chat Pengelola</span>
              </a>
            </div>
          </div>

          {property.rulesText && (
            <div className="p-3.5 rounded-2xl bg-emerald-900/40 border border-emerald-800/80 text-xs text-emerald-100 leading-relaxed">
              <strong>Tata Tertib Kos:</strong> {property.rulesText}
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
              <JuraganKosLogo className="w-4 h-4 text-emerald-100" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              Daftar Tipe Kamar & Tarif Sewa (Bulanan / Semesteran / Tahunan)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
              onlyAvailable
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {onlyAvailable
              ? `Menampilkan Kamar Kosong (${availableCount})`
              : 'Tampilkan Hanya Kamar Kosong'}
          </button>
        </div>

        {/* Room Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedRooms.map((rm: any) => {
            const isAvailable = rm.status === 'available';
            let facilities: string[] = [];
            try {
              facilities = rm.facilitiesJson
                ? JSON.parse(rm.facilitiesJson)
                : [];
            } catch {
              facilities = [];
            }

            const waMsg = encodeURIComponent(
              `Halo Pengelola *${property.name}*, saya melihat kamar kosong di web katalog: *Kamar ${rm.roomNumber} (${rm.typeName})* tarif ${formatRupiah(rm.priceMonthly)}/bln. Apakah saat ini masih tersedia untuk disurvei/dibooking? Terima kasih.`
            );

            return (
              <div
                key={rm.id}
                className={`bg-white rounded-2xl p-5 border flex flex-col justify-between gap-4 transition shadow-2xs ${
                  isAvailable
                    ? 'border-slate-200 hover:border-emerald-500'
                    : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-slate-400">
                        Lantai {rm.floor}
                      </span>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Kamar {rm.roomNumber} — {rm.typeName}
                      </h2>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${
                        isAvailable
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isAvailable ? 'KOSONG SIAP HUNI' : 'SUDAH TERISI'}
                    </span>
                  </div>

                  {facilities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {facilities.map((fac) => (
                        <span
                          key={fac}
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600"
                        >
                          {fac}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Pricing Matrix */}
                  <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 grid grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-stone-500 block">Bulanan:</span>
                      <strong className="text-stone-900 text-sm whitespace-nowrap">
                        {formatRupiah(rm.priceMonthly)}
                      </strong>
                    </div>
                    {rm.priceQuarterly && (
                      <div>
                        <span className="text-stone-500 block">
                          3 Bulanan:
                        </span>
                        <strong className="text-stone-900 text-sm whitespace-nowrap">
                          {formatRupiah(rm.priceQuarterly)}
                        </strong>
                      </div>
                    )}
                    {rm.priceSemester && (
                      <div>
                        <span className="text-stone-500 block">
                          Semester (6 Bln):
                        </span>
                        <strong className="text-emerald-900 text-sm whitespace-nowrap">
                          {formatRupiah(rm.priceSemester)}
                        </strong>
                      </div>
                    )}
                    {rm.priceYearly && (
                      <div>
                        <span className="text-stone-500 block">
                          Tahunan (12 Bln):
                        </span>
                        <strong className="text-stone-900 text-sm whitespace-nowrap">
                          {formatRupiah(rm.priceYearly)}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {isAvailable ? (
                  <a
                    href={`https://wa.me/${cleanOwnerWa}?text=${waMsg}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <WhatsAppIcon className="w-4 h-4 shrink-0" />
                    <span>Tanya & Booking Kamar {rm.roomNumber} via WA</span>
                  </a>
                ) : (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-stone-100 text-stone-500 text-xs font-semibold text-center">
                    Kamar Sedang Terisi
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center text-xs text-stone-500 pt-2">
          Katalog Kos Digital Real-Time • Powered by <strong>OpenHouse</strong> (
          <span className="font-mono">openhouse.my.id</span>)
        </div>
      </div>
    </div>
  );
}
