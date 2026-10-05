# Portfolio desktop

A portfolio site that looks like a Mac desktop on computers and an iPhone home screen on phones. You edit everything on the site itself (drag icons, type in place, add projects, photos and PDFs) and publish when you’re happy with it. Your copy is your own site, with its own storage, and it runs on free plans: Vercel Hobby, Neon Free and Vercel Blob.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmyaccountmdavol1%2Fportfolio-template&project-name=my-portfolio&repository-name=my-portfolio&env=SETUP_CODE&envDescription=Make+up+a+setup+code+of+at+least+12+characters+and+keep+it+somewhere+safe.+You%E2%80%99ll+use+it+once+to+claim+your+site%2C+and+again+if+you+ever+forget+your+password.&envLink=https%3A%2F%2Fgithub.com%2Fmyaccountmdavol1%2Fportfolio-template%23your-setup-code&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%2C%7B%22type%22%3A%22blob%22%2C%22access%22%3A%22public%22%7D%5D)

1. Click **Deploy** and sign in to Vercel with GitHub.
2. When Vercel asks for `SETUP_CODE`, make up a setup code of at least 12 characters (see [Your setup code](#your-setup-code)). Vercel then adds a free Neon database and a Blob store for your photos and files. Keep the suggested settings.
3. Open your new site and click **Claim your site**, then enter your setup code and choose a password. A few setup questions follow (your name, a photo, a headline, a wallpaper and a style), then you publish. You can skip them and come back: they return each time you sign in until you finish, and everything stays editable in the editor.

## Your setup code

The setup code is a secret you make up once, while deploying. It proves the site is yours.

- Use at least 12 characters. A shorter code doesn’t count, and your site’s `/admin` page will say so.
- Keep it somewhere safe, such as a password manager. You use it once to claim your site (you choose your password then), and again if you ever forget your password: click “Forgot password?” on `/admin`.
- It isn’t your password. Sign in with the password you chose when you claimed the site. Changing `SETUP_CODE` later doesn’t change your password; to set a new password, click “Forgot password?” on `/admin`.
- To change it: in Vercel, open your project → **Settings** → **Environment Variables** → `SETUP_CODE` → **Edit**. Then go to **Deployments**, open the ⋯ menu on the newest deployment and choose **Redeploy**.

## If something goes wrong

- **The deploy stopped, or you closed the tab.** Nothing is lost. Come back here and click **Deploy** again. If Vercel says the name `my-portfolio` is taken, choose another name.
- **Your site shows the sample content but there’s no “Claim your site” button.** The button also disappears once the site is claimed, which is normal. If you haven’t claimed it yet, the database or the Blob store wasn’t added. In Vercel, open your project → **Storage**, add a **Neon** database and a **Blob** store (public access) and connect both to all environments. Then **Deployments** → ⋯ → **Redeploy**.
- **`/admin` says your setup code is missing or too short.** Set `SETUP_CODE` to at least 12 characters (see [Your setup code](#your-setup-code)), then redeploy.
- **You forgot your password.** Open `/admin`, click “Forgot password?”, and use your setup code to choose a new one.
- **Sign-in says “That’s your setup code, not your password.”** Use the password you chose when you claimed the site, or click “Forgot password?” to choose a new one with the setup code.

## Run it locally

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000. With no Firebase settings it shows the sample site. Set `OWNER_EMAIL` and `NEXT_PUBLIC_OWNER_EMAIL` (the same address) to the Google account that will edit the site.

## Firebase setup

1. Create a Firebase project at https://console.firebase.google.com.
2. Enable **Firestore** and **Storage** in the console (production mode is fine — the rules from `firestore.rules.template`/`storage.rules.template` govern access).
3. Add a Web app under Project settings → General, and copy its config into `NEXT_PUBLIC_FIREBASE_*` in `.env.local` (copy `.env.local.example` first).
4. Project settings → Service accounts → Generate new private key, and copy `project_id`/`client_email`/`private_key` into `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` in `.env.local` (keep the key's `\n` escapes literal).
5. Deploy the security rules: `npm run rules:build && npx firebase deploy --only firestore:rules,storage:rules --project <your-project-id>`. `OWNER_EMAIL` in `.env.local` decides which Google account can edit. It must be the same address as `NEXT_PUBLIC_OWNER_EMAIL`, which the app uses.
6. Seed the real project once: `npm run seed:firestore` (the script loads `.env.local` itself via `tsx`'s `--env-file-if-exists`).

### Local emulator development

- `firestore.rules` and `storage.rules` are generated and not committed. Run `npm run rules:build` once before `npm run emulators` (`npm run test:emulator` does it for you).
- `npm run emulators` starts the Firestore/Storage emulators with a UI at http://localhost:4000.
- `npm run test:emulator` runs the emulator-backed test suite in `tests/emulator/` end-to-end (starts the emulator, runs the tests, tears it down).
- `npm test` / `npm run e2e` never need Firebase running — `getPublishedSite()` falls back to seed data automatically.


## Running without Firebase (Vercel storage)

- On Vercel: add a Neon Postgres database and a Blob store to the project (Storage tab), and set `SETUP_CODE` to a code you choose (at least 12 characters; generate one with `openssl rand -base64 18` or a password manager — a shorter code counts as not set). Deploy, open `/admin`, enter the code and choose a password, then answer a few setup questions. Forgot it? Use "Forgot password?" with the same code.
- After adding the database and Blob store to a project, redeploy it so `/admin` switches to password sign-in.
- Locally: `PORTFOLIO_BACKEND=vercel PGLITE_DIR=.data/pglite SETUP_CODE=dev-setup-code npm run dev` — a database and an uploads folder are created under `.data/` (git-ignored). `npm run seed:firestore` seeds whichever backend is configured.
- `PGLITE_DIR` and `MEDIA_DIR` are for local development and tests only.

## Icons

Each site picks its icon pack in the editor: **Site settings → Style → Icon pack**. The template ships six packs in `icon-packs/`: `default`, `glass`, `outline`, `pastel`, `mono-light` and `mono-dark`, all drawn from openly licensed glyphs (see each pack’s `LICENSE.md`). Before `dev`, `build` and the tests, `npm run icons:install` copies every pack to `public/icons/<pack>/` and writes `public/icons/packs.json`, the list the editor offers.

`ICON_PACK` in `.env.local` chooses the pack for a site that hasn’t picked one. It is `default` if unset.

To add your own pack, create `icon-packs/<name>/` with a `<slug>.png` and a `<slug>.webp` for every slug in `src/lib/iconCatalog.ts` and a `LICENSE.md`, and add it to `ICON_PACKS` in that file. To redraw the built-in packs after adding catalog icons, run `npm run icons:generate` (or `npm run icons:generate -- glass` for one).

## Editing your portfolio

Everything is edited visually, on the site itself.

1. **One-time Firebase setup:** Firebase console → Authentication → Sign-in method → enable **Google**. Under Authentication → Settings → Authorized domains, add your Vercel domain (and your custom domain). `localhost` is there by default.
2. Go to **`/admin`** and sign in with the owner's Google account (the account in `NEXT_PUBLIC_OWNER_EMAIL`). Any other account is signed straight back out.
3. Click **Open the editor**. A toolbar appears at the top of your site. From then on, this browser shows the toolbar whenever you visit your site; **More → Sign out** stops that.

What you can do with Edit on:

- **Drag** icons, the sticky note, and dock items. Click to **select**, double-click to open, and **right-click** for Rename, Change Icon, Duplicate, Add to/Remove from Dock, Hide, and Delete.
- Click the headline, your name, or any sticky-note line and **type in place**.
- The **Inspector** on the right edits whatever is selected: its name, icon, visibility, and all of its content (text, images, PDF, links, lists). **Site** edits your name, headline, colours, menu bar, incoming call, and share preview. It also lists every app, including hidden ones.
- **Add** creates projects, notes, links, and other apps, plus dock links and separators. **Wallpaper** (or clicking the bare desktop) changes the background. The icon picker offers the icons from your icon pack and lets you upload your own.
- **Phone** previews the phone layout. Drag apps between slots and into the dock, and long-press or right-click for Move to New Page. **Reset phone layout** goes back to the automatic layout.
- **⌘Z / ⇧⌘Z** undo and redo.

Changes save to your private **draft** 2 seconds after you stop, and the toolbar shows the status. Unsaved changes survive a reload. Visitors see nothing until you click **Publish**, which copies the draft to the live site and keeps a snapshot in `versions/`. **More → Discard draft changes** resets the draft to what's live, and you can undo that.

**Trying it without Firebase:** in `npm run dev`, open `http://localhost:3000/?editor=local`. The same editor runs, but it saves to this browser's localStorage. It's disabled in production builds, and the editor e2e tests use it.

## Deploying to Vercel

1. Import the repository into Vercel; it auto-detects Next.js, no build command changes needed.
2. Add every `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `OWNER_EMAIL`, and `NEXT_PUBLIC_OWNER_EMAIL` variable from `.env.local` to the Vercel project's Environment Variables (Production **and** Preview).
3. `FIREBASE_PRIVATE_KEY` must keep its `\n` escapes exactly as copied — do not let Vercel's UI reformat it into real newlines.
