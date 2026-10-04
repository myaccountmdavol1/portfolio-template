'use client';

import { Award, BadgeCheck, FileText, RotateCw, Upload } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { useAppLink, useFocusRequest, useReportItem } from '@/components/AppLinkContext';
import { useEditor } from '@/components/editor/EditorContext';
import { ShareButton } from '@/components/ShareButton';
import { isExpired, isNew, monthYear, passBackground, passesByYear, passFromFile, passGroup, passGroups, passSummary, sortPasses } from '@/lib/badges';
import { paymentBrand } from '@/lib/brands';
import { updateAppContent } from '@/lib/editor/mutations';
import { passColorFromImage } from '@/lib/tone';
import type { BadgePass, WalletApp } from '@/lib/types';
import { BrandMark } from './BrandMark';

const STRIP = 64; // how much of each stacked pass peeks out
const PASS_H = 250; // a pass's height (its back can grow taller when flipped)

/** A QR code for the verify link, so someone looking at a laptop can scan it with their phone. */
function PassQR({ url }: { url: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let cancelled = false;
    void import('qrcode').then((qr) =>
      qr.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then((s) => {
        if (!cancelled) setSvg(s);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [url]);
  if (!svg) return <span className="h-16 w-16 flex-none rounded-md bg-white/80" />;
  // The SVG comes from the qrcode library, built from the owner's own link.
  return <span aria-hidden className="block h-16 w-16 flex-none rounded-md bg-white p-1 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** Badge art that falls back to an award icon if the image can't load (a moved or expired link). */
function BadgeArt({ src, className, iconSize }: { src: string; className: string; iconSize: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return <Award size={iconSize} aria-hidden className="opacity-80" data-testid="badge-art-fallback" />;
  // eslint-disable-next-line @next/next/no-img-element -- badge art from Credly, Accredible, Parchment, or the owner's uploads
  return <img src={src} alt="" className={className} onError={() => setFailed(src)} />;
}

function IssuerMark({ pass }: { pass: BadgePass }) {
  if (pass.issuerLogoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- issuer logos from any host
    return <img src={pass.issuerLogoUrl} alt="" className="h-8 w-8 flex-none rounded-full bg-white object-contain p-0.5" />;
  }
  const initials = pass.issuer
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/25 text-[11px] font-bold">{initials || '★'}</span>;
}

/** One Wallet pass. The front shows the badge; tap it and it flips to the details and the verify QR. */
function PassCard({ pass, flipped, onFlip, onEdit, sharePath }: { pass: BadgePass; flipped: boolean; onFlip: () => void; onEdit?: (patch: Partial<BadgePass>) => void; sharePath?: string | null }) {
  const expired = isExpired(pass);
  // Edit mode: the title and issuer are typed right on the card (a <button> can't hold inputs, so it's a <div>).
  const Front = onEdit ? 'div' : 'button';
  const editInput = 'w-full min-w-0 rounded bg-white/15 px-1 outline-none placeholder:text-white/60 focus:bg-white/25';
  // Flipped, the card grows to fit everything on its back (no scrolling inside a pass), then shrinks back.
  const backRef = useRef<HTMLDivElement>(null);
  const [backHeight, setBackHeight] = useState(PASS_H);
  useLayoutEffect(() => {
    const el = backRef.current;
    if (!el) return;
    const measure = () => setBackHeight(Math.max(PASS_H, Math.ceil(el.scrollHeight)));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pass]);
  return (
    <div className="keep-colors w-full [perspective:1400px]" data-testid="pass">
      <div
        className="relative w-full transition-[transform,height] duration-700 [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{ transform: flipped ? 'rotateY(180deg)' : undefined, height: flipped ? backHeight : PASS_H }}
      >
        {/* Front */}
        <Front
          {...(onEdit ? {} : { type: 'button' as const, onClick: onFlip, 'aria-label': `${pass.title}, ${pass.issuer}. Show details`, tabIndex: flipped ? -1 : 0 })}
          aria-hidden={flipped}
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-2xl p-4 text-left text-white shadow-[0_-4px_16px_rgba(0,0,0,.12),0_12px_28px_rgba(0,0,0,.25)] [backface-visibility:hidden] ${onEdit ? '' : 'cursor-pointer'}`}
          style={{ background: passBackground(pass) }}
        >
          {/* A shine sweeps across when the pass comes to the front. */}
          <span aria-hidden key={pass.id} className="pass-shine pointer-events-none absolute inset-0" />
          {isNew(pass) && (
            <span className="absolute -right-8 top-3 rotate-45 bg-[#ffd60a] px-8 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black shadow">New</span>
          )}
          <span className="flex items-center gap-2.5" style={{ minHeight: STRIP - 32 }}>
            <IssuerMark pass={pass} />
            {onEdit ? (
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <input aria-label="Issued by" value={pass.issuer} placeholder="Issued by…" onChange={(e) => onEdit({ issuer: e.target.value })} className={`${editInput} text-[11px] font-semibold uppercase tracking-wider`} />
                <input aria-label="Badge title" value={pass.title} placeholder="Badge title" onChange={(e) => onEdit({ title: e.target.value })} className={`${editInput} text-[15px] font-bold`} />
              </span>
            ) : (
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[11px] font-semibold uppercase tracking-wider opacity-85">{pass.issuer}</span>
                <span className="line-clamp-2 text-[15px] font-bold leading-tight" title={pass.title}>
                  {pass.title}
                </span>
              </span>
            )}
            {pass.level && <span className="flex-none rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{pass.level}</span>}
            {onEdit && (
              <button type="button" aria-label="Flip pass" onClick={onFlip} className="flex-none cursor-pointer rounded-full bg-white/20 p-1.5 hover:bg-white/30">
                <RotateCw size={13} aria-hidden />
              </button>
            )}
          </span>
          <span className="flex flex-1 items-center justify-center py-2">
            {pass.imageUrl ? (
              <BadgeArt src={pass.imageUrl} iconSize={64} className="h-[118px] w-[118px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,.35)]" />
            ) : pass.certificateUrl ? (
              <FileText size={64} aria-hidden className="opacity-80" />
            ) : (
              <Award size={64} aria-hidden className="opacity-80" />
            )}
          </span>
          <span className="flex items-end justify-between gap-2 text-[11px]">
            <span className="flex gap-4">
              {pass.earned && (
                <span className="flex flex-col">
                  <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">Earned</span>
                  <span className="font-semibold">{monthYear(pass.earned)}</span>
                </span>
              )}
              {pass.expires && (
                <span className="flex flex-col">
                  <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">{expired ? 'Expired' : 'Expires'}</span>
                  <span className={`font-semibold ${expired ? 'line-through opacity-75' : ''}`}>{monthYear(pass.expires)}</span>
                </span>
              )}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 font-semibold">
              {pass.verifyUrl ? <BadgeCheck size={12} aria-hidden /> : <RotateCw size={12} aria-hidden />} {pass.verifyUrl ? 'Verified' : 'Details'}
            </span>
          </span>
        </Front>

        {/* Back */}
        <div
          ref={backRef}
          aria-hidden={!flipped}
          className="absolute inset-x-0 top-0 flex min-h-full flex-col gap-2 rounded-2xl p-4 text-white shadow-[0_12px_28px_rgba(0,0,0,.25)] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ background: passBackground(pass) }}
        >
          <span className="flex items-start justify-between gap-2">
            <span className="text-[15px] font-bold leading-tight">{pass.title}</span>
            <button type="button" aria-label="Flip back" tabIndex={flipped ? 0 : -1} onClick={onFlip} className="flex-none cursor-pointer rounded-full bg-white/20 p-1.5 hover:bg-white/30">
              <RotateCw size={13} aria-hidden />
            </button>
          </span>
          {/* Shown in full: the card grows to fit, nothing inside a pass scrolls. */}
          <div data-testid="pass-details" className="flex flex-1 flex-col gap-2">
            {pass.description && <p className="m-0 whitespace-pre-line text-xs leading-snug opacity-90">{pass.description}</p>}
            {pass.skills && pass.skills.length > 0 && (
              <ul aria-label="Skills" className="m-0 flex list-none flex-wrap gap-1 p-0">
                {pass.skills.map((s) => (
                  <li key={s} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="mt-auto flex flex-none items-end gap-3 pt-1">
            {pass.verifyUrl && flipped && <PassQR url={pass.verifyUrl} />}
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              {pass.verifyUrl && (
                <a href={pass.verifyUrl} target="_blank" rel="noopener noreferrer" tabIndex={flipped ? 0 : -1} className="self-start rounded-full bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-white/90">
                  Verify ↗
                </a>
              )}
              {pass.certificateUrl && (
                <a href={pass.certificateUrl} target="_blank" rel="noopener noreferrer" tabIndex={flipped ? 0 : -1} className="self-start rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30">
                  View certificate ↗
                </a>
              )}
              {pass.credentialId && <span className="truncate text-[9px] opacity-70">ID {pass.credentialId}</span>}
              {sharePath && flipped && <ShareButton path={sharePath} title={pass.title} look="pill" />}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * One credential opened from the Shelf or Timeline. In a desktop window it covers the whole window below the
 * title bar (portaled out of the scrolling content, so it never scrolls away); the window behind can't scroll.
 */
function OpenedPass({ pass, flipped, onFlip, onClose, sharePath }: { pass: BadgePass; flipped: boolean; onFlip: () => void; onClose: () => void; sharePath?: string | null }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [host, setHost] = useState<{ el: HTMLElement; top: number } | null>(null);
  useLayoutEffect(() => {
    const scroller = anchor.current?.closest<HTMLElement>('.app-content');
    if (!scroller) return;
    const before = scroller.style.overflow;
    scroller.style.overflow = 'hidden';
    if (scroller.parentElement) setHost({ el: scroller.parentElement, top: scroller.offsetTop });
    return () => {
      scroller.style.overflow = before;
    };
  }, []);
  const style: CSSProperties | undefined = host ? { position: 'absolute', top: host.top } : undefined;
  const dialog = (
    <div
      role="dialog"
      aria-label={pass.title}
      style={style}
      className="fixed inset-0 z-[9700] flex overflow-y-auto overscroll-contain bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      {/* m-auto centers it, and a flipped pass taller than the window still starts at the top. */}
      <div className="m-auto flex w-full max-w-[400px] flex-col gap-3" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <PassCard pass={pass} flipped={flipped} onFlip={onFlip} sharePath={sharePath} />
        <button type="button" onClick={onClose} autoFocus className="cursor-pointer self-center rounded-full bg-white px-4 py-1.5 text-sm font-semibold shadow">
          Done
        </button>
      </div>
    </div>
  );
  return (
    <>
      <span ref={anchor} hidden />
      {host ? createPortal(dialog, host.el) : dialog}
    </>
  );
}

/** The Wallet as a widget: the three newest badges fanned out, with the count. */
export function BadgeShowcase({ app }: { app: WalletApp }) {
  const passes = sortPasses((app.content.passes ?? []).filter((p) => p.title.trim()));
  const top = passes.slice(0, 3);
  const fan = [-14, 0, 14];
  return (
    <div className="keep-colors flex h-full w-full flex-col justify-between bg-gradient-to-br from-[#1c1c2e] to-[#2c2c44] p-3.5 text-white">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold">{app.title}</span>
        <span className="text-[11px] opacity-70">{passes.length}</span>
      </span>
      <span className="relative flex flex-1 items-center justify-center">
        {top.length === 0 && <Award size={40} aria-hidden className="opacity-60" />}
        {top
          .slice()
          .reverse()
          .map((p, i, list) => {
            const slot = list.length === 1 ? 1 : list.length === 2 ? [0, 2][i] : i;
            return (
              <span
                key={p.id}
                className="absolute flex h-16 w-16 items-center justify-center rounded-2xl shadow-[0_6px_16px_rgba(0,0,0,.35)]"
                style={{ background: passBackground(p), transform: `translateX(${fan[slot] * 2.4}px) rotate(${fan[slot]}deg)`, zIndex: slot === 1 ? 3 : 1 }}
              >
                {p.imageUrl ? (
                  <BadgeArt src={p.imageUrl} iconSize={26} className="h-12 w-12 object-contain" />
                ) : (
                  <Award size={26} aria-hidden />
                )}
              </span>
            );
          })}
      </span>
      {passes[0] && <span className="truncate text-center text-[11px] font-medium opacity-80">Newest: {passes[0].title}</span>}
    </div>
  );
}

/** Wallet: badges and microcredentials as Apple Wallet passes (or a trophy shelf), plus optional support cards. */
export function WalletView({ app }: { app: WalletApp }) {
  const c = app.content;
  const editor = useEditor();
  // In Edit mode, untitled passes show too (so a just-dropped file can be named right on the card).
  const all = useMemo(() => sortPasses((c.passes ?? []).filter((p) => editor || p.title.trim())), [c.passes, editor]);
  const groups = useMemo(() => passGroups(all), [all]);
  const [view, setView] = useState<'stack' | 'shelf' | 'timeline'>(c.view ?? 'stack');
  const [dragging, setDragging] = useState(false);
  const [dropping, setDropping] = useState(0);

  /** Edit mode: change one pass in the draft (keystrokes on the same pass become one undo step). */
  const editPass = editor
    ? (id: string, patch: Partial<BadgePass>) =>
        editor.apply((d) => {
          const a = d.apps.find((x) => x.id === app.id);
          if (a?.type !== 'wallet') return d;
          return updateAppContent(d, app.id, { ...a.content, passes: (a.content.passes ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)) });
        }, `pass:${id}`)
    : undefined;

  /** Edit mode: badge images and certificate PDFs dropped on the window become passes. */
  async function dropFiles(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!editor) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf');
    if (files.length === 0) return;
    setDropping(files.length);
    const made: BadgePass[] = [];
    for (const file of files) {
      try {
        const pdf = file.type === 'application/pdf';
        const [url, color] = await Promise.all([editor.upload(file, pdf ? 'docs' : 'images'), pdf ? undefined : passColorFromImage(file)]);
        made.push(passFromFile(file.name, url, pdf ? 'pdf' : 'image', color));
      } catch (err) {
        console.error('Could not add a dropped badge', err);
      }
    }
    setDropping(0);
    if (made.length === 0) return;
    editor.apply((d) => {
      const a = d.apps.find((x) => x.id === app.id);
      return a?.type === 'wallet' ? updateAppContent(d, app.id, { ...a.content, passes: [...made, ...(a.content.passes ?? [])] }) : d;
    });
    setSelected(made[0].id);
  }
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<string | null>(null);
  const [opened, setOpened] = useState<BadgePass | null>(null);
  const passes = filter ? all.filter((p) => passGroup(p) === filter) : all;
  const cards = c.cards.filter((card) => card.url);
  const current = passes.find((p) => p.id === selected) ?? passes[0];
  const flip = (id: string) => setFlipped((f) => (f === id ? null : id));

  // A link to one badge opens it, flipped to its details. The open (or flipped) badge goes into the address bar.
  const link = useAppLink();
  useFocusRequest((req) => {
    const pass = all.find((p) => p.id === req.itemKey);
    if (!pass) return;
    setFilter(null);
    setOpened(pass);
    setFlipped(pass.id);
  });
  useReportItem(opened?.id ?? flipped);
  const sharePathFor = (id: string) => link?.pathFor(id) ?? null;
  const closeOpened = () => {
    setOpened(null);
    setFlipped(null);
  };

  return (
    <div
      className="relative flex min-h-[420px] flex-col gap-4 bg-[#f2f2f7] p-5 text-[#1d1d1f]"
      onDragOver={
        editor
          ? (e) => {
              e.preventDefault();
              setDragging(true);
            }
          : undefined
      }
      onDragLeave={editor ? (e) => e.currentTarget === e.target && setDragging(false) : undefined}
      onDrop={editor ? (e) => void dropFiles(e) : undefined}
    >
      {editor && (dragging || dropping > 0) && (
        <div data-testid="badge-drop" className="pointer-events-none absolute inset-2 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#0a84ff] bg-[#0a84ff]/10 text-sm font-semibold text-[#0a84ff]">
          <Upload size={28} aria-hidden />
          {dropping > 0 ? `Adding ${dropping} badge${dropping === 1 ? '' : 's'}…` : 'Drop badge images or certificate PDFs'}
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="m-0 text-2xl font-bold">{c.heading}</h2>
          {c.message && <p className="m-0 mt-1 text-sm text-[#6e6e73]">{c.message}</p>}
          {all.length > 0 && <p className="m-0 mt-1 text-xs font-semibold text-[#6e6e73]">{passSummary(all)}</p>}
        </div>
        {all.length > 0 && (
          <div role="radiogroup" aria-label="View" className="flex overflow-hidden rounded-full bg-black/[.06] p-0.5 text-xs font-semibold">
            {(
              [
                ['stack', 'Wallet'],
                ['shelf', 'Shelf'],
                ['timeline', 'Timeline'],
              ] as const
            ).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className="cursor-pointer rounded-full px-3 py-1 aria-checked:bg-white aria-checked:shadow-sm">
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {groups.length > 1 && (
        <div role="radiogroup" aria-label="Filter" className="flex flex-wrap gap-1.5">
          {[{ name: null, count: all.length } as { name: string | null; count: number }, ...groups].map((g) => (
            <button
              key={g.name ?? 'all'}
              type="button"
              role="radio"
              aria-checked={filter === g.name}
              onClick={() => {
                setFilter(g.name);
                setSelected(null);
                setFlipped(null);
              }}
              className="cursor-pointer rounded-full bg-white px-3 py-1 text-xs font-medium shadow-sm aria-checked:bg-[#1d1d1f] aria-checked:text-white"
            >
              {g.name ?? 'All'} <span className="opacity-60">{g.count}</span>
            </button>
          ))}
        </div>
      )}

      {all.length === 0 && cards.length === 0 && <p className="m-0 text-sm text-[#6e6e73]">No badges yet.</p>}
      {editor && <p className="m-0 -mt-2 text-[11px] text-[#6e6e73]">Tip: drop badge images or certificate PDFs here to add them, then type the details right on the card.</p>}

      {view === 'stack' && current && (
        <div className="mx-auto flex w-full max-w-[400px] flex-col">
          <PassCard pass={current} flipped={flipped === current.id} onFlip={() => flip(current.id)} onEdit={editPass && ((patch) => editPass(current.id, patch))} sharePath={sharePathFor(current.id)} />
          {/* The rest peek out underneath, like Apple Wallet; tap one to bring it to the front. */}
          <ul aria-label="More badges" className="m-0 mt-3 flex list-none flex-col p-0">
            {passes
              .filter((p) => p.id !== current.id)
              .map((p, i) => (
                <li key={p.id} className="relative transition-transform hover:-translate-y-2" style={{ marginTop: i === 0 ? 0 : -(250 - STRIP), zIndex: i }}>
                  <button
                    type="button"
                    aria-label={`Show ${p.title}`}
                    onClick={() => {
                      setSelected(p.id);
                      setFlipped(null);
                    }}
                    className="keep-colors flex h-[250px] w-full cursor-pointer items-start gap-2.5 rounded-2xl px-4 pb-4 pt-3 text-left text-white shadow-[0_-4px_16px_rgba(0,0,0,.12)]"
                    style={{ background: passBackground(p) }}
                  >
                    <IssuerMark pass={p} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[10px] font-semibold uppercase tracking-wider opacity-85">{p.issuer}</span>
                      {/* Two lines fit in the peeking strip, so long course names aren't cut short. */}
                      <span className="line-clamp-2 text-[13px] font-bold leading-[1.2]" title={p.title}>
                        {p.title}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}

      {view === 'shelf' && passes.length > 0 && (
        <ul aria-label="Badge shelf" className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 p-0">
          {passes.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setOpened(p);
                  setFlipped(null);
                }}
                className={`group relative flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md ${isExpired(p) ? 'opacity-60' : ''}`}
              >
                {isNew(p) && <span className="absolute right-2 top-2 rounded-full bg-[#ffd60a] px-1.5 py-0.5 text-[9px] font-bold uppercase text-black">New</span>}
                <span className="keep-colors flex h-20 w-20 items-center justify-center rounded-full" style={p.imageUrl ? undefined : { background: passBackground(p) }}>
                  {p.imageUrl ? (
                    <BadgeArt src={p.imageUrl} iconSize={34} className="h-20 w-20 object-contain transition-transform group-hover:scale-110" />
                  ) : p.certificateUrl ? (
                    <FileText size={34} aria-hidden className="text-white" />
                  ) : (
                    <Award size={34} aria-hidden className="text-white" />
                  )}
                </span>
                <span className="line-clamp-2 text-xs font-semibold leading-tight">{p.title}</span>
                <span className="text-[10px] text-[#6e6e73]">
                  {p.issuer}
                  {p.earned ? ` · ${monthYear(p.earned)}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {view === 'timeline' && passes.length > 0 && (
        <ol aria-label="Badge timeline" className="m-0 flex list-none flex-col gap-5 p-0">
          {passesByYear(passes).map(({ year, passes: list }) => (
            <li key={year} className="relative pl-6">
              {/* The line down the side, with a dot for each year. */}
              <span aria-hidden className="absolute bottom-0 left-[7px] top-6 w-0.5 bg-black/10" />
              <span aria-hidden className="absolute left-0 top-1 h-4 w-4 rounded-full border-4 border-[#f2f2f7] bg-[#0a84ff]" />
              <h3 className="m-0 mb-2 text-lg font-bold">{year}</h3>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {list.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpened(p);
                        setFlipped(null);
                      }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white p-2.5 text-left shadow-sm transition hover:translate-x-1 hover:shadow-md"
                    >
                      <span className="keep-colors flex h-11 w-11 flex-none items-center justify-center rounded-lg" style={{ background: passBackground(p) }}>
                        {p.imageUrl ? (
                          <BadgeArt src={p.imageUrl} iconSize={20} className="h-9 w-9 object-contain" />
                        ) : (
                          <Award size={20} aria-hidden className="text-white" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-semibold">{p.title || 'Untitled badge'}</span>
                        <span className="truncate text-xs text-[#6e6e73]">{[p.issuer, monthYear(p.earned)].filter(Boolean).join(' · ')}</span>
                      </span>
                      {isNew(p) && <span className="flex-none rounded-full bg-[#ffd60a] px-2 py-0.5 text-[10px] font-bold uppercase text-black">New</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}

      {opened && <OpenedPass pass={opened} flipped={flipped === opened.id} onFlip={() => flip(opened.id)} onClose={closeOpened} sharePath={sharePathFor(opened.id)} />}

      {cards.length > 0 && (
        <section aria-label={c.cardsHeading || 'Support my work'} className="mt-2 flex flex-col gap-2">
          <h3 className="m-0 text-sm font-semibold text-[#6e6e73]">{c.cardsHeading || 'Support my work'}</h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {cards.map((card, i) => {
              const brand = paymentBrand(card.url);
              return (
                <li key={card.url + i} style={{ marginTop: i === 0 ? 0 : -44, zIndex: i }} className="relative transition-transform hover:-translate-y-2">
                  <a
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="keep-colors flex h-[88px] w-full items-center justify-between gap-3 rounded-2xl px-4 text-white shadow-[0_-4px_16px_rgba(0,0,0,.12),0_8px_18px_rgba(0,0,0,.18)]"
                    style={{ background: brand.color }}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="text-base font-bold leading-tight">{brand.name}</span>
                      <span className="truncate text-xs font-medium opacity-90">{card.label || `Support me on ${brand.name}`}</span>
                    </span>
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/25">
                      <BrandMark brand={brand} size={20} />
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
