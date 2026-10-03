# Glimpse

**Map your world with the photos you never post.** A living map built from the everyday photos people take but never share.

Three principles: *place over person* (no names, no likes, no followers), *record over performance* (you keep what moves you, privately), and *time as a dimension* (every street is layered through the years). Visual style: light and familiar, like Instagram: a white canvas, system font, one blue accent and rounded photos. Each glimpse also carries an Hour Light color for the time it was taken. (An alternative "Field Archive" direction is saved in `brand/` and `design/` for reference.)

Built with **Expo (React Native)** for iOS, Android and web, and **Supabase** for the database, image storage and anonymous accounts.

---

## 1. Run it on your phone (5 minutes, no accounts needed)

You'll need [Node.js](https://nodejs.org) (LTS) installed on your computer, and the **Expo Go** app on your phone (App Store / Play Store).

```bash
cd glimpse
npm install
npx expo start
```

Scan the QR code with your phone's camera (iPhone) or with Expo Go (Android). Your phone and computer must be on the same Wi-Fi network. If they aren't, run `npx expo start --tunnel`.

With no `.env` file, the app runs in **demo mode**: sample photos, and anything you post disappears when the app reloads. Press `w` in the terminal to open it in a web browser instead.

## 2. Go live with Supabase (15 minutes, free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the tables, privacy rules, storage bucket, reporting, blocking and account deletion.
3. **Authentication → Sign In / Providers**, and turn on **Allow anonymous sign-ins**.
4. **Project Settings → API Keys**. Copy `.env.example` to `.env` and fill in the project URL and publishable key.
5. Restart with `npx expo start --clear`.

Now every phone running the app shares one archive.

**Moderating:** glimpses and notes with 3 reports are hidden automatically. Review them in **Table Editor → photos / notes** (filter `hidden = true`). To ban someone, set `banned = true` on their row in **profiles**. Their posts disappear and they can't post again.

**Featured feed (you curate at first):** open the app once, then copy your user id from **Authentication → Users** and add it as a row in **Table Editor → editors**. Reopen the app: every shared glimpse now has a **Feature on the home screen** button. Once you've featured 5, the home feed switches from "Newest" to "Featured", with every 5th post a fresh glimpse getting its trial in front of people.

### What reaches whom

| Level | Who sees it | How a glimpse gets there |
|---|---|---|
| **Your world** (`visibility = 'private'`) | Only you, on your map and in your mosaics | Every upload that fails a check, or that you keep to yourself |
| **Archive** (`visibility = 'archive'`) | Anyone, on places, cities, maps and search | Passes the photo checks on the phone (or soft checks + "Share anyway") |
| **Featured** (`featured_at` set) | Everyone's home feed | An editor picks it. Later: `photo_scores` (keep rate with a prior), plus an aesthetic score |

The photo checks run on the phone before upload ([`src/lib/photoQuality.ts`](src/lib/photoQuality.ts)): at least 1000 px on the short side, in focus, not almost all black or white, not a screenshot, not a duplicate of one of your recent uploads. Size, focus and light are *soft* (fog and night photos can fail them honestly, so you can share anyway; those are never auto-featured). Screenshots and duplicates are *hard*. Because a phone can be tampered with, repeat the checks on a server before automatic featuring is turned on.

Every number in the app is counted from real shared glimpses (`archive_stats`, `city_stats`, `city_words`). The home headline shows the count only from 1,000 glimpses (`ARCHIVE_COUNT_MIN` in `src/lib/config.ts`).

## Features

- **Archive**: the thesis line, today's observation, cities as defined by everyone, places you follow, and the Featured feed (or the newest glimpses while the archive is young). Switch to **Map** to see the archive as squares on a paper map: yours in vermilion, kept in ink, everyone else's in the color of their hour.
- **Now**: pick an hour and see every glimpse taken at that local time, anywhere, in any year. The screen takes on that hour's light.
- **Capture**: a three-second flow. Name the place, add one word for the city, and location is rounded to about 1 km by default. You get a catalogue number and "you added the 8th layer to …".
- **Index**: search places, cities and the words people use.
- **Yours** (private): your cities, each a photomosaic of its famous view that fills in as you take or keep glimpses there (24 / 60 / 120 / 200 tiles). Also what you've taken, kept and followed, and settings.
- **City pages**: a dictionary entry ("Lisbon (n.) trams · tiles · uphill") built from everyone's words. **Layers**: one place through time, with a timeline scrubber. **Notes**: anonymous and about the place.

Map tiles come from OpenStreetMap (free, no API key; the attribution on the map is required). OSM's tile policy allows interactive use like this but not heavy traffic, so before a public launch switch `TILE_URL` in `src/components/PhotoMap.tsx` to a tile provider plan (MapTiler, Stadia Maps or Protomaps).

Share links point to `https://glimpse.place/photo/<id>` (override with `EXPO_PUBLIC_WEB_URL`).

## Website: glimpse.place (Cloudflare Pages)

The web version is deployed from GitHub by Cloudflare Pages. Every push to `main` rebuilds the site.

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, pick this repository.
2. Build settings: framework preset **None**, build command `npx expo export --platform web`, output directory `dist`.
3. **Environment variables**: `NODE_VERSION` = `22`. (Add `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` when you go live; without them the site runs on demo data.)
4. After the first deploy: the project → **Custom domains → Set up a custom domain** → `glimpse.place` (and `www.glimpse.place`). Because the domain is already on Cloudflare, the DNS is added for you.

The app is a single-page app; Pages serves `index.html` for every path (there's no `404.html`), so links like `/photo/<id>` and `/city/Lisbon` open directly.

## 3. How the code is organized

```
src/
  app/                    ← every file here is a screen (Expo Router)
    (tabs)/index.tsx      Archive (list + map)
    (tabs)/now.tsx        Now: one hour, everywhere
    (tabs)/capture.tsx    Capture → receipt with catalogue number + mosaic tile
    (tabs)/search.tsx     Index
    (tabs)/yours.tsx      Your cities, taken, kept, places, settings
    city/[name].tsx       A city's definition, places and glimpses
    place/[key].tsx       Layers: one place through time
    photo/[id].tsx        One glimpse: catalogue card, keep, notes
    mosaic/[city].tsx     Your mosaic of a city
    observation/[key].tsx Daily observation
  components/             Print, Wall, Mosaic, CityCard, PlaceCard, PhotoMap, Sheet, ui
  lib/
    api/index.ts          The one interface all screens use
    api/demo.ts           In-memory backend (used when .env is empty)
    api/supabase.ts       Real backend
    hourLight.ts          The Hour Light palette
    landmarks.ts          Each city's mosaic view + levels
  theme.ts                Field Archive colors, fonts, type
supabase/schema.sql       Database, security rules, storage, moderation
```

**Privacy by design:**
- Every device gets a hidden anonymous account. Other users never see account IDs, only the public views (`archive_photos`, `archive_notes`, `places`, `city_words`, `city_stats`).
- Location can be **About 1 km** (the default), **Exact** or **Off the map**. Rounding happens on the phone, before upload.
- There are no names at all, and keeping a glimpse is private. Nobody sees who kept what.

Useful commands: `npm run typecheck`, `npm run lint`, `npx expo-doctor`.

---

## 4. Launch checklist: from project to App Store

### Accounts and money
- [ ] **Apple Developer Program**: $99/year. Enrolling as an **organization** shows your company name on the App Store instead of your personal name, but it needs a legal entity (for example an LLC) and a free D-U-N-S number. Enrolling as an individual is faster.
- [ ] Google Play developer account ($25 one-time) if you also launch on Android.
- [ ] **Supabase Pro** (about $25/month) once you have real users. The free tier pauses inactive projects.
- [ ] Buy a domain and set up an email for `EXPO_PUBLIC_CONTACT_EMAIL`.

### Apple's rules for apps with user posts (Guideline 1.2)
Apple rejects UGC apps that are missing any of these. This scaffold already covers the basics:
- [x] Filter objectionable material (`lib/moderation.ts`, client-side text filter)
- [x] Report glimpses and notes, with auto-hide after 3 reports
- [x] Block abusive users (without revealing who they are)
- [x] Published contact info (You tab and rules screen)
- [x] Users agree to terms with "zero tolerance" wording before posting
- [x] In-app account deletion (Guideline 5.1.1(v))
- [ ] **Add server-side image moderation** before launch. Write a Supabase Edge Function that checks every upload for nudity and violence (for example with AWS Rekognition, Google Cloud Vision SafeSearch, or an AI moderation API) and hides the photo if it fails. Anonymous photo apps are high-risk without this.
- [ ] Commit to reviewing reports within 24 hours, and actually do it (set up email alerts from Supabase).
- [ ] Rate the app honestly in App Store Connect's age rating questionnaire (UGC apps are usually rated 17+ / 18+ unless moderation is very strong).

Apple states that apps used mainly for "random or anonymous chat" or bullying don't belong on the store. Position Glimpse clearly as an **archive of places**. Notes are about places, never people.

### Legal pages (host them on your website)
- [ ] Privacy policy: what you collect (photos, location, device account), where it's stored (Supabase), and how to delete it
- [ ] Terms of use (can grow out of the rules screen)
- [ ] Fill in the App Store **privacy "nutrition label"** to match
- [ ] Before enabling uploads worldwide, read up on the DMCA (US) takedown process and, if you have EU users, GDPR basics. Talk to a lawyer before you raise money or grow large.

### Build and ship with EAS (no Mac needed)
```bash
npm install -g eas-cli
eas login
eas build:configure                 # creates eas.json and sets the iOS bundle identifier
eas build --platform ios            # cloud build, asks for your Apple account
eas submit --platform ios           # uploads to App Store Connect
```
Then in App Store Connect:
1. Test with friends via **TestFlight**.
2. Add screenshots, a description and the privacy policy URL.
3. Submit for review.

In the review notes, explain that the app uses anonymous accounts and describe your moderation (report, block, filter, auto-hide, 24-hour review, account deletion). This heads off the most common rejection.

Before building:
- [ ] Replace the placeholder icon and splash in `assets/`
- [ ] Set `ios.bundleIdentifier` (e.g. `com.yourcompany.glimpse`) and `android.package` in `app.json`

### After launch: growth ideas
- A **map view** of photos near you
- "**Photo of the day**" push notification
- Themed **prompts** ("doors", "3pm light", "your commute")
- A shareable web link for each photo (the web build already works: `npx expo export --platform web`)
