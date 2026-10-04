'use client';

import { FONT_CATEGORIES, FONTS, fontStack, previewFontHref } from '@/lib/fonts';

/** Every font, grouped, each name drawn in its own font. Radio buttons, so it works with the keyboard and screen readers. */
export function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (id: string) => void }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-[#3d3a35]">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-md border border-black/15 bg-white p-1.5">
        {FONT_CATEGORIES.map((category) => (
          <div key={category.id} className="flex flex-col">
            <span className="px-1.5 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[#6b675f]">{category.label}</span>
            {FONTS.filter((font) => font.category === category.id).map((font) => {
              const preview = previewFontHref(font);
              return (
                <button
                  key={font.id}
                  type="button"
                  role="radio"
                  aria-checked={value === font.id}
                  onClick={() => onChange(font.id)}
                  className="cursor-pointer rounded px-1.5 py-1 text-left text-[15px] hover:bg-black/5 aria-checked:bg-[#0a84ff] aria-checked:text-white"
                  style={{ fontFamily: fontStack(font) }}
                >
                  {/* React moves this into <head> once per font; just the letters of its name, loaded the first time the picker opens. */}
                  {preview && <link rel="stylesheet" href={preview} precedence="font-preview" />}
                  {font.name}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
