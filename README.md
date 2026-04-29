# UdotFlix

Local movie web app for browsing and playing videos from the project `movies` folder.

## Movies Folder

Put supported video files under:

```text
movies/
```

Supported extensions:

```text
.mp4, .mkv, .webm, .mov, .avi
```

The app scans only this folder and serves only supported video files from it.

## Development

```powershell
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:1420/
```

## Production Mode Locally

Build the app:

```powershell
npm run build
```

Run the production preview server on port `1420`:

```powershell
npm run preview
```

Open:

```text
http://127.0.0.1:1420/
```

For smoother remote playback, use production mode instead of the Vite development server when testing through Tailscale Funnel.

## Tailscale Funnel

With the app running on port `1420`, expose it through Tailscale:

```powershell
tailscale funnel 1420
```

Current allowed host:

```text
udot-1.taildca2a3.ts.net
```

## Video Performance Notes

Videos are streamed with HTTP range requests so browsers can request only the bytes needed for playback and seeking.

Performance over Tailscale Funnel depends heavily on:

- your desktop/laptop upload speed
- Wi-Fi quality, or whether the server machine is on a LAN cable
- the video bitrate and resolution
- the video file size
- mobile network quality
- Tailscale Funnel routing
- whether the file is browser-friendly, especially MP4/H.264/AAC
- whether the video server receives and answers HTTP range requests

Large high-bitrate files may still buffer on mobile connections even when range streaming is working correctly.

## Recommended Video Format

For best mobile/browser playback over Funnel, use:

```text
MP4 container
H.264 video
AAC audio
720p or 1080p
faststart enabled
```

MP4 fast start places playback metadata at the beginning of the file so browsers can start sooner:

```text
-movflags +faststart
```

Optional ffmpeg command to make a 720p remote-streaming copy:

```powershell
ffmpeg -i "input.mkv" -vf "scale=-2:720" -c:v libx264 -preset slow -crf 23 -maxrate 3500k -bufsize 7000k -c:a aac -b:a 128k -movflags +faststart "output.720p.mp4"
```

Optional 1080p version:

```powershell
ffmpeg -i "input.mkv" -vf "scale=-2:1080" -c:v libx264 -preset slow -crf 23 -maxrate 6000k -bufsize 12000k -c:a aac -b:a 160k -movflags +faststart "output.1080p.mp4"
```

If the video is already MP4/H.264/AAC and only needs faststart:

```powershell
ffmpeg -i "input.mp4" -c copy -movflags +faststart "output.faststart.mp4"
```

ffmpeg is optional. It is not required to start UdotFlix.

## Verify Range Streaming

Start production mode:

```powershell
npm run build
npm run preview
```

In another PowerShell window, request the first 1024 bytes of a video URL shown by the app:

```powershell
Invoke-WebRequest "http://127.0.0.1:1420/movies/YOUR_VIDEO.mp4" -Headers @{ Range = "bytes=0-1023" } -UseBasicParsing
```

The response should be:

```text
StatusCode: 206
Content-Type: video/mp4
Content-Range: bytes 0-1023/TOTAL_SIZE
```

The server console also logs video diagnostics like:

```text
[video] 206 Movie.mp4 bytes=0-1023/2024658908 type=video/mp4
```
