import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { deployButtonUrl } from '@/lib/deployButton';

export const metadata: Metadata = {
  title: 'Make your own portfolio desktop',
  description: 'Deploy your own copy of this portfolio desktop on free plans, then edit it right on the page.',
};

const button = 'inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-medium transition-colors';

/** Only on a site that sets TEMPLATE_REPO_URL (the template's home); copies made from the template show a 404. */
export default function MakeYourOwnPage() {
  const repo = process.env.TEMPLATE_REPO_URL;
  if (!repo) notFound();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#ebe7df] p-6 text-[#1d1c1a]">
      <div className="w-full max-w-lg rounded-2xl bg-[#fbfaf7] p-8 shadow-[0_20px_50px_rgba(0,0,0,.12)]">
        <h1 className="m-0 font-serif text-4xl font-normal">Make your own portfolio desktop</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[#3d3a35]">
          A portfolio that looks like a Mac desktop on computers and an iPhone home screen on phones. You edit everything right on the page &mdash; drag
          icons, type in place, add projects, photos and PDFs &mdash; and publish when you&rsquo;re ready. Your copy is your own site, with its own storage.
        </p>
        <ol className="mt-5 flex list-decimal flex-col gap-2 pl-5 text-[15px] leading-relaxed">
          <li>
            Click <strong>Deploy with Vercel</strong> and sign in to Vercel with GitHub.
          </li>
          <li>When asked, make up a setup code of at least 12 characters, and keep it somewhere safe.</li>
          <li>
            Open your new site and click <strong>Claim your site</strong>, then enter your setup code and choose a password.
          </li>
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href={deployButtonUrl(repo)} className={`${button} bg-black text-white hover:bg-[#333]`}>
            <svg aria-hidden viewBox="0 0 24 22" className="h-3.5 w-3.5 fill-current">
              <path d="M12 0l12 22H0z" />
            </svg>
            Deploy with Vercel
          </a>
          <a href={`${repo}#readme`} className={`${button} text-[#6b675f] hover:bg-black/5`}>
            Read the guide
          </a>
        </div>
        <p className="mt-6 mb-0 text-sm text-[#6b675f]">It runs on free plans: Vercel Hobby, Neon Free and Vercel Blob.</p>
      </div>
    </main>
  );
}
