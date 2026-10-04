import type { RichText } from '@/lib/types';

export function RichTextView({ text }: { text: RichText }) {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-[#3d3a35]">
      {text.blocks.map((block, i) =>
        block.type === 'heading' ? (
          <h3 key={i} className="m-0 mt-2 text-lg font-semibold text-[#1d1c1a]">
            {block.text}
          </h3>
        ) : (
          <p key={i} className="m-0 text-pretty">
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}
