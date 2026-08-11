# Shoptie — AI Stylist

AI-powered tie matching for **Shoptie.co.uk**. Upload a photo of your shirt, suit or
coat and get tailored tie recommendations with colours, patterns, matching reasons
and styling advice.

## Tech

A lightweight, dependency-free static web app — plain HTML, CSS and JavaScript.
No build step, no `npm install`, no Node runtime required. Open `index.html`, or serve
the folder with any static server (e.g. `python -m http.server`), and it works.

This keeps the whole product light enough to run comfortably on a 4 GB RAM machine
and deploys to any static host (Netlify, Vercel, Cloudflare Pages, cPanel, etc.).

## Pages

| Route            | File             |
| ---------------- | ---------------- |
| `/`              | `index.html`     |
| `/stylist`       | `stylist.html`   |
| `/results`       | `results.html`   |
| `/how-it-works`  | `how-it-works.html` |
| `/about`         | `about.html`     |
| `/contact`       | `contact.html`   |
| `/privacy`       | `privacy.html`   |
| `/terms`         | `terms.html`     |

## How the styling flow works

1. User uploads (or drag & drops) an image on `/stylist`.
2. The image is **previewed locally**; the user can change or remove it.
3. Clicking **Analyse My Outfit** shows a loading state, then calls
   `ShoptieAI.analyzeOutfit(imageDataUrl)` from `assets/js/ai-service.js`.
4. Results are stored in `sessionStorage` and the user is sent to `/results`,
   which renders an outfit summary + six scored tie recommendations.

### The analysis service layer (`assets/js/ai-service.js`)

The current **demo provider** runs entirely in the browser:

- Extracts the **real dominant colour palette** from the uploaded photo via `<canvas>`.
- Applies heuristics for pattern / formality / style.
- Scores 16 curated tie styles on colour harmony, formality fit and contrast.
- Returns up to 6 recommendations with score, reason and styling advice.

No image ever leaves the device and **no API key is hard-coded anywhere**.

### Connecting a real AI vision API later

Implement a provider with the same contract as the demo:

```js
ShoptieAI.registerProvider('openai', {
  name: 'openai',
  label: 'OpenAI Vision',
  analyze: function (imageDataUrl, options) {
    // POST imageDataUrl to your vision endpoint and resolve
    // with an analysis object shaped like the demo output:
    // { dominant:{hex,name,share,hsl}, colours:[], pattern, formality,
    //   style, clothingType, recommendations:[{id,name,colorHex,...}] }
    return Promise.resolve({ /* ... */ });
  }
});
ShoptieAI.setProvider('openai'); // persists in localStorage
```

No other part of the site needs to change.

## Notes

- All illustrations (hero suit, ties, logo) are hand-authored SVGs — no stock
  images, no font downloads, no external requests.
- "Shop this tie" buttons are placeholders ready to be pointed at UK retailer /
  affiliate product URLs.
- Recommended local test: open `index.html` directly, or serve the folder.