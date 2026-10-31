# Anniversary card

An interactive anniversary card: a wax-sealed envelope that opens into a letter, photos, a record that plays a song, and a gift flower with a countdown.

Plain HTML, CSS, and JavaScript. No build step.

## Run it

The page reads `content.json`, so it must be served over HTTP (opening `index.html` directly won't load the content):

```
python3 -m http.server 8765
```

Then open http://127.0.0.1:8765.

## Edit it

- **Text, photos, song, video, countdown:** `content.json`
- **Media files:** `assets/` (see `assets/README.md`)
- **Colours, sizes, positions:** `styles/card.css`
- **Design notes and decisions:** `plan.md`
