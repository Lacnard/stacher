# Stacher

A professional yt-dlp / ffmpeg download manager for Windows, built with Electron, React, and TypeScript.

## Features

- Queue-based download engine with configurable concurrency and auto-retry
- Pause / resume / cancel / retry per item, with live progress parsing
- Pre-built format profiles (Best Video, 4K/1080p/720p/480p, MP3/FLAC/M4A) + custom flags
- Cookies-from-browser, per-domain cookie files, netrc, and an encrypted credential vault
- SQLite-backed history with search, re-download, open-file / open-folder
- Subtitle download, SponsorBlock removal, thumbnail & metadata embedding
- Settings for binary paths, proxy, rate limit, theme, and yt-dlp self-update

## Architecture

```
src/
  main/        Electron main — queue, downloader, credentials, history, IPC
  preload/     contextBridge — typed window.stacher API
  renderer/    React UI (Tailwind + Zustand)
  shared/      Types, IPC channel constants, profile presets
resources/     yt-dlp.exe, ffmpeg.exe  (bundled as extraResources)
```

All yt-dlp / ffmpeg spawning happens in the main process. The renderer only communicates through the typed preload bridge — credentials are encrypted via Electron `safeStorage` and never sent to the renderer in plaintext.

## Prerequisites

- Node.js 20+
- npm 10+
- Windows 10/11 (x64)
- `yt-dlp.exe` and `ffmpeg.exe` placed in `resources/` (see `resources/README.md`)

## Setup

```bash
npm install
```

Drop `yt-dlp.exe` and `ffmpeg.exe` into `resources/`. In dev the app resolves them from `<repo>/resources`; in a packaged build they come from `process.resourcesPath`.

## Develop

```bash
npm run dev
```

Launches `electron-vite dev`: Vite HMR for the renderer and hot-reload for main/preload.

## Typecheck

```bash
npm run typecheck
```

Runs both node-side (`tsconfig.node.json`) and web-side (`tsconfig.web.json`) checks.

## Build

```bash
npm run build         # emits /out
npm run dist          # NSIS installer in /release
npm run dist:dir      # unpacked build (faster, for smoke testing)
```

The installer is configured in `electron-builder.yml`:
- NSIS, per-user, installation-directory selectable
- `resources/` is copied to the app's `resources` dir as `extraResources`
- `better-sqlite3` is `asarUnpack`ed so the native `.node` binary stays loadable

## IPC surface

All channels live in [`src/shared/ipcChannels.ts`](src/shared/ipcChannels.ts). The renderer only sees the typed wrapper exposed in [`src/preload/index.ts`](src/preload/index.ts) as `window.stacher`:

| Namespace       | Methods                                                                  |
|-----------------|--------------------------------------------------------------------------|
| `downloads`     | start, pause, resume, cancel, retry, list, clear, onProgress/Status/Log  |
| `settings`      | get, set, pickFolder                                                     |
| `credentials`   | list, set, delete                                                        |
| `history`       | list, search, delete, openFile, openFolder                               |
| `ytdlp`         | version, checkUpdate, runUpdate, fetchInfo                               |

## Adding a format profile

Edit [`src/shared/profiles.ts`](src/shared/profiles.ts) — each profile is a flat `{ id, label, description, args }`. The `args` array is passed straight to yt-dlp.

## Notes

- Pause is best-effort: yt-dlp does not support true pause, so it is implemented as cancel+resume that yt-dlp continues from `.part` fragments when possible.
- The app runs entirely offline; only actual download actions touch the network.
- If `yt-dlp.exe` is missing, downloads fail with a clear error rather than crashing.
