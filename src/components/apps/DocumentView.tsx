import type { DocumentApp } from '@/lib/types';

export function DocumentView({ app }: { app: DocumentApp }) {
  const { fileUrl, fileName, showDownload } = app.content;
  if (!fileUrl) {
    return <p className="m-0 p-5 text-sm text-[#6b675f]">No document uploaded yet.</p>;
  }
  return (
    <div className="flex flex-col gap-4 p-5">
      <iframe src={fileUrl} title={fileName} className="h-[65vh] w-full rounded-md border border-black/10 bg-[#efece6]" />
      <div className="flex flex-wrap gap-2">
        {showDownload && (
          <a
            href={fileUrl}
            download={fileName}
            className="rounded-full bg-[#1d1c1a] px-4 py-2.5 text-[13px] font-medium text-[#fbfaf7] hover:opacity-90"
          >
            Download {fileName} ↓
          </a>
        )}
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-black/5 px-4 py-2.5 text-[13px] font-medium text-[#1d1c1a] hover:bg-black/10"
        >
          Open in a new tab ↗
        </a>
      </div>
    </div>
  );
}
