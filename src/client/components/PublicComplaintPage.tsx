import React, { useEffect, useState } from 'react';
import { JuraganKosLogo } from './BrandIcons';
import { compressImageToWebP } from '../utils/image';

interface Props {
  slug: string;
  onBackToApp?: () => void;
}

export default function PublicComplaintPage({ slug, onBackToApp }: Props) {
  const [kosData, setKosData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roomId, setRoomId] = useState('general');
  const [reporterName, setReporterName] = useState('');
  const [reporterWa, setReporterWa] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(
    null
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/kos/${slug}`);
        const data = (await res.json()) as any;
        if (!res.ok) throw new Error(data.error || 'Kos tidak ditemukan');
        setKosData(data);
        if (data.rooms?.length > 0) {
          setRoomId(data.rooms[0].id);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('roomId', roomId);
      formData.append('reporterName', reporterName);
      formData.append('reporterWa', reporterWa);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('priority', priority);

      if (photoFile) {
        const compressed = await compressImageToWebP(photoFile);
        formData.append('file', compressed);
      }

      const res = await fetch(`/api/public/lapor/${slug}`, {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as any;
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim laporan');

      setSubmittedTicketId(data.ticketId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
        <p className="text-sm font-medium text-stone-600">
          Memuat form laporan fasilitas kos...
        </p>
      </div>
    );
  }

  if (error && !kosData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 text-center space-y-3 shadow-sm">
          <h1 className="text-base font-bold text-slate-900">
            Halaman Kos Tidak Ditemukan
          </h1>
          <p className="text-xs text-slate-600">{error}</p>
          {onBackToApp && (
            <button
              type="button"
              onClick={onBackToApp}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition"
            >
              ← Kembali ke Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 font-sans">
      <div className="max-w-lg mx-auto space-y-4">
        {onBackToApp && (
          <button
            type="button"
            onClick={onBackToApp}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs transition"
          >
            <span>← Kembali ke Dashboard Pengelola</span>
          </button>
        )}

        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_12px_40px_-10px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-800/80 border border-emerald-700/60 flex items-center justify-center shrink-0">
                  <JuraganKosLogo className="w-5 h-5 text-emerald-100" />
                </div>
                <span className="text-xs font-bold tracking-tight text-emerald-200">
                  OpenHouse Care
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-800 text-emerald-200 shrink-0 whitespace-nowrap">
                TANPA LOGIN
              </span>
            </div>

            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-snug">
                Form Lapor Fasilitas & Kerusakan
              </h1>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                {kosData.property.name} • {kosData.property.areaMalang}
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {submittedTicketId ? (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950">
                  LAPORAN DITERIMA
                </span>
                <div className="space-y-1">
                  <h2 className="text-base font-extrabold text-emerald-950">
                    Laporan Berhasil Terkirim!
                  </h2>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Nomor Tiket: <strong className="font-mono">{submittedTicketId}</strong>.
                    Pengelola dan penjaga kos telah menerima notifikasi laporan Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedTicketId(null);
                    setTitle('');
                    setDescription('');
                    setPhotoFile(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-sm"
                >
                  Kirim Laporan Lainnya
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Kamar / Area Kerusakan *
                  </label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs sm:text-sm bg-white font-semibold text-slate-900"
                  >
                    <option value="general">
                      Area Umum Kos (Dapur / Lorong / Parkiran / WiFi)
                    </option>
                    {kosData.rooms.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        Kamar {r.roomNumber} (Lantai {r.floor} - {r.typeName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nama Penghuni *
                    </label>
                    <input
                      type="text"
                      required
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Contoh: Dimas (Kamar 102)"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nomor WhatsApp Aktif *
                    </label>
                    <input
                      type="tel"
                      required
                      value={reporterWa}
                      onChange={(e) => setReporterWa(e.target.value)}
                      placeholder="0812xxxxxxxx"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Judul Masalah Fasilitas *
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Kran kamar mandi patah / bocor"
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Tingkat Urgensi
                    </label>
                    <select
                      value={priority}
                      onChange={(e) =>
                        setPriority(
                          e.target.value as 'low' | 'medium' | 'high'
                        )
                      }
                      className="w-full rounded-xl border border-stone-300 px-2.5 py-2 text-sm bg-white"
                    >
                      <option value="low">Biasa</option>
                      <option value="medium">Penting</option>
                      <option value="high">Darurat (Bocor/Listrik)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Keterangan Detail Kerusakan *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Jelaskan detail kondisi kerusakan dan jam berapa kamar bisa dicek oleh penjaga/tukang..."
                    className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Lampirkan Foto Kerusakan (Opsional)
                  </label>
                  <label className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-emerald-700 bg-emerald-50/50 px-3 py-3 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 cursor-pointer text-center">
                    <span>
                      {photoFile
                        ? `Foto dipilih: ${photoFile.name}`
                        : '+ Pilih / Ambil Foto Kondisi Kerusakan'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setPhotoFile(e.target.files?.[0] || null)
                      }
                      className="hidden"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-2xs"
                >
                  {submitting
                    ? 'Mengirim Laporan...'
                    : 'Kirim Laporan ke Pengelola Kos'}
                </button>
              </form>
            )}
          </div>

          <div className="px-5 py-3 bg-stone-50 border-t border-stone-200/80 text-center text-[11px] text-stone-500">
            Dikelola secara digital dengan <strong>OpenHouse</strong> •{' '}
            <span className="font-mono">openhouse.my.id</span>
          </div>
        </div>
      </div>
    </div>
  );
}
