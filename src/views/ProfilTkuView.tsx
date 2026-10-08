import { useConfirm } from '../components/ConfirmDialog';
import React, { useState } from 'react';
import { Pencil, Save, X } from 'lucide-react';
import { 
  Users, 
  Plus, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  MapPin, 
  Phone, 
  User, 
  Building,
  CheckCircle2
} from 'lucide-react';
import { AppState, TkuItem } from '../types';
import { formatPercent } from '../services/storage';

interface ProfilTkuViewProps {
  state: AppState;
  onUpdateTkuProfile: (index: number, field: keyof TkuItem, value: any) => void;
  onToggleTkuActive: (index: number) => void;
  onDeleteTku: (index: number) => void;
  onAddTku: (newTku: Omit<TkuItem, 'id' | 'penjualanAkm'>) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProfilTkuView: React.FC<ProfilTkuViewProps> = ({
  state,
  onUpdateTkuProfile,
  onToggleTkuActive,
  onDeleteTku,
  onAddTku,
  showToast
}) => {
  const { ask, dialog } = useConfirm();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<TkuItem[]>([]);

  const startEdit = () => {
    setDraft(state.tkus.map(t => ({ ...t })));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setDraft([]);
  };

  const setDraftField = (idx: number, patch: Partial<TkuItem>) => {
    setDraft(prev => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const saveEdit = () => {
    if (draft.some(t => !t.nama.trim())) {
      showToast('Nama TKU tidak boleh kosong', 'error');
      return;
    }
    const fields: (keyof TkuItem)[] = ['nama', 'rayon', 'pic', 'alamat', 'hp', 'jumlahArea', 'jumlahYl', 'coverageArea'];
    draft.forEach((d, idx) => {
      const orig = state.tkus[idx];
      if (!orig) return;
      fields.forEach(f => {
        if (d[f] !== orig[f]) {
          onUpdateTkuProfile(idx, f, f === 'nama' ? (d.nama as string).trim() : d[f]);
        }
      });
    });
    setEditMode(false);
    setDraft([]);
    showToast('Perubahan profil TKU disimpan', 'success');
  };
  const [newNama, setNewNama] = useState('');
  const [newRayon, setNewRayon] = useState<1 | 2>(1);
  const [newTarget, setNewTarget] = useState<number>(3000);
  const [newPic, setNewPic] = useState('');
  const [newAlamat, setNewAlamat] = useState('');
  const [newHp, setNewHp] = useState('');
  const [newJumlahArea, setNewJumlahArea] = useState<number>(10);
  const [newJumlahYl, setNewJumlahYl] = useState<number>(10);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) {
      showToast('Nama TKU wajib diisi', 'error');
      return;
    }

    onAddTku({
      nama: newNama.trim(),
      rayon: newRayon,
      targetHarian: newTarget || 0,
      aktif: true,
      pic: newPic.trim() || undefined,
      alamat: newAlamat.trim() || undefined,
      hp: newHp.trim() || undefined,
      jumlahArea: newJumlahArea || 0,
      jumlahYl: newJumlahYl || 0,
      coverageArea: newJumlahArea > 0 ? (newJumlahYl / newJumlahArea) : 1,
    });

    setNewNama('');
    setNewPic('');
    setNewAlamat('');
    setNewHp('');
    setShowAddForm(false);
    showToast(`${newNama} berhasil ditambahkan!`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Profil TKU
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {editMode ? (
            <>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Batal</span>
              </button>
              <button
                onClick={saveEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm shadow-brand-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddForm ? 'Tutup Form' : 'Tambah TKU'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add TKU Collapsible Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreate}
          className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-brand-200 dark:border-brand-900/60 shadow-md space-y-4 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Tambah TKU
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Nama TKU / Center *
              </label>
              <input
                type="text"
                placeholder="Contoh: Kaliwates"
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Wilayah Rayon
              </label>
              <select
                value={newRayon}
                onChange={(e) => setNewRayon(Number(e.target.value) as 1 | 2)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              >
                <option value={1}>Rayon 1 (Kota / Barat)</option>
                <option value={2}>Rayon 2 (Timur / Sub-rayon)</option>
              </select>
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Target Harian (botol/hari)
              </label>
              <input
                type="number"
                min={0}
                value={newTarget}
                onChange={(e) => setNewTarget(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Jumlah Yakult Lady (YL)
              </label>
              <input
                type="number"
                min={0}
                value={newJumlahYl}
                onChange={(e) => setNewJumlahYl(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Nama PIC / Koordinator
              </label>
              <input
                type="text"
                placeholder="Nama penanggung jawab"
                value={newPic}
                onChange={(e) => setNewPic(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                No. HP / WhatsApp PIC
              </label>
              <input
                type="text"
                placeholder="0812-xxxx-xxxx"
                value={newHp}
                onChange={(e) => setNewHp(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                Alamat Kantor TKU
              </label>
              <input
                type="text"
                placeholder="Alamat lengkap posko/center..."
                value={newAlamat}
                onChange={(e) => setNewAlamat(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 shadow-sm"
            >
              Simpan TKU Baru
            </button>
          </div>
        </form>
      )}

      {/* TKU Profiles Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Daftar TKU
            </h2>
          </div>
          <span className="text-xs font-mono text-neutral-500">
            {state.tkus.length} Unit Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-xs bg-neutral-50 dark:bg-neutral-800/40">
                <th className="py-2.5 px-3 font-semibold">Nama TKU</th>
                <th className="py-2.5 px-3 font-semibold">Rayon</th>
                <th className="py-2.5 px-3 font-semibold">PIC / Koordinator</th>
                <th className="py-2.5 px-3 font-semibold">Alamat Kantor</th>
                <th className="py-2.5 px-3 font-semibold">No. HP PIC</th>
                <th className="py-2.5 px-3 font-semibold text-center">Jml Area</th>
                <th className="py-2.5 px-3 font-semibold text-center">Jml YL</th>
                <th className="py-2.5 px-3 font-semibold text-center">% Cover</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 font-mono text-xs">
              {state.tkus.map((orig, idx) => {
                const t = editMode && draft[idx] ? draft[idx] : orig;
                const area = t.jumlahArea || 10;
                const yl = t.jumlahYl || 10;
                const coverPct = area > 0 ? (yl / area) : 1;
                const inp = "w-full px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:border-brand-500 focus:outline-none";
                const dash = (v?: string | number) => (v === undefined || v === '' ? <span className="text-neutral-300">-</span> : v);
                return (
                <tr
                  key={t.id || idx}
                  className={`hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-colors ${
                    !t.aktif ? 'opacity-50 bg-neutral-50/40 dark:bg-neutral-800/20' : ''
                  }`}
                >
                  <td className="py-3 px-3 font-sans font-bold text-neutral-900 dark:text-neutral-100">
                    {editMode ? (
                      <input type="text" value={t.nama} onChange={(e) => setDraftField(idx, { nama: e.target.value })} className={`${inp} font-bold`} />
                    ) : t.nama}
                  </td>

                  <td className="py-3 px-3 font-sans text-neutral-600 dark:text-neutral-400">
                    {editMode ? (
                      <select value={t.rayon} onChange={(e) => setDraftField(idx, { rayon: Number(e.target.value) as 1 | 2 })} className={inp}>
                        <option value={1}>Rayon 1</option>
                        <option value={2}>Rayon 2</option>
                      </select>
                    ) : `Rayon ${t.rayon}`}
                  </td>

                  <td className="py-3 px-3 font-sans">
                    {editMode ? (
                      <input type="text" value={t.pic || ''} placeholder="Nama PIC..." onChange={(e) => setDraftField(idx, { pic: e.target.value })} className={inp} />
                    ) : dash(t.pic)}
                  </td>

                  <td className="py-3 px-3 font-sans">
                    {editMode ? (
                      <input type="text" value={t.alamat || ''} placeholder="Alamat kantor..." onChange={(e) => setDraftField(idx, { alamat: e.target.value })} className={`${inp} w-48`} />
                    ) : dash(t.alamat)}
                  </td>

                  <td className="py-3 px-3">
                    {editMode ? (
                      <input type="text" value={t.hp || ''} placeholder="08xx..." onChange={(e) => setDraftField(idx, { hp: e.target.value })} className={`${inp} w-28 font-mono`} />
                    ) : dash(t.hp)}
                  </td>

                  <td className="py-3 px-3 text-center">
                    {editMode ? (
                      <input
                        type="number"
                        min={1}
                        value={t.jumlahArea || 10}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDraftField(idx, { jumlahArea: val, coverageArea: val > 0 ? (yl / val) : 1 });
                        }}
                        className={`${inp} w-16 text-center font-mono font-bold`}
                      />
                    ) : <span className="font-bold">{t.jumlahArea || 10}</span>}
                  </td>

                  <td className="py-3 px-3 text-center">
                    {editMode ? (
                      <input
                        type="number"
                        min={0}
                        value={t.jumlahYl || 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setDraftField(idx, { jumlahYl: val, coverageArea: area > 0 ? (val / area) : 1 });
                        }}
                        className={`${inp} w-16 text-center font-mono font-bold`}
                      />
                    ) : <span className="font-bold text-emerald-700 dark:text-emerald-300">{t.jumlahYl || 0}</span>}
                  </td>

                  <td className="py-3 px-3 text-center font-sans">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        coverPct >= 1.0
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {formatPercent(coverPct)}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-sans">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        t.aktif
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                    >
                      {t.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right">
                    {editMode ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            onToggleTkuActive(idx);
                            showToast(`Status ${t.nama} diubah`, 'info');
                          }}
                          className="px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          title={t.aktif ? 'Nonaktifkan TKU' : 'Aktifkan TKU'}
                        >
                          {t.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button
                          onClick={() => {
                            ask({
                              title: `Hapus Unit TKU?`,
                              message: `Apakah Anda yakin ingin menghapus unit TKU "${t.nama}"?
Semua riwayat dan data terkait akan ikut terhapus.`,
                              confirmLabel: 'Ya, Hapus Unit',
                              tone: 'danger',
                              onConfirm: () => {
                                onDeleteTku(idx);
                                setDraft(prev => prev.filter((_, i) => i !== idx));
                                showToast(`${t.nama} dihapus`, 'info');
                              }
                            });
                          }}
                          className="p-1 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Hapus Unit TKU"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : <span className="text-neutral-300">—</span>}
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>
      {dialog}
    </div>
  );
};