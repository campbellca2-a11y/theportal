'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { receiveTally, type TransferTally } from '@/lib/arrival-feedback';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  Camera,
  FileUp,
  File as FileIcon,
  Download,
  Trash2,
  Smartphone,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
type Item = {
  id: string;
  name: string;
  mime: string;
  size: number;
  created: number;
  source: string;
};
type Info = {
  local: boolean;
  address: string | null;
  maxFile: number;
  maxTotal: number;
  pair?: { code: string; expires: number; qr: string };
};
type Message = { text: string; error?: boolean };
type ToolRegistry = {
  registerTool: (
    tool: unknown,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
function bytes(n: number) {
  return n < 1024
    ? n + ' B'
    : n < 1048576
      ? (n / 1024).toFixed(1) + ' KB'
      : (n / 1048576).toFixed(1) + ' MB';
}
async function api<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
) {
  const response = await fetch('/api/' + path, {
    ...options,
    cache: 'no-store',
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || 'The PC could not finish that request.'),
      { status: response.status },
    );
  return data;
}
export default function Home() {
  const [connected, setConnected] = useState(false),
    [ready, setReady] = useState(false),
    [online, setOnline] = useState(false);
  const [items, setItems] = useState<Item[]>([]),
    [info, setInfo] = useState<Info | null>(null);
  const [notice, setNotice] = useState<Message | null>(null),
    [code, setCode] = useState(''),
    [pairBusy, setPairBusy] = useState(false);
  const [showPair, setShowPair] = useState(false),
    [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{
    name: string;
    percent: number;
    index: number;
    count: number;
  } | null>(null);
  const [removing, setRemoving] = useState<Item | null>(null),
    [deleteBusy, setDeleteBusy] = useState(false);
  const files = useRef<HTMLInputElement>(null),
    camera = useRef<HTMLInputElement>(null),
    busy = useRef(false);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [tally, setTally] = useState<TransferTally | null>(null),
    [resetBusy, setResetBusy] = useState(false);
  const [arrival, setArrival] = useState<{ id: number; count: number } | null>(
      null,
    ),
    [glowing, setGlowing] = useState(false);
  const tallyRef = useRef<TransferTally | null>(null),
    refreshRequest = useRef(0),
    lastAppliedRequest = useRef(0),
    pulseSequence = useRef(0);
  const observeTally = useCallback((incoming: TransferTally | undefined) => {
    if (!incoming) return false;
    const received = receiveTally(tallyRef.current, incoming);
    if (received.stale) return true;
    tallyRef.current = received.tally;
    setTally(received.tally);
    if (received.arrived) {
      setArrival({ id: ++pulseSequence.current, count: received.arrived });
      setGlowing(true);
    }
    return false;
  }, []);
  useEffect(() => {
    if (!arrival) return;
    const timer = setTimeout(() => setGlowing(false), 5000);
    return () => clearTimeout(timer);
  }, [arrival]);
  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current;
    try {
      const data = await api<{ items: Item[]; tally?: TransferTally }>('items');
      if (request >= lastAppliedRequest.current) {
        lastAppliedRequest.current = request;
        const stale = observeTally(data.tally);
        if (!stale) setItems(data.items);
        setOnline(true);
      }
      return data.items;
    } catch (e) {
      if (request >= lastAppliedRequest.current) {
        lastAppliedRequest.current = request;
        setOnline(false);
        if ((e as { status?: number }).status === 401) setConnected(false);
      }
      throw e;
    }
  }, [observeTally]);
  const load = useCallback(async () => {
    const data = await api<Info>('info');
    setInfo(data);
    await refresh();
    setConnected(true);
    setReady(true);
  }, [refresh]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = new URLSearchParams(window.location.hash.slice(1)).get(
          'pair',
        );
        if (token) {
          history.replaceState(null, '', window.location.pathname);
          await api('connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
        } else if (
          ['127.0.0.1', 'localhost'].includes(window.location.hostname)
        )
          await api('connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ local: true }),
          });
        if (alive) await load();
      } catch (e) {
        if (alive) {
          setReady(true);
          if ((e as { status?: number }).status !== 401)
            setNotice({
              text: 'Cannot reach the PC. Make sure the portal is running and both devices are on the home network.',
              error: true,
            });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [load]);
  useEffect(() => {
    if (!connected) return;
    const update = () => {
      if (!document.hidden) void refresh().catch(() => {});
    };
    const poll = setInterval(update, 1500),
      infoPoll = setInterval(() => {
        if (!document.hidden)
          void api<Info>('info')
            .then(setInfo)
            .catch(() => {});
      }, 60000);
    document.addEventListener('visibilitychange', update);
    window.addEventListener('online', update);
    return () => {
      clearInterval(poll);
      clearInterval(infoPoll);
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('online', update);
    };
  }, [connected, refresh]);
  async function pair(event: React.FormEvent) {
    event.preventDefault();
    setPairBusy(true);
    setNotice(null);
    try {
      await api('connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.replace(/\s/g, '') }),
      });
      await load();
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
    } finally {
      setPairBusy(false);
    }
  }
  const upload = useCallback(
    async (selected: File[]) => {
      if (!selected.length || busy.current || !connected) return;
      busy.current = true;
      setNotice(null);
      let done = 0;
      try {
        for (let index = 0; index < selected.length; index++) {
          const file = selected[index];
          if (file.size > (info?.maxFile || 104857600))
            throw new Error(file.name + ' is larger than 100 MB.');
          setProgress({
            name: file.name,
            percent: 0,
            index: index + 1,
            count: selected.length,
          });
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhrRef.current = xhr;
            xhr.open('POST', '/api/items');
            xhr.timeout = 300000;
            xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
            xhr.setRequestHeader(
              'Content-Type',
              file.type || 'application/octet-stream',
            );
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable)
                setProgress({
                  name: file.name,
                  percent: Math.round((e.loaded / e.total) * 100),
                  index: index + 1,
                  count: selected.length,
                });
            };
            xhr.onload = () => {
              if (xhr.status === 201) {
                try {
                  observeTally(JSON.parse(xhr.responseText).tally);
                } catch {}
                resolve();
              } else {
                let error = 'Upload failed. Try again.';
                try {
                  error = JSON.parse(xhr.responseText).error || error;
                } catch {}
                reject(new Error(error));
              }
            };
            xhr.onerror = () =>
              reject(
                new Error('Connection lost. Keep the PC awake and try again.'),
              );
            xhr.ontimeout = () =>
              reject(new Error('Transfer timed out. Try again.'));
            xhr.onabort = () => reject(new Error('Transfer canceled.'));
            xhr.send(file);
          });
          done++;
          await refresh();
        }
        setNotice({
          text:
            done === 1
              ? 'In the portal. Ready on your other device.'
              : done + ' files are in the portal.',
        });
      } catch (e) {
        setNotice({
          text:
            (done ? done + ' file(s) arrived. ' : '') + (e as Error).message,
          error: true,
        });
      } finally {
        busy.current = false;
        xhrRef.current = null;
        setProgress(null);
      }
    },
    [connected, info?.maxFile, refresh, observeTally],
  );
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (
        (event.target as HTMLElement)?.closest(
          'input,textarea,[contenteditable="true"]',
        )
      )
        return;
      const selected = Array.from(event.clipboardData?.files || []);
      if (selected.length) {
        event.preventDefault();
        void upload(selected);
      }
    };
    document.addEventListener('paste', paste);
    return () => document.removeEventListener('paste', paste);
  }, [upload]);
  useEffect(() => {
    if (!connected) return;
    const registry = (document as Document & { modelContext?: ToolRegistry })
      .modelContext;
    if (!registry?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        registry.registerTool(
          {
            name: 'list_portal_items',
            title: 'List portal files',
            description:
              'Refresh and list files currently in this paired portal.',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: true },
            execute: async (input: unknown) => {
              if (
                !input ||
                typeof input !== 'object' ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error('Expected an empty object.');
              return { items: await refresh() };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, [connected, refresh]);
  async function remove() {
    if (!removing) return;
    setDeleteBusy(true);
    try {
      await api('items/' + removing.id, { method: 'DELETE' });
      setRemoving(null);
      await refresh();
      setNotice({
        text: 'Removed the portal copy. Your original file is unchanged.',
      });
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
    } finally {
      setDeleteBusy(false);
    }
  }
  async function resetTally() {
    setResetBusy(true);
    try {
      const data = await api<{ tally: TransferTally }>('tally/reset', {
        method: 'POST',
      });
      observeTally(data.tally);
      setNotice({ text: 'Tally reset. Your files are still here.' });
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
    } finally {
      setResetBusy(false);
    }
  }
  const previewable = (mime: string) =>
    /^image\/(jpeg|png|gif|webp|avif|bmp)$/.test(mime);
  const used = items.reduce((total, item) => total + item.size, 0);
  return (
    <main className="portal-shell">
      <header>
        <div>
          <h1>
            ThePortal<span>.</span>
          </h1>
          <p className="tagline">
            Put it here. Get it there.
          </p>
        </div>
        <div className="header-actions">
          <span
            className={'connection ' + (connected && online ? 'online' : '')}
          >
            {!ready
              ? 'Connecting…'
              : !connected
                ? 'Pair your device'
                : online
                  ? 'Connected'
                  : 'PC unreachable · retrying'}
          </span>
          {connected && info?.local && info.pair && (
            <Button
              variant="secondary"
              className="control pair-toggle"
              onClick={() => setShowPair(!showPair)}
              aria-expanded={showPair}
              aria-controls="pair-panel"
            >
              <Smartphone />
              {showPair ? 'Close pairing' : 'Connect phone'}
            </Button>
          )}
        </div>
      </header>
      {!connected ? (
        <section className="pair-form">
          <h2>{!ready ? 'Opening the portal…' : 'Connect to your PC'}</h2>
          {ready && (
            <>
              <p className="muted">
                Enter the six-digit code shown in the portal on your PC, or scan
                its QR code.
              </p>
              <form onSubmit={pair}>
                <label htmlFor="pair-code" className="sr-only">
                  Six-digit pairing code
                </label>
                <input
                  id="pair-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
                <Button
                  type="submit"
                  className="control"
                  disabled={pairBusy || code.length !== 6}
                >
                  {pairBusy ? 'Connecting…' : 'Connect'}
                </Button>
              </form>
            </>
          )}
          {notice && (
            <p role="alert" className="notice error">
              {notice.text}
            </p>
          )}
        </section>
      ) : (
        <>
          <section className="portal-area" aria-label="Transfer files">
            <div className={'hole-stage ' + (glowing ? 'arrived' : '')}>
              {glowing && (
                <span
                  key={arrival?.id}
                  className="arrival-corona"
                  aria-hidden="true"
                />
              )}
              <button
                className={'black-hole ' + (dragging ? 'dragging' : '')}
                disabled={!!progress}
                aria-label="Drop files here or choose files to send"
                onClick={() => files.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void upload(Array.from(e.dataTransfer.files));
                }}
              >
                <span className="hole-label">
                  {glowing
                    ? 'It arrived.'
                    : progress
                      ? 'Sending…'
                      : dragging
                        ? 'Let it go.'
                        : 'Put it here.'}
                  <small>
                    {glowing
                      ? 'Ready on the other side.'
                      : progress
                        ? 'Keep this page open.'
                        : 'Get it there.'}
                  </small>
                </span>
              </button>
            </div>
            <div className={'transfer-tally ' + (glowing ? 'arrived' : '')}>
              <div className="tally-reading">
                <strong
                  aria-label={
                    String(tally?.count ?? 0) + ' transfers since reset'
                  }
                >
                  {String(tally?.count ?? 0).padStart(2, '0')}
                </strong>
                <span>
                  Transfers
                  <br />
                  <small>since reset · shared</small>
                </span>
              </div>
              <Button
                variant="ghost"
                className="tally-reset"
                onClick={() => void resetTally()}
                disabled={resetBusy || !tally?.count}
                aria-label="Reset transfer tally without deleting files"
              >
                {resetBusy ? 'Resetting…' : 'Reset'}
              </Button>
            </div>
            <div
              className={'arrival-status ' + (glowing ? 'arrived' : '')}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {arrival ? (
                <span key={arrival.id}>
                  {arrival.count === 1
                    ? '1 item arrived.'
                    : arrival.count + ' items arrived.'}{' '}
                  Ready in the inbox.
                </span>
              ) : (
                <span>Ready when you are.</span>
              )}
            </div>
            <input
              ref={files}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                void upload(Array.from(e.target.files || []));
                e.target.value = '';
              }}
            />
            <input
              ref={camera}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                void upload(Array.from(e.target.files || []));
                e.target.value = '';
              }}
            />
            <div className="action-row">
              <Button
                className="control"
                onClick={() => files.current?.click()}
                disabled={!!progress}
              >
                <FileUp />
                Photos / files
              </Button>
              <Button
                className="control"
                variant="secondary"
                onClick={() => camera.current?.click()}
                disabled={!!progress}
              >
                <Camera />
                Take a photo
              </Button>
            </div>
            {progress ? (
              <div className="upload-progress" role="status">
                <span>
                  {progress.index} / {progress.count} · {progress.name}
                </span>
                <progress
                  value={progress.percent}
                  max={100}
                  aria-label="Upload progress"
                />
                <span>
                  {progress.percent === 100
                    ? 'Finishing on the PC…'
                    : progress.percent + '%'}
                </span>
                <Button
                  className="control"
                  variant="ghost"
                  onClick={() => xhrRef.current?.abort()}
                >
                  Cancel transfer
                </Button>
              </div>
            ) : (
              <p className="muted transfer-hint">
                Drag, choose, or paste · up to 100 MB per file
              </p>
            )}
          </section>
          {notice && (
            <div
              role={notice.error ? 'alert' : 'status'}
              className={'notice ' + (notice.error ? 'error' : '')}
            >
              {notice.text}
            </div>
          )}
          <section className="inbox">
            <div className="bar-row">
              <h2>
                In the portal <span className="muted">({items.length})</span>
              </h2>
              <Button
                variant="ghost"
                className="control"
                onClick={() =>
                  void refresh().catch(() =>
                    setNotice({
                      text: 'The PC is unreachable. Check its connection.',
                      error: true,
                    }),
                  )
                }
              >
                <RefreshCw />
                Refresh
              </Button>
            </div>
            {!items.length ? (
              <div className="empty-state">
                Nothing in here yet.
                <br />
                <span className="muted">
                  Drop something in from either device.
                </span>
              </div>
            ) : (
              <div className="items">
                {items.map((item) => (
                  <article className="item" key={item.id}>
                    <a
                      className="preview"
                      href={'/api/items/' + item.id + '/file'}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={'Open ' + item.name}
                    >
                      {previewable(item.mime) ? (
                        <img
                          src={'/api/items/' + item.id + '/file'}
                          alt={item.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.setAttribute(
                              'data-preview-unavailable',
                              'true',
                            );
                          }}
                        />
                      ) : (
                        <FileIcon size={38} />
                      )}
                    </a>
                    <div className="item-body">
                      <h3 className="filename">{item.name}</h3>
                      <p className="item-meta">
                        {bytes(item.size)} · {item.source} ·{' '}
                        {new Date(item.created).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <div className="item-actions">
                        <a
                          href={'/api/items/' + item.id + '/file'}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ArrowUpRight size={16} />
                          Open
                        </a>
                        <a
                          href={'/api/items/' + item.id + '/file?download=1'}
                          download={item.name}
                        >
                          <Download size={16} />
                          Download
                        </a>
                        <Button
                          variant="ghost"
                          className="control"
                          aria-label={'Remove ' + item.name + ' from portal'}
                          onClick={() => setRemoving(item)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {!info?.local && (
              <p className="save-note">
                On iPhone: Downloads go to Files. For a photo, use Open, then
                Safari's Share → Save Image when available.
              </p>
            )}
          </section>

          {info?.local && info.pair && (
            <Dialog open={showPair} onOpenChange={setShowPair}>
              <DialogContent className="pair-dialog" id="pair-panel">
                <DialogHeader>
                  <DialogTitle>Connect your phone</DialogTitle>
                  <DialogDescription>
                    Use the same home Wi-Fi, then scan with your iPhone camera.
                  </DialogDescription>
                </DialogHeader>
                <div className="pair-content">
                  <img
                    className="qr"
                    src={info.pair.qr}
                    width={176}
                    height={176}
                    alt="Pairing QR code"
                  />
                  <div>
                    <p className="muted">
                      Or open this address and enter the code:
                    </p>
                    <p className="pair-url">{info.address}</p>
                    <p className="pair-code">{info.pair.code}</p>
                    <p className="muted">
                      The code refreshes every 10 minutes.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <footer>
            {bytes(used)} of 1 GB · Copies stay on this PC until you remove
            them.
            <br />
            Keep the PC awake. This proof uses HTTP on your home network.
          </footer>
        </>
      )}
      <AlertDialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !deleteBusy) setRemoving(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this portal copy?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.name} will disappear from both portals. Files you
              already saved elsewhere stay untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              {deleteBusy ? 'Removing…' : 'Remove copy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
