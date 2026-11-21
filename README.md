# My Bookshelf

[![Live app](https://img.shields.io/badge/Live%20app-My%20Bookshelf-765442?style=flat-square)](https://my-bookshelf-bxk.pages.dev/)
[![iPhone web app](https://img.shields.io/badge/iPhone-Web%20app-5A4A78?style=flat-square&logo=pwa&logoColor=white)](#install-on-an-iphone)
[![Goodreads CSV import](https://img.shields.io/badge/Goodreads-CSV%20import-795548?style=flat-square&logo=goodreads&logoColor=white)](#import-an-existing-goodreads-library)
[![Open Library covers](https://img.shields.io/badge/Covers-Open%20Library-6B5545?style=flat-square)](https://openlibrary.org/dev/docs/api/covers)

[![React 19](https://img.shields.io/badge/React-19-087EA4?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-0E7490?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js 22.12+](https://img.shields.io/badge/Node.js-22.12%2B-417E38?style=flat-square&logo=nodedotjs&logoColor=white)](#run-locally)
[![Supabase auth and storage](https://img.shields.io/badge/Supabase-Auth%20%26%20storage-227953?style=flat-square&logo=supabase&logoColor=white)](#enable-accounts)
[![Cloudflare Pages deployment](https://img.shields.io/badge/Cloudflare-Pages-A44C16?style=flat-square&logo=cloudflare&logoColor=white)](#deploy-or-update-the-web-app)

A personal bookshelf for physical books and ebooks. Open any book to see a 3D
preview with a hinged cover, spine and page block. Search by title or author,
or filter by reading status and shelves.

## Run locally

Use Node.js 22.12 or newer, then run these commands from the project folder.

```bash
npm ci
npm run dev
```

Open the URL Vite prints. The default is `http://localhost:5173/`. If that port
is busy, use the actual URL shown in the terminal. Local development starts
without sign-in when both Supabase variables are unset. With the variables
configured, the same development server opens the sign-in screen.

```bash
npm run lint
npm run build
npm run preview
```

## Manage your bookshelf

- **Add book** creates an entry directly. Click a book, then **Edit book**, to
  update its details, shelves, rating or notes, or remove it.
- **Arrange shelf** shows the complete library. Drag a book to either side of
  another book. On a touch screen, tap a book and use the arrow buttons. The
  order is saved automatically. Books wrap into vertically scrollable rows
  on both phones and desktop.
- **Deco** opens the decoration tray. Browse all pieces or filter by lamps,
  candles, figurines, or objects. Drag a decoration beside
  a book with the mouse or by touch. You can also choose a decoration, then tap
  a shelf item to place it before that item, or choose **Place at end**. Use **Upload deco**
  to place a transparent PNG or WebP of your own. Select a placed decoration
  to move or remove it. Decorations appear in the full shelf view and their
  placements and uploaded images are included in backups and account sync.
- **Find cover** searches Open Library by title and author. **Upload cover**
  takes priority over automatic ISBN matching and saves your image with the
  book. The app resizes uploaded images to 640 pixels on the longest side
  when needed.
- **Download backup** exports your books, their order, selected cover references,
  and uploaded images to JSON. Open **Import CSV or backup** to restore a backup
  in another browser or account. A backup replaces the current shelf. The app
  asks for confirmation when the current shelf contains books.
- On a phone, open **More** to reach import and backup actions.
- **Dark mode** follows the device appearance until you choose a setting. Each
  browser or installed web app stores its own choice.

### Where your shelf is saved

In local development without an account, the shelf lives in the current
browser's IndexedDB. Earlier localStorage imports are migrated automatically.
The browser profile, address, and port determine which local shelf you see.
To move it into an account, download a backup while using the local shelf,
then sign in and import that backup.

With an account, your books, order, ratings, notes, and uploaded covers are
saved in Supabase. Sign in with the same account on both devices and use builds
configured for the same Supabase project. Reload a shelf that is already open
on the other device to fetch the latest saved version. If the app reports a
concurrent edit, download a backup of your current changes before reloading.
An Open Library cover picked from search is backed up as a reference and is
still fetched from Open Library.

## Import an existing Goodreads library

Open [Goodreads Import/Export](https://www.goodreads.com/review/import) and
click **Export Library**. Download the CSV, then choose **Import CSV or backup**
in My Bookshelf, or drag the file onto the page.

Keep the `Book Id` column from the Goodreads export so the app can identify
books across imports. Each CSV import appends only books with new IDs.
Existing books keep their order, metadata, notes and covers. Update existing
entries with **Edit book**. Books you remove from My Bookshelf stay removed
when you import another CSV. A JSON backup also records those removals.

## Enable accounts

1. Enable the Data API for your Supabase project. In the SQL editor, apply
   [the private bookshelf migration](supabase/migrations/202611210001_private_bookshelves.sql).
   Run it once for each new Supabase project. It restricts shelf access to
   its owner and requires two-step verification for accounts with an enrolled,
   verified authenticator.
2. Copy [`.env.example`](.env.example) to `.env.local` in the project root.
   In the Supabase dashboard use **Connect** to get the project URL and the
   browser-safe key starting with `sb_publishable_`. Set the two variable
   names below even if Supabase shows `NEXT_PUBLIC_` names. Restart Vite
   after editing the file. Keep service keys and provider secrets in their
   server-side settings.

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example
   ```

3. In **Authentication → URL Configuration**, set **Site URL** to the main app
   address. Use the URL printed by Vite for local-only testing. For a hosted
   app, use its HTTPS address. Add each app address to the
   [Redirect URLs list](https://supabase.com/docs/guides/auth/redirect-urls),
   including the local port and trailing slash where applicable.
4. [Set up Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google).
   Create an OAuth web client in Google Auth Platform. Add each app origin
   under **Authorized JavaScript origins**, with no path or trailing slash.
   Under **Authorized redirect URIs**, use the Supabase Google provider's
   callback URL ending in `/auth/v1/callback`. Set the client ID and secret
   under **Authentication → Sign In / Providers → Google** in Supabase, enable
   Google, and save. Add your Google account under **Audience → Test users**
   if your Google app is in testing.
5. In the Supabase email provider, enable email/password signup and **Confirm
   email**. Set the server-side password minimum to at least 12 characters.
   Keep server-side rate limits enabled, review the email and verification
   limits for your audience, and enable leaked-password checks if supported by
   your plan. Set up custom SMTP for production and enable password-change
   security notifications. [Password settings](https://supabase.com/docs/guides/auth/password-security)
6. Edit the Supabase [email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
   to use these links. Disable email click tracking so the links remain intact.

   **Confirm sign up**

   ```html
   <a href="{{ .RedirectTo }}?auth_action=confirm#token_hash={{ .TokenHash }}">Confirm email</a>
   ```

   **Reset password**

   ```html
   <a href="{{ .RedirectTo }}?auth_action=recover#token_hash={{ .TokenHash }}">Reset password</a>
   ```

7. To enable bot protection, put the public Turnstile site key in
   `VITE_TURNSTILE_SITE_KEY` and configure its secret and CAPTCHA enforcement
   in [Supabase Auth](https://supabase.com/docs/guides/auth/auth-captcha).
   Enable authenticator app (TOTP) enrollment and verification in the project
   for the **Security** menu. Keep a second registered authenticator if you need
   a backup factor.

## Deploy or update the web app

1. For a personal deployment, confirm that your own account can sign in and
   turn off **Allow new users to sign up** in Supabase Auth. The sign-in page
   remains reachable at its public URL. Existing accounts can still sign in
   and the database restricts each shelf to its owner.
2. Run `npm run build` with your Supabase settings configured. Upload the
   generated `dist/` folder using [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).
   For an update, open the project whose `.pages.dev` address matches the
   installed app, then choose **Create a new deployment → Production** and
   upload the rebuilt `dist/`. The build contains the public frontend. Keep
   `.env.local`, project source, and personal backups outside the upload.
3. Add the exact hosted URL, including the final slash, to **Redirect URLs** in
   Supabase. Set it as your **Site URL** if it is the main deployment. Keep
   localhost in the allowed list if you still use the development app. For the
   Google OAuth web client, add the HTTPS origin to **Authorized JavaScript
   origins**. Its authorized redirect URI remains the Supabase callback URL.

Serve the production build over HTTPS. The build includes a Content Security
Policy and [Cloudflare response headers](public/_headers). If you use a host
that ignores `_headers`, configure its response headers directly. A
production build with missing account configuration displays a setup screen.

## Install on an iPhone

Open the hosted address in Safari. Choose **Share → Add to Home Screen**, leave
**Open as Web App** enabled if shown, and tap **Add**. Open the icon and sign in
with the account you use on your Mac. [Apple's iPhone guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27)

Regular browser sessions are scoped to a tab. The installed web app remembers
its session when reopened with a build that supports persistent sessions.
Use **Sign out** in that app to clear its saved sign-in. When updating from an
older build, close and reopen the installed app after deploying the update,
then sign in once if prompted.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| The local app opens without a sign-in screen | Verify the two `VITE_SUPABASE_` variable names in `.env.local`, then restart Vite and open the URL it prints. |
| `Unsupported provider: provider is not enabled` | Enable **Google** in the Supabase project's **Sign In / Providers** and save its OAuth credentials. |
| Google returns to the wrong address | Compare the actual app URL against **Redirect URLs** in Supabase, including the port and trailing slash. In Google Cloud, the redirect URI is the Supabase callback. |
| `Could not load your account’s bookshelf` | Confirm the signed-in app is connected to the Supabase project where the private bookshelf migration ran, then click **Retry**. If the SQL editor reports `relation "bookshelves" already exists`, check the existing table and policies before running another migration. |
| Changes from another device are missing | Verify both devices use the same account and Supabase project. Reload after the changes have saved. |
