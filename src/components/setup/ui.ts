// The setup wizard's look: the /admin card (cream, serif headline), shared by its steps.

const pill = 'inline-flex h-10 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-medium transition-colors disabled:opacity-50';

export const primaryButton = `${pill} bg-[#1d1c1a] text-white hover:bg-black`;
export const quietButton = `${pill} text-[#6b675f] hover:bg-black/5`;
export const outlineButton = `${pill} border border-black/15 bg-white text-[#1d1c1a] hover:bg-black/5`;
export const setupField = 'h-10 w-full rounded-lg border border-black/15 bg-white px-3 text-sm text-[#1d1c1a] outline-none focus:border-[#0a84ff]';
export const setupLabel = 'flex flex-col gap-1 text-left text-xs font-medium text-[#6b675f]';
