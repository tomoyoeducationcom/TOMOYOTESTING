import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { RefreshCw, Send, Star, Users } from 'lucide-react';
import { FONNTE_SENDER_DISPLAY, FONNTE_SENDER_NUMBER } from '../lib/domain';
import type { WaGroupRecord, WaGroupSendLog } from '../lib/quizAndWaDomain';

export function AdminWaGroupPanel({ user }: { user: User }) {
  const [groups, setGroups] = useState<WaGroupRecord[]>([]);
  const [logs, setLogs] = useState<WaGroupSendLog[]>([]);
  const [fonnteConfigured, setFonnteConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'warn' | 'err'; text: string } | null>(null);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/wa-groups', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal memuat daftar grup.');
      setGroups(Array.isArray(data.groups) ? data.groups : []);
      setLogs(Array.isArray(data.logs) ? data.logs : []);
      setFonnteConfigured(Boolean(data.fonnteConfigured));
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal memuat daftar grup.',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleSyncGroups = async (triggerFetchGroup: boolean) => {
    setSyncing(true);
    setStatusMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/wa-groups/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ triggerFetchGroup }),
      });
      const data = await res.json();
      setGroups(Array.isArray(data.groups) ? data.groups : []);
      setFonnteConfigured(Boolean(data.configured));
      setStatusMsg({
        type: data.ok ? 'ok' : 'warn',
        text: data.detail || (data.ok ? 'Daftar grup berhasil disinkronkan.' : 'Sinkronisasi grup gagal.'),
      });
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal menyinkronkan grup Fonnte.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleTogglePin = async (groupId: string) => {
    const currentPinned = groups.filter((g) => g.pinned).map((g) => g.id);
    const nextPinned = currentPinned.includes(groupId)
      ? currentPinned.filter((id) => id !== groupId)
      : [...currentPinned, groupId];

    setGroups((prev) =>
      prev.map((g) => ({ ...g, pinned: nextPinned.includes(g.id) }))
    );

    try {
      const token = await user.getIdToken();
      await fetch('/api/admin/wa-groups/pinned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pinnedIds: nextPinned }),
      });
    } catch {
      await loadGroups();
    }
  };

  const toggleGroupSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSendGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (selectedIds.length === 0) {
      setStatusMsg({ type: 'warn', text: 'Pilih minimal satu grup WhatsApp tujuan.' });
      return;
    }
    if (!message.trim()) {
      setStatusMsg({ type: 'warn', text: 'Isi pesan pengumuman grup wajib diisi.' });
      return;
    }

    setSending(true);
    setStatusMsg(null);
    const requestId = `grp_${Date.now()}`;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/wa-groups/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          groupIds: selectedIds,
          message: message.trim(),
          requestId,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || 'Gagal mengirim pesan grup.');
      }
      const log: WaGroupSendLog = data.log;
      setLogs((prev) => [log, ...prev]);
      setStatusMsg({
        type: log.status === 'sent' ? 'ok' : 'warn',
        text:
          log.status === 'unconfigured'
            ? 'Pengiriman dicatat, namun FONNTE_TOKEN belum dikonfigurasi pada environment server.'
            : log.status === 'sent'
            ? `Pengumuman berhasil dikirim ke ${log.groupNames.length} grup WhatsApp.`
            : `Pengiriman selesai dengan status: ${log.status}. Periksa detail riwayat di bawah.`,
      });
      if (log.status === 'sent') {
        setMessage('');
      }
    } catch (err) {
      setStatusMsg({
        type: 'err',
        text: err instanceof Error ? err.message : 'Gagal mengirim pesan ke grup.',
      });
    } finally {
      setSending(false);
    }
  };

  const sortedGroups = [...groups].sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="space-y-6">
      {/* Header & Fonnte Info */}
      <div className="editorial-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#121820]">
              WhatsApp Group Resmi (Fonnte)
            </h2>
            <p className="text-xs sm:text-sm text-[#3F4A59] mt-0.5">
              Nomor Pengirim / Device Fonnte: <strong className="font-mono">{FONNTE_SENDER_DISPLAY} ({FONNTE_SENDER_NUMBER})</strong> · Status:{' '}
              <strong className={fonnteConfigured ? 'text-[#15803D]' : 'text-[#B45309]'}>
                {fonnteConfigured ? 'Siap Terhubung' : 'Menunggu FONNTE_TOKEN Server'}
              </strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={syncing}
              onClick={() => handleSyncGroups(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] text-xs font-semibold text-[#121820] bg-[#EFECE4] hover:bg-[#DFDCD3] rounded-xl cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Muat Daftar Grup</span>
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={() => handleSyncGroups(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[42px] text-xs font-semibold text-white bg-[#121820] hover:bg-[#BE123C] rounded-xl cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync Grup Baru (fetch-group)</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-[#626E7E] bg-[#F7F6F2] border border-[#DFDCD3] rounded-xl p-3.5">
          Catatan Fonnte: Tombol <strong>Sync Grup Baru (fetch-group)</strong> cukup ditekan satu kali di awal atau saat ada grup WhatsApp baru/perubahan nama grup. Aplikasi tidak menjalankan pemanggilan <code className="font-mono">fetch-group</code> otomatis berulang.
        </p>

        {statusMsg && (
          <div
            role="status"
            className={`p-3.5 rounded-xl border text-xs sm:text-sm ${
              statusMsg.type === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : statusMsg.type === 'warn'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-[#B91C1C]'
            }`}
          >
            {statusMsg.text}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Saved / Synced Groups */}
        <div className="lg:col-span-5 editorial-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#121820] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#BE123C]" />
              <span>Daftar Grup ({groups.length})</span>
            </h3>
            {groups.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedIds(
                    selectedIds.length === groups.length ? [] : groups.map((g) => g.id)
                  )
                }
                className="text-xs font-semibold text-[#BE123C] cursor-pointer"
              >
                {selectedIds.length === groups.length ? 'Batal Semua' : 'Pilih Semua'}
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-[#626E7E]">Memuat daftar grup tersimpan...</p>
          ) : sortedGroups.length === 0 ? (
            <p className="text-xs sm:text-sm text-[#626E7E] leading-relaxed">
              Belum ada grup WhatsApp yang tersimpan. Klik tombol <strong>Sync Grup Baru</strong> setelah <code className="font-mono">FONNTE_TOKEN</code> aktif di server.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {sortedGroups.map((g) => {
                const checked = selectedIds.includes(g.id);
                return (
                  <div
                    key={g.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                      checked
                        ? 'bg-[#121820] text-white border-[#121820]'
                        : 'bg-[#F7F6F2] text-[#121820] border-[#DFDCD3]'
                    }`}
                  >
                    <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroupSelection(g.id)}
                        className="w-4 h-4 accent-[#BE123C] shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold truncate">{g.name}</p>
                        <p className={`text-[11px] font-mono truncate ${checked ? 'text-slate-300' : 'text-[#626E7E]'}`}>
                          {g.id}
                        </p>
                      </div>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTogglePin(g.id)}
                      aria-label={g.pinned ? `Lepas pin ${g.name}` : `Sematkan favorit ${g.name}`}
                      className={`p-1.5 rounded-lg cursor-pointer shrink-0 ${
                        g.pinned
                          ? 'text-amber-400'
                          : checked
                          ? 'text-slate-400 hover:text-white'
                          : 'text-[#626E7E] hover:text-[#121820]'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${g.pinned ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Compose Group Announcement */}
        <form onSubmit={handleSendGroupMessage} className="lg:col-span-7 editorial-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[#121820]">Tulis Pengumuman Grup WhatsApp</h3>
            <span className="text-xs font-mono font-semibold text-[#BE123C]">
              {selectedIds.length} grup dipilih
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setMessage((prev) =>
                  `${prev ? prev + '\n\n' : ''}*INFO KUIS ONLINE TOMOYO*\nSilakan kerjakan latihan di: ${window.location.origin}/kuis`
                )
              }
              className="px-3 py-1.5 text-xs font-semibold bg-[#EFECE4] hover:bg-[#DFDCD3] text-[#121820] rounded-lg cursor-pointer"
            >
              + Sisipkan Link Kuis
            </button>
            <button
              type="button"
              onClick={() =>
                setMessage((prev) =>
                  `${prev ? prev + '\n\n' : ''}*PENGUMUMAN TOMOYO EDUCATION*\nKunjungi portal resmi kami: ${window.location.origin}`
                )
              }
              className="px-3 py-1.5 text-xs font-semibold bg-[#EFECE4] hover:bg-[#DFDCD3] text-[#121820] rounded-lg cursor-pointer"
            >
              + Sisipkan Info Resmi
            </button>
          </div>

          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis pengumuman resmi untuk grup orang tua atau siswa... Mendukung *tebal*, _miring_, baris baru, dan tautan."
            className="w-full px-4 py-3 text-sm bg-white border border-[#DFDCD3] rounded-xl focus:outline-none focus:border-[#121820]"
          />

          {message.trim() && (
            <div className="p-4 rounded-xl bg-[#EFECE4] border border-[#DFDCD3] space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#626E7E]">
                Pratinjau Pesan Grup
              </p>
              <p className="text-xs sm:text-sm text-[#121820] whitespace-pre-line leading-relaxed">
                {message}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 min-h-[46px] text-sm font-semibold text-white bg-[#BE123C] hover:bg-[#9F1239] rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {sending
                  ? 'Mengirim ke Grup...'
                  : `Kirim ke ${selectedIds.length} Grup WhatsApp`}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Group Send History */}
      <div className="editorial-card rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-[#121820]">Riwayat Pengiriman Grup ({logs.length})</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-[#626E7E]">Belum ada riwayat pengiriman ke grup WhatsApp.</p>
        ) : (
          <div className="space-y-3">
            {logs.slice(0, 15).map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-[#F7F6F2] border border-[#DFDCD3] space-y-1.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#121820]">
                    Tujuan: {log.groupNames.join(', ')}
                  </span>
                  <span
                    className={`font-semibold uppercase ${
                      log.status === 'sent'
                        ? 'text-[#15803D]'
                        : log.status === 'failed'
                        ? 'text-[#B91C1C]'
                        : 'text-[#B45309]'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
                <p className="text-[#3F4A59] whitespace-pre-line line-clamp-3">{log.message}</p>
                <p className="text-[11px] text-[#626E7E]">
                  Dikirim oleh {log.sentByEmail} · {new Date(log.sentAtIso).toLocaleString('id-ID')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
