'use client';

import type { SyntheticEvent } from 'react';
import Image from 'next/image';
import { useIconPack } from '@/components/IconPackContext';
import {
  Award,
  ChartColumn,
  FileText,
  Folder,
  Globe,
  Link as LinkGlyph,
  Mail,
  Music,
  StickyNote,
  User,
  type LucideIcon,
} from 'lucide-react';
import { catalogIconUrl, packIconUrl } from '@/lib/iconCatalog';
import type { BuiltinIconName, IconSpec } from '@/lib/types';

const GLYPHS: Record<BuiltinIconName, LucideIcon> = {
  folder: Folder,
  file: FileText,
  note: StickyNote,
  person: User,
  chart: ChartColumn,
  badge: Award,
  link: LinkGlyph,
  music: Music,
  mail: Mail,
  globe: Globe,
};

const TILE_BACKGROUNDS: Record<BuiltinIconName, string> = {
  folder: 'linear-gradient(180deg,#8fd3ff,#2f95f5)',
  file: 'linear-gradient(180deg,#ffffff,#e4e1da)',
  note: 'linear-gradient(180deg,#ffe98a,#f7c948)',
  person: 'linear-gradient(180deg,#a8b8ff,#5e5ce6)',
  chart: 'linear-gradient(180deg,#7ee2a8,#28a745)',
  badge: 'linear-gradient(180deg,#ffc36b,#ff8a00)',
  link: 'linear-gradient(180deg,#9fd1ff,#0a84ff)',
  music: 'linear-gradient(180deg,#ff8aa0,#fa2d48)',
  mail: 'linear-gradient(180deg,#6fc3ff,#1a73e8)',
  globe: 'linear-gradient(180deg,#8ee0ff,#1c9bd6)',
};

// Light tiles get a dark glyph; everything else is white.
const DARK_GLYPH: Partial<Record<BuiltinIconName, string>> = { file: '#6b675f', note: '#6b4e00' };

export interface AppIconProps {
  icon: IconSpec;
  /** Width in px. */
  size: number;
  /** 'desktop' = Finder-style folder/file shapes; 'tile' = rounded app tile (dock + phone). */
  variant: 'desktop' | 'tile';
  /** Colour of the "PDF" badge on desktop file icons. */
  accent?: string;
}

/** If a pack-rewritten icon fails to load (a pack this deploy doesn't serve, or one without the slug), revert once to the original URL. */
function revertOnError(original: string) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    if (e.currentTarget.src.endsWith(original)) return;
    e.currentTarget.srcset = ''; // next/image sets srcset, which would otherwise win over src
    e.currentTarget.src = original;
  };
}

export function AppIcon({ icon, size, variant, accent = '#6f9bd1' }: AppIconProps) {
  const pack = useIconPack();
  if (icon.kind === 'image') {
    return (
      <Image
        src={packIconUrl(icon.url, pack)}
        onError={packIconUrl(icon.url, pack) === icon.url ? undefined : revertOnError(icon.url)}
        alt=""
        aria-hidden
        draggable={false}
        width={size}
        height={size}
        className="block object-cover"
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.225) }}
      />
    );
  }

  if (icon.kind === 'catalog') {
    return (
      <img
        src={catalogIconUrl(icon.slug, pack)}
        onError={pack ? revertOnError(catalogIconUrl(icon.slug)) : undefined}
        alt=""
        aria-hidden
        draggable={false}
        width={size}
        height={size}
        className="block object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  const name: BuiltinIconName = icon.name in GLYPHS ? icon.name : 'globe';
  if (variant === 'desktop' && name === 'folder') return <FolderShape size={size} />;
  if (variant === 'desktop' && name === 'file') return <FileShape size={size} accent={accent} />;

  const tile = variant === 'desktop' ? Math.round(size * 0.78) : size;
  const Glyph = GLYPHS[name];
  return (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center"
      style={{
        width: tile,
        height: tile,
        borderRadius: Math.round(tile * 0.225),
        background: TILE_BACKGROUNDS[name],
        boxShadow: '0 4px 10px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.35)',
      }}
    >
      <Glyph size={Math.round(tile * 0.5)} strokeWidth={1.8} color={DARK_GLYPH[name] ?? '#ffffff'} />
    </span>
  );
}

function FolderShape({ size }: { size: number }) {
  return (
    <span aria-hidden className="relative block flex-none" style={{ width: size, height: Math.round(size * 0.8) }}>
      <span
        className="absolute"
        style={{ left: '6%', top: '4%', width: '40%', height: '18%', background: '#4fb0ff', borderRadius: '4px 4px 0 0' }}
      />
      <span
        className="absolute"
        style={{
          left: '6%',
          right: '6%',
          top: '16%',
          bottom: '2%',
          borderRadius: '3px 6px 6px 6px',
          background: 'linear-gradient(180deg,#8fd3ff 0%,#4fb0ff 55%,#2f95f5 100%)',
          boxShadow: '0 6px 14px rgba(30,110,220,.28), inset 0 1px 0 rgba(255,255,255,.6)',
        }}
      />
    </span>
  );
}

function FileShape({ size, accent }: { size: number; accent: string }) {
  const width = Math.round(size * 0.64);
  const height = Math.round(size * 0.8);
  return (
    <span
      aria-hidden
      className="relative flex flex-none items-end justify-center"
      style={{
        width,
        height,
        paddingBottom: Math.round(height * 0.14),
        background: '#fbfaf7',
        borderRadius: 3,
        boxShadow: '0 6px 14px rgba(0,0,0,.14)',
      }}
    >
      <span
        className="absolute right-0 top-0"
        style={{ width: 14, height: 14, background: 'linear-gradient(225deg, transparent 50%, #dcd8cf 50%)' }}
      />
      <span className="rounded-sm px-[5px] py-0.5 font-mono text-[9px] font-semibold text-white" style={{ background: accent }}>
        PDF
      </span>
    </span>
  );
}
