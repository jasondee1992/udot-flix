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

For another device on your home network, open:

```text
http://YOUR_LOCAL_IP:1420/
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

## Seeking And Range Streaming

The app serves local videos with HTTP byte-range responses so the browser can jump directly to later timestamps instead of reading the movie from the beginning.

Expected behavior:

- seeking to a far timestamp should trigger `206 Partial Content`
- the browser should request byte ranges for the needed part of the file
- the server streams only the requested chunk from disk

You can verify this in the browser devtools network tab or with a manual request:

```powershell
Invoke-WebRequest "http://127.0.0.1:1420/movies/YOUR_VIDEO.mp4" -Headers @{ Range = "bytes=1048576-2097151" } -UseBasicParsing
```

The response should include:

```text
StatusCode: 206
Accept-Ranges: bytes
Content-Range: bytes START-END/TOTAL_SIZE
Content-Length: CHUNK_SIZE
Content-Type: video/mp4
```

## MP4 Faststart Optimization

Some MP4 files are technically valid but still seek poorly because the metadata atom is not placed near the beginning of the file.

Without re-encoding, you can optimize an MP4 like this:

```powershell
ffmpeg -i "input.mp4" -c copy -movflags +faststart "output-faststart.mp4"
```

Helper script:

```powershell
npm run videos:faststart -- "movies/Folder/Movie.mp4"
```

Optional explicit output file:

```powershell
npm run videos:faststart -- "movies/Folder/Movie.mp4" "movies/Folder/Movie.faststart.mp4"
```

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
