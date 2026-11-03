// Jembatan clipboard untuk aplikasi Android (WebView).
// Di WebView, navigator.clipboard.readText() ditolak ("Read permission denied")
// sehingga tombol "Tempel" membutuhkan jembatan. Ada dua jalur:
//  1) `window.AndroidClipboard` (proyek Android WebView lama), atau
//  2) APK Capacitor "Jember Operation Center": aplikasi ini berjalan di dalam iframe,
//     lalu meminta halaman induk (shell APK) membaca/menulis clipboard lewat postMessage
//     ('yk-clip' -> 'yk-clip-result'). Jalur 2 hanya dicoba kalau clipboard bawaan browser gagal,
//     jadi di browser biasa perilakunya tidak berubah.

type BridgeReply = { id: number; text?: string; ok?: boolean };

interface NativeBridge {
  postMessage: (msg: string) => void;
  addEventListener: (type: 'message', cb: (ev: MessageEvent) => void) => void;
}

const TIMEOUT_MS = 2000;

type ParentReply = { type?: string; id?: number; ok?: boolean; text?: string };

// Jalur 2: minta halaman induk (shell Capacitor) lewat postMessage.
function installParentBridge(): void {
  let inIframe = false;
  try { inIframe = window.parent !== window; } catch { inIframe = true; }
  if (!inIframe) return;

  const clip = (navigator.clipboard as unknown as {
    readText?: () => Promise<string>;
    writeText?: (t: string) => Promise<void>;
  } | undefined);
  const origRead = clip?.readText ? clip.readText.bind(clip) : null;
  const origWrite = clip?.writeText ? clip.writeText.bind(clip) : null;

  let nextId = 1;
  const askParent = (op: 'read' | 'write', text?: string): Promise<ParentReply> =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const onMsg = (ev: MessageEvent) => {
        const d = ev.data as ParentReply | null;
        if (ev.source !== window.parent || !d || d.type !== 'yk-clip-result' || d.id !== id) return;
        window.clearTimeout(timer);
        window.removeEventListener('message', onMsg);
        resolve(d);
      };
      const timer = window.setTimeout(() => {
        window.removeEventListener('message', onMsg);
        reject(new Error('Halaman induk tidak merespons'));
      }, TIMEOUT_MS + 1000);
      window.addEventListener('message', onMsg);
      try {
        window.parent.postMessage({ type: 'yk-clip', op, id, text }, '*');
      } catch (e) {
        window.clearTimeout(timer);
        window.removeEventListener('message', onMsg);
        reject(e);
      }
    });

  const patched = {
    readText: async (): Promise<string> => {
      try {
        if (!origRead) throw new Error('navigator.clipboard.readText tidak tersedia');
        return await origRead();
      } catch (err) {
        try {
          const r = await askParent('read');
          if (r.ok && typeof r.text === 'string') return r.text;
        } catch { /* jatuh ke error asli */ }
        throw err;
      }
    },
    writeText: async (text: string): Promise<void> => {
      try {
        if (!origWrite) throw new Error('navigator.clipboard.writeText tidak tersedia');
        await origWrite(text);
      } catch (err) {
        try {
          const r = await askParent('write', String(text));
          if (r.ok) return;
        } catch { /* jatuh ke error asli */ }
        throw err;
      }
    }
  };

  try {
    const existing = navigator.clipboard as unknown as object | undefined;
    if (existing) {
      Object.defineProperty(existing, 'readText', { value: patched.readText, configurable: true, writable: true });
      Object.defineProperty(existing, 'writeText', { value: patched.writeText, configurable: true, writable: true });
    } else {
      Object.defineProperty(navigator, 'clipboard', { value: patched, configurable: true });
    }
  } catch {
    // Kalau gagal dipasang, biarkan fallback biasa
  }
}

export function installNativeClipboard(): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  const bridge = (window as unknown as { AndroidClipboard?: NativeBridge }).AndroidClipboard;
  if (!bridge || typeof bridge.postMessage !== 'function') {
    installParentBridge();
    return;
  }

  let nextId = 1;
  const pending = new Map<number, (reply: BridgeReply) => void>();

  bridge.addEventListener('message', (ev: MessageEvent) => {
    try {
      const reply = JSON.parse(String(ev.data)) as BridgeReply;
      const done = pending.get(reply.id);
      if (done) {
        pending.delete(reply.id);
        done(reply);
      }
    } catch {
      // abaikan pesan yang tidak dikenal
    }
  });

  const call = (payload: Record<string, unknown>): Promise<BridgeReply> =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = window.setTimeout(() => {
        pending.delete(id);
        reject(new Error('Clipboard Android tidak merespons'));
      }, TIMEOUT_MS);
      pending.set(id, (reply) => {
        window.clearTimeout(timer);
        resolve(reply);
      });
      bridge.postMessage(JSON.stringify({ id, ...payload }));
    });

  const nativeClipboard = {
    readText: async (): Promise<string> => {
      const reply = await call({ op: 'read' });
      return typeof reply.text === 'string' ? reply.text : '';
    },
    writeText: async (text: string): Promise<void> => {
      const reply = await call({ op: 'write', text: String(text) });
      if (!reply.ok) throw new Error('Gagal menyalin ke clipboard Android');
    }
  };

  try {
    const existing = navigator.clipboard as unknown as object | undefined;
    if (existing) {
      Object.defineProperty(existing, 'readText', {
        value: nativeClipboard.readText,
        configurable: true,
        writable: true
      });
      Object.defineProperty(existing, 'writeText', {
        value: nativeClipboard.writeText,
        configurable: true,
        writable: true
      });
    } else {
      Object.defineProperty(navigator, 'clipboard', {
        value: nativeClipboard,
        configurable: true
      });
    }
  } catch {
    // Kalau gagal dipasang, biarkan fallback biasa
  }
}
