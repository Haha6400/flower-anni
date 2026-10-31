# assets

Drop your media here. Paths are set in `../content.json`.

| File | Used for |
|---|---|
| `main.jpg` | Main photo (letter, photos, and record scenes). Portrait or square works best. |
| `p1.jpg`, `p2.jpg`, `p3.jpg` | The three polaroids. Square crops look best. |
| `song.mp3` | The message song. With `music.autoplay: true` it starts on load, or on the visitor's first click/tap if the browser blocks autoplay. Set it to `false` to play only from the record or speaker button. |
| `bg-video.mp4` | Background video for the record scene (`music.video` in `content.json`). It's the music-video band cropped out of `Unknown.mp4` (a phone screen recording), with no sound, and plays muted in sync with the song. |
| `Unknown.mp4` | The original screen recording. It's the source for `song.mp3` and `bg-video.mp4` and isn't used by the page. |

Any file that is missing shows as a gray placeholder, and a missing song is skipped silently.
