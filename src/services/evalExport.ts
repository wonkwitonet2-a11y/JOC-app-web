import { EvalUnit, ProgressEval, STATUS_LABEL } from './progressEval';
import { formatNumber, formatPercent, formatDiff, getPeriodInfo } from './storage';
import { listNotes, getReply } from './weeklyNotes';
import { AppState } from '../types';

// ============================================================================
// Catatan otomatis (dipakai panel di layar DAN ekspor, supaya isinya selalu sama)
// ============================================================================
export type NoteTone = 'good' | 'bad' | 'warn' | 'info';
export interface EvalNote { tone: NoteTone; text: string }

const fmtSigned = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${formatNumber(Math.abs(x))}`;
const joinNames = (u: EvalUnit[]) => u.map(x => x.name).join(', ');

export function buildNotes(ev: ProgressEval, units: EvalUnit[], total: EvalUnit): EvalNote[] {
  const notes: EvalNote[] = [];
  const p = total.progress;

  // 1. Proyeksi akhir bulan
  if (p.targetMonth > 0) {
    if (p.status === 'tercapai') {
      notes.push({ tone: 'good', text: `Target bulan sudah tercapai (${formatNumber(p.acc)} dari ${formatNumber(p.targetMonth)} btl).` });
    } else if (p.workLeft === 0) {
      notes.push({ tone: p.pctToDate !== null && p.pctToDate >= 1 ? 'good' : 'bad', text: `Bulan selesai di ${formatPercent(p.pctToDate)} dari target (selisih ${fmtSigned(p.gapToDate)} btl).` });
    } else {
      const need = p.needPerDay !== null ? Math.ceil(p.needPerDay) : 0;
      notes.push({
        tone: p.status === 'aman' ? 'good' : p.status === 'waspada' ? 'warn' : 'bad',
        text: `Dengan laju ${formatNumber(p.avgPerWorkDay)} btl/hari, akhir bulan diperkirakan ${formatPercent(p.projectedPct)}. Untuk mengejar target perlu ${formatNumber(need)} btl/hari selama ${p.workLeft} hari kerja.`
      });
    }
  }

  // 2. Minggu ini vs minggu lalu
  const withCmp = units.filter(u => u.week.days.length > 0 && u.week.prev > 0);
  if (withCmp.length > 1) {
    const sorted = [...withCmp].sort((a, b) => b.week.diff - a.week.diff);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best.week.diff > 0) notes.push({ tone: 'good', text: `Naik terbanyak: ${best.name} (${fmtSigned(best.week.diff)} btl, ${formatPercent(best.week.pct)}).` });
    if (worst.week.diff < 0) notes.push({ tone: 'bad', text: `Turun terbanyak: ${worst.name} (${fmtSigned(worst.week.diff)} btl, ${formatPercent(worst.week.pct)}).` });
  }
  const watch = withCmp.filter(u => u.week.downDays >= 2 && u.week.diff < 0);
  if (watch.length > 0) notes.push({ tone: 'warn', text: `Perlu perhatian (turun ≥ 2 hari): ${watch.map(u => `${u.name} (${u.week.downDays} hari)`).join(', ')}.` });

  // 3. Penyebab yang mungkin: BB naik / absen naik pada TKU yang penjualannya turun
  const bbUp = (u: EvalUnit) => u.week.bbPctCur !== null && u.week.bbPctPrev !== null && u.week.bbPctCur - u.week.bbPctPrev >= 0.005;
  const absenUp = (u: EvalUnit) => u.week.absenPrev !== null && u.week.absenNow > u.week.absenPrev;
  const fallers = withCmp.filter(u => u.week.diff < 0);
  const bbCause = fallers.filter(bbUp);
  const absenCause = fallers.filter(absenUp);
  if (bbCause.length > 0) notes.push({ tone: 'warn', text: `Penjualan turun bersamaan dengan % BB naik: ${joinNames(bbCause)}. Cek kualitas / sisa stok di TKU tersebut.` });
  if (absenCause.length > 0) notes.push({ tone: 'warn', text: `Penjualan turun bersamaan dengan absen bertambah: ${joinNames(absenCause)}.` });
  const bbOnlyUp = units.filter(u => bbUp(u) && !bbCause.includes(u));
  if (bbOnlyUp.length > 0) notes.push({ tone: 'info', text: `% BB naik minggu ini: ${joinNames(bbOnlyUp)}.` });

  // 4. Tren antar-minggu
  const streakers = units.filter(u => u.streak >= 2);
  if (streakers.length > 0) {
    notes.push({ tone: 'bad', text: `Rata-rata per hari turun berturut-turut: ${streakers.map(u => `${u.name} (${u.streak} minggu)`).join(', ')}.` });
  }

  // 5. Varian yang paling berubah (minggu terakhir vs sebelumnya, seluruh TKU yang tampil)
  const vt = ev.variantTrend(units);
  const changes = vt
    .map(v => {
      const seq = v.avg.filter(x => x !== null) as number[];
      if (seq.length < 2) return null;
      const a = seq[seq.length - 2];
      const b = seq[seq.length - 1];
      return { code: v.code, pct: a > 0 ? b / a - 1 : 0, diff: b - a };
    })
    .filter((x): x is { code: 'YO' | 'OM' | 'OS' | 'YT'; pct: number; diff: number } => x !== null);
  if (changes.length > 0) {
    const down = [...changes].sort((a, b) => a.pct - b.pct)[0];
    const up = [...changes].sort((a, b) => b.pct - a.pct)[0];
    if (down.pct < -0.01) notes.push({ tone: 'warn', text: `Varian paling turun vs minggu sebelumnya: ${down.code} (${fmtSigned(Math.round(down.diff))} btl/hari).` });
    if (up.pct > 0.01) notes.push({ tone: 'good', text: `Varian paling naik vs minggu sebelumnya: ${up.code} (${fmtSigned(Math.round(up.diff))} btl/hari).` });
  }

  return notes;
}

// ============================================================================
// Dokumen ringkasan (struktur netral untuk gambar / PDF / teks)
// ============================================================================
export type Tone = 'good' | 'bad' | 'warn' | undefined;
export interface Cell { t: string; tone?: Tone }
export type Block =
  | { type: 'kv'; title: string; rows: { k: string; v: Cell }[] }
  | { type: 'table'; title: string; head: string[]; rows: Cell[][]; boldLast?: boolean }
  | { type: 'list'; title: string; items: EvalNote[] };
export interface ExportDoc { title: string; subtitle: string; blocks: Block[] }

const toneOf = (x: number | null, goodWhenHigh = true): Tone =>
  x === null || x === 0 ? undefined : (x > 0) === goodWhenHigh ? 'good' : 'bad';

export function buildExportDoc(
  ev: ProgressEval,
  opts: { title: string; units: EvalUnit[]; total: EvalUnit | null; scopeLabel: string; state?: AppState }
): ExportDoc {
  const { units, total } = opts;
  const head = total ?? units[0];
  const blocks: Block[] = [];

  if (head) {
    const p = head.progress;
    blocks.push({
      type: 'kv',
      title: 'Capaian & Proyeksi',
      rows: [
        { k: `Capaian s/d tgl ${p.updateDay}`, v: { t: `${formatPercent(p.pctToDate)} (${formatNumber(p.acc)} / ${formatNumber(p.targetToDate)} btl)`, tone: p.pctToDate === null ? undefined : p.pctToDate >= 1 ? 'good' : 'bad' } },
        { k: 'Selisih vs target', v: { t: `${formatDiff(p.gapToDate)} btl`, tone: toneOf(p.gapToDate) } },
        { k: 'Sisa hari kerja', v: { t: p.workLeft > 0 ? `${p.workLeft} hari (tanpa Minggu)` : 'Bulan sudah selesai' } },
        { k: 'Butuh per hari', v: { t: p.needPerDay === null ? '—' : `${formatNumber(Math.ceil(p.needPerDay))} btl (laju kini ${formatNumber(p.avgPerWorkDay)})` } },
        { k: 'Proyeksi akhir bulan', v: { t: `${formatPercent(p.projectedPct)} dari target bulan`, tone: p.projectedPct === null ? undefined : p.projectedPct >= 1 ? 'good' : p.projectedPct >= 0.95 ? 'warn' : 'bad' } },
        { k: 'Status', v: { t: STATUS_LABEL[p.status], tone: p.status === 'tercapai' || p.status === 'aman' ? 'good' : p.status === 'waspada' ? 'warn' : p.status === 'berat' ? 'bad' : undefined } }
      ]
    });
  }

  const rowsFor = (list: EvalUnit[]) =>
    list.map(u => {
      const w = u.week;
      const hasCmp = w.days.length > 0 && w.prev > 0;
      const bbDelta = w.bbPctCur !== null && w.bbPctPrev !== null ? w.bbPctCur - w.bbPctPrev : null;
      const absenDelta = w.absenPrev !== null ? w.absenNow - w.absenPrev : null;
      const sylDelta = w.sylNow !== null && w.sylPrev !== null ? w.sylNow - w.sylPrev : null;
      return [
        { t: u.name },
        { t: hasCmp ? fmtSigned(w.diff) : '—', tone: hasCmp ? toneOf(w.diff) : undefined },
        { t: hasCmp ? formatPercent(w.pct) : '—', tone: hasCmp ? toneOf(w.diff) : undefined },
        { t: bbDelta === null ? '—' : `${formatPercent(w.bbPctCur)}`, tone: toneOf(bbDelta, false) },
        { t: absenDelta === null ? '—' : `${formatNumber(w.absenNow)} (${absenDelta > 0 ? '+' : ''}${absenDelta})`, tone: toneOf(absenDelta, false) },
        { t: w.sylNow === null ? '—' : `${formatNumber(w.sylNow)}${sylDelta === null ? '' : ` (${sylDelta > 0 ? '+' : ''}${sylDelta})`}`, tone: toneOf(sylDelta) }
      ] as Cell[];
    });

  if (units.length > 0) {
    blocks.push({
      type: 'table',
      title: `Minggu ini vs minggu lalu (tgl ${ev.cmp.start}–${Math.min(ev.cmp.end, ev.updateDay)})`,
      head: ['TKU', 'Selisih btl', '% vs mgg lalu', '% BB', 'Absen', 's/YL'],
      rows: [...rowsFor(units), ...(total ? rowsFor([total]) : [])],
      boldLast: Boolean(total)
    });

    const cols = ev.weekCols;
    const trendRow = (u: EvalUnit): Cell[] => [
      { t: u.name },
      ...cols.map((_, i) => {
        const v = u.trend[i];
        if (v === null || v === undefined) return { t: '—' } as Cell;
        const before = u.trend.slice(0, i).filter(x => x !== null).pop() as number | undefined;
        return { t: formatNumber(v), tone: before === undefined ? undefined : toneOf(v - before) } as Cell;
      }),
      { t: u.streak >= 2 ? `Turun ${u.streak} mgg` : '', tone: u.streak >= 2 ? 'bad' : undefined }
    ];
    blocks.push({
      type: 'table',
      title: 'Tren rata-rata per hari (btl, pembagi 7 hari Min–Sab)',
      head: ['TKU', ...cols.map(c => `M${c.id}`), 'Catatan'],
      rows: [...units.map(trendRow), ...(total ? [trendRow(total)] : [])],
      boldLast: Boolean(total)
    });

    const vt = ev.variantTrend(units);
    blocks.push({
      type: 'table',
      title: 'Tren per varian (btl per hari, pembagi 7 hari Min–Sab)',
      head: ['Varian', ...cols.map(c => `M${c.id}`)],
      rows: vt.map(v => [
        { t: v.code },
        ...v.avg.map((x, i) => {
          if (x === null) return { t: '—' } as Cell;
          const before = v.avg.slice(0, i).filter(y => y !== null).pop() as number | undefined;
          return { t: formatNumber(x), tone: before === undefined ? undefined : toneOf(x - before) } as Cell;
        })
      ])
    });
  }

  if (head) {
    const items = buildNotes(ev, units, head);
    if (items.length > 0) blocks.push({ type: 'list', title: 'Catatan evaluasi', items });
  }

  // Catatan mingguan yang ditulis TKU (alasan/kendala + solusi) untuk minggu yang sedang dievaluasi.
  if (opts.state) {
    const st = opts.state;
    const periode = getPeriodInfo(st).key;
    const week = ev.cmp.weekIdx + 1;
    const items: EvalNote[] = [];
    units.forEach(u => {
      if (u.idx < 0) return;
      const tku = st.tkus[u.idx];
      if (!tku) return;
      const entries = listNotes(st, periode, tku.id, week);
      if (entries.length === 0) return;
      entries.forEach(({ k, n }) => {
        const rp = st.weeklyReplies?.[k];
        const parts: string[] = [];
        if (n.l.length > 0) parts.push(`[${n.l.join(', ')}]`);
        if (n.a.trim()) parts.push(`Kendala: ${n.a.trim()}`);
        if (n.s.trim()) parts.push(`Solusi: ${n.s.trim()} (${n.st === 'selesai' ? 'selesai' : n.st === 'proses' ? 'proses' : 'belum'})`);
        if (rp && rp.t.trim()) parts.push(`Tanggapan admin: ${rp.t.trim()}`);
        items.push({ tone: 'info', text: `${u.name}: ${parts.join(' • ')}` });
      });
    });
    if (items.length > 0) blocks.push({ type: 'list', title: `Catatan TKU minggu M${week}`, items });
  }

  return {
    title: opts.title,
    subtitle: `${opts.scopeLabel} • ${ev.periodLabel} • data s/d tgl ${ev.updateDay}`,
    blocks
  };
}

// ============================================================================
// Teks (untuk disalin ke WhatsApp)
// ============================================================================
export function docToText(doc: ExportDoc): string {
  const out: string[] = [`*${doc.title}*`, doc.subtitle, ''];
  doc.blocks.forEach(b => {
    out.push(`*${b.title}*`);
    if (b.type === 'kv') b.rows.forEach(r => out.push(`• ${r.k}: ${r.v.t}`));
    else if (b.type === 'list') b.items.forEach(i => out.push(`• ${i.text}`));
    else {
      b.rows.forEach(r => {
        const parts = r.slice(1).map((c, i) => (c.t ? `${b.head[i + 1]} ${c.t}` : '')).filter(Boolean);
        out.push(`• ${r[0].t}: ${parts.join(' | ')}`);
      });
    }
    out.push('');
  });
  return out.join('\n').trim();
}

// ============================================================================
// Gambar PNG (digambar langsung di canvas: tanpa library tambahan)
// ============================================================================
const COLORS = {
  bg: '#ffffff',
  ink: '#171717',
  muted: '#737373',
  line: '#e5e5e5',
  head: '#f5f5f5',
  good: '#047857',
  bad: '#b91c1c',
  warn: '#b45309',
  brand: '#c8102e'
};
const toneColor = (t: Tone | NoteTone) => (t === 'good' ? COLORS.good : t === 'bad' ? COLORS.bad : t === 'warn' ? COLORS.warn : COLORS.ink);

export function renderDocToCanvas(doc: ExportDoc): HTMLCanvasElement {
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const PAD = 36;
  const scale = 2;
  const probe = document.createElement('canvas').getContext('2d')!;
  const measure = (text: string, size: number, bold = false) => {
    probe.font = `${bold ? '700' : '500'} ${size}px ${FONT}`;
    return probe.measureText(text).width;
  };

  // Lebar tiap tabel (kolom mengikuti isi), lalu lebar kanvas = tabel terlebar
  const tableWidths = doc.blocks.map(b => {
    if (b.type !== 'table') return 0;
    const cols = b.head.map((h, ci) => {
      const w = Math.max(measure(h, 16, true), ...b.rows.map(r => measure(r[ci]?.t ?? '', 17, true)));
      return w + 22;
    });
    return cols.reduce((a, c) => a + c, 0);
  });
  const width = Math.max(820, Math.ceil(Math.max(...tableWidths, 0)) + PAD * 2);
  const inner = width - PAD * 2;

  // Pemecah baris untuk teks panjang
  const wrap = (text: string, size: number, maxW: number, bold = false): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let cur = '';
    words.forEach(w => {
      const test = cur ? `${cur} ${w}` : w;
      if (measure(test, size, bold) > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
    });
    if (cur) lines.push(cur);
    return lines;
  };

  // Hitung tinggi dulu
  let h = PAD + 34 + 26 + 18;
  doc.blocks.forEach(b => {
    h += 34; // judul blok
    if (b.type === 'kv') h += b.rows.length * 34 + 10;
    else if (b.type === 'table') h += 34 + b.rows.length * 34 + 10;
    else h += b.items.reduce((s, i) => s + wrap(i.text, 17, inner - 24).length * 24 + 6, 0) + 10;
  });
  h += PAD;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, h);
  ctx.textBaseline = 'middle';

  const text = (s: string, x: number, y: number, size: number, color: string, bold = false, align: CanvasTextAlign = 'left') => {
    ctx.font = `${bold ? '700' : '500'} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(s, x, y);
  };

  let y = PAD;
  ctx.fillStyle = COLORS.brand;
  ctx.fillRect(PAD, y, 6, 52);
  text(doc.title, PAD + 18, y + 14, 26, COLORS.ink, true);
  text(doc.subtitle, PAD + 18, y + 42, 15, COLORS.muted);
  y += 52 + 18;

  doc.blocks.forEach(b => {
    text(b.title, PAD, y + 12, 18, COLORS.ink, true);
    y += 34;
    if (b.type === 'kv') {
      b.rows.forEach(r => {
        text(r.k, PAD + 8, y + 15, 16, COLORS.muted);
        text(r.v.t, PAD + 230, y + 15, 17, toneColor(r.v.tone), true);
        ctx.fillStyle = COLORS.line;
        ctx.fillRect(PAD, y + 33, inner, 1);
        y += 34;
      });
      y += 10;
    } else if (b.type === 'table') {
      const widths = b.head.map((hd, ci) => Math.max(measure(hd, 16, true), ...b.rows.map(r => measure(r[ci]?.t ?? '', 17, true))) + 22);
      const extra = (inner - widths.reduce((a, c) => a + c, 0)) / widths.length;
      const cw = widths.map(w => w + Math.max(0, extra));
      ctx.fillStyle = COLORS.head;
      ctx.fillRect(PAD, y, inner, 34);
      let x = PAD;
      b.head.forEach((hd, ci) => {
        text(hd, ci === 0 ? x + 10 : x + cw[ci] - 10, y + 17, 15, COLORS.muted, true, ci === 0 ? 'left' : 'right');
        x += cw[ci];
      });
      y += 34;
      b.rows.forEach((r, ri) => {
        const last = b.boldLast && ri === b.rows.length - 1;
        if (last) { ctx.fillStyle = '#fafafa'; ctx.fillRect(PAD, y, inner, 34); }
        let cx = PAD;
        r.forEach((c, ci) => {
          text(c.t, ci === 0 ? cx + 10 : cx + cw[ci] - 10, y + 17, 16, ci === 0 ? COLORS.ink : toneColor(c.tone), ci === 0 || last || Boolean(c.tone), ci === 0 ? 'left' : 'right');
          cx += cw[ci];
        });
        ctx.fillStyle = COLORS.line;
        ctx.fillRect(PAD, y + 33, inner, 1);
        y += 34;
      });
      y += 10;
    } else {
      b.items.forEach(it => {
        const lines = wrap(it.text, 17, inner - 24);
        ctx.fillStyle = toneColor(it.tone === 'info' ? undefined : it.tone);
        ctx.beginPath();
        ctx.arc(PAD + 8, y + 12, 5, 0, Math.PI * 2);
        ctx.fill();
        lines.forEach((ln, li) => text(ln, PAD + 24, y + 12 + li * 24, 17, COLORS.ink));
        y += lines.length * 24 + 6;
      });
      y += 10;
    }
  });

  return canvas;
}

const safeName = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();

/** Simpan sebagai PNG. Di HP, memakai menu Bagikan (langsung ke WhatsApp) bila tersedia. */
export async function exportDocPng(doc: ExportDoc, fileBase: string): Promise<'shared' | 'downloaded'> {
  const canvas = renderDocToCanvas(doc);
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Gagal membuat gambar'))), 'image/png'));
  const file = new File([blob], `${safeName(fileBase)}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: doc.title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared';
      // lanjut ke unduhan biasa
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

// ============================================================================
// PDF (lewat dialog cetak browser: pilih "Simpan sebagai PDF")
// ============================================================================
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cls = (t: Tone | NoteTone) => (t === 'good' ? 'g' : t === 'bad' ? 'b' : t === 'warn' ? 'w' : '');

export function docToHtml(doc: ExportDoc): string {
  const body = doc.blocks.map(b => {
    if (b.type === 'kv') {
      return `<h2>${esc(b.title)}</h2><table class="kv">${b.rows.map(r => `<tr><td class="k">${esc(r.k)}</td><td class="${cls(r.v.tone)}">${esc(r.v.t)}</td></tr>`).join('')}</table>`;
    }
    if (b.type === 'list') {
      return `<h2>${esc(b.title)}</h2><ul>${b.items.map(i => `<li class="${cls(i.tone === 'info' ? undefined : i.tone)}"><span>${esc(i.text)}</span></li>`).join('')}</ul>`;
    }
    return `<h2>${esc(b.title)}</h2><table class="t"><thead><tr>${b.head.map((hd, i) => `<th class="${i === 0 ? 'l' : 'r'}">${esc(hd)}</th>`).join('')}</tr></thead><tbody>${b.rows
      .map((r, ri) => `<tr class="${b.boldLast && ri === b.rows.length - 1 ? 'tot' : ''}">${r.map((c, i) => `<td class="${i === 0 ? 'l' : 'r'} ${cls(c.tone)}">${esc(c.t)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`;
  }).join('');
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
@page{size:A4 landscape;margin:12mm}
*{box-sizing:border-box}body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#171717;font-size:12px;margin:0}
h1{font-size:20px;margin:0 0 2px;border-left:6px solid #c8102e;padding-left:10px}.sub{color:#737373;margin:0 0 14px 16px}
h2{font-size:14px;margin:16px 0 6px;break-after:avoid}
table{border-collapse:collapse;width:100%}th,td{padding:5px 8px;border-bottom:1px solid #e5e5e5}th{background:#f5f5f5;color:#737373;font-size:11px}
.l{text-align:left}.r{text-align:right;font-variant-numeric:tabular-nums}.kv td.k{color:#737373;width:220px}.kv td{font-weight:600}
.tot td{font-weight:700;background:#fafafa}.g{color:#047857;font-weight:700}.b{color:#b91c1c;font-weight:700}.w{color:#b45309;font-weight:700}
ul{margin:0;padding-left:18px}li{margin:3px 0}li.g,li.b,li.w{font-weight:500}li.g::marker{color:#047857}li.b::marker{color:#b91c1c}li.w::marker{color:#b45309}
tr{break-inside:avoid}
</style></head><body><h1>${esc(doc.title)}</h1><p class="sub">${esc(doc.subtitle)}</p>${body}</body></html>`;
}

export function exportDocPdf(doc: ExportDoc): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const w = iframe.contentWindow;
  const d = iframe.contentDocument || w?.document;
  if (!w || !d) { iframe.remove(); return; }
  d.open();
  d.write(docToHtml(doc));
  d.close();
  setTimeout(() => {
    w.focus();
    w.print();
    setTimeout(() => iframe.remove(), 60000);
  }, 300);
}
