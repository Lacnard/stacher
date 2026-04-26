# Bundled Binaries

Drop the following Windows executables into this folder before building:

- `yt-dlp.exe` — https://github.com/yt-dlp/yt-dlp/releases
- `ffmpeg.exe` — https://www.gyan.dev/ffmpeg/builds/ (essentials build)

These are packaged as `extraResources` by electron-builder and loaded by the app at runtime.
In development the app also resolves these paths via `app.getAppPath()`.
