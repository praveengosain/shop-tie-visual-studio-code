/* ============================================================
   Shoptie — AI Stylist Service Layer
   ------------------------------------------------------------
   This module is the single integration point for outfit
   analysis. It currently ships with a fully client-side DEMO
   provider that performs REAL colour extraction from the
   uploaded image (no server, no API key) and generates
   sensible tie recommendations from a curated palette.

   To connect a real AI vision API later, implement a
   provider object with the same contract below and register
   it — no other code needs to change.

   HOW TO ADD A REAL AI PROVIDER
   ------------------------------
   1. Create a function that accepts the image data URL
      (and optionally a config object) and returns a
      Promise resolving to an analysis object matching the
      shape documented in `DEMO_PROVIDER.analyze`.
   2. Register it:
        ShoptieAI.registerProvider('openai', providerObj)
        ShoptieAI.setProvider('openai')
      You can also switch from localStorage:
        localStorage.setItem('shoptie.ai.provider', 'openai')
   ============================================================ */
(function (global) {
  "use strict";

  var VERSION = "0.1.0";

  /* ----------------------------------------------------------
     Colour utilities
     ---------------------------------------------------------- */
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    function p(v) { var s = clamp(Math.round(v), 0, 255).toString(16); return s.length === 1 ? "0" + s : s; }
    return "#" + p(r) + p(g) + p(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h = 0, s = 0, l = (max + min) / 2;
    var d = max - min;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }

  function hexToHsl(hex) { var c = hexToRgb(hex); return rgbToHsl(c.r, c.g, c.b); }
  function hslToHex(h, s, l) { var c = hslToRgb(h, s, l); return rgbToHex(c.r, c.g, c.b); }

  /* Named colour lookup for human-readable labels */
  var COLOUR_NAMES = [
    ["#000000", "Black"], ["#2a2a2e", "Charcoal"], ["#3b3f46", "Dark Grey"], ["#8a867d", "Grey"],
    ["#bfc4ca", "Silver"], ["#ffffff", "White"], ["#f4efe7", "Ivory"], ["#cbb487", "Champagne"],
    ["#16233f", "Navy"], ["#274a8f", "Royal Blue"], ["#3d5a80", "Steel Blue"], ["#155e63", "Teal"],
    ["#1f4d33", "Forest Green"], ["#5a5f34", "Olive"], ["#6d1f2e", "Burgundy"], ["#5f1630", "Cranberry"],
    ["#7c2b38", "Wine"], ["#c2603f", "Coral"], ["#a87c2d", "Gold"], ["#8f8fb3", "Lavender"],
    ["#4a3b6b", "Plum"], ["#7a4a23", "Brown"], ["#8b1e3f", "Berry"]
  ];
  function nearestName(hex) {
    var c = hexToRgb(hex);
    var best = { name: "Tone", d: Infinity };
    for (var i = 0; i < COLOUR_NAMES.length; i++) {
      var t = hexToRgb(COLOUR_NAMES[i][0]);
      var d = Math.pow(t.r - c.r, 2) + Math.pow(t.g - c.g, 2) + Math.pow(t.b - c.b, 2);
      if (d < best.d) { best = { name: COLOUR_NAMES[i][1], d: d }; }
    }
    return best.name;
  }
/* ----------------------------------------------------------
     Dominant colour extraction (canvas, client-side)
     ---------------------------------------------------------- */
  function extractPalette(image) {
    var maxDim = 96;
    var scale = Math.min(1, maxDim / Math.max(image.width, image.height));
    var w = Math.max(1, Math.round(image.width * scale));
    var h = Math.max(1, Math.round(image.height * scale));

    var canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, 0, 0, w, h);

    var data;
    try { data = ctx.getImageData(0, 0, w, h).data; }
    catch (e) { return []; }

    /* Bucket colours into a coarse grid to find clusters */
    var buckets = {};
    var step = 32;
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      var key = (Math.floor(r / step) * 7 + Math.floor(g / step)) * 7 + Math.floor(b / step);
      if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, n: 0 };
      buckets[key].r += r; buckets[key].g += g; buckets[key].b += b; buckets[key].n++;
    }

    var list = Object.keys(buckets).map(function (k) {
      var bk = buckets[k];
      return { r: bk.r / bk.n, g: bk.g / bk.n, b: bk.b / bk.n, n: bk.n };
    }).sort(function (a, b) { return b.n - a.n; });

    /* Merge close clusters and take the dominant few */
    var merged = [];
    for (i = 0; i < list.length; i++) {
      var c = list[i];
      if (c.n < 4) continue;
      var placed = false;
      for (var j = 0; j < merged.length; j++) {
        var m = merged[j];
        var dist = Math.sqrt(Math.pow(m.r - c.r, 2) + Math.pow(m.g - c.g, 2) + Math.pow(m.b - c.b, 2));
        if (dist < 60) {
          var total = m.n + c.n;
          m.r = (m.r * m.n + c.r * c.n) / total;
          m.g = (m.g * m.n + c.g * c.n) / total;
          m.b = (m.b * m.n + c.b * c.n) / total;
          m.n = total;
          placed = true;
          break;
        }
      }
      if (!placed && merged.length < 6) { merged.push({ r: c.r, g: c.g, b: c.b, n: c.n }); }
    }

    merged.sort(function (a, b) { return b.n - a.n; });
    var total = merged.reduce(function (s, m) { return s + m.n; }, 0) || 1;

    return merged.map(function (m) {
      var hex = rgbToHex(m.r, m.g, m.b);
      return { hex: hex, name: nearestName(hex), share: Math.round((m.n / total) * 100) };
    });
  }

  /* ----------------------------------------------------------
     Demo pattern / formality heuristics (clearly heuristic)
     ---------------------------------------------------------- */
  function guessPattern(palette) {
    var dominant = palette[0];
    if (!dominant) return "Solid";
    if (dominant.share >= 74) return "Solid";
    if (dominant.share >= 55 && palette[1] && palette[1].share >= 12) return "Textured";
    return "Patterned";
  }

  function guessFormality(dominant) {
    if (!dominant) return "Business";
    var hsl = hexToHsl(dominant.hex);
    if (hsl.l < 0.24) return "Formal";
    if (hsl.l < 0.42) return "Business";
    if (hsl.l < 0.66) return "Smart Casual";
    return "Casual";
  }

  function guessStyle(formality) {
    switch (formality) {
      case "Formal": return "Classic Formal";
      case "Business": return "Refined Business";
      case "Smart Casual": return "Contemporary Casual";
      default: return "Relaxed Modern";
    }
  }

  /* ----------------------------------------------------------
     Curated tie palette
     ---------------------------------------------------------- */
  var TIES = [
    { id: "navy-silk", name: "Navy Silk Tie", hex: "#16233f", colour: "Navy", pattern: "Solid silk", formality: "Formal", bestFor: "Business & Formal", group: "neutral", price: "£25" },
    { id: "burgundy-textured", name: "Burgundy Textured Tie", hex: "#6d1f2e", colour: "Burgundy", pattern: "Textured weave", formality: "Business", bestFor: "Business & Evening", group: "warm", price: "£30" },
    { id: "forest-green", name: "Forest Green Tie", hex: "#1f4d33", colour: "Forest Green", pattern: "Solid", formality: "Smart Casual", bestFor: "Smart Casual", group: "cool", price: "£22" },
    { id: "classic-silver", name: "Classic Silver Tie", hex: "#9aa0a6", colour: "Silver Grey", pattern: "Solid", formality: "Formal", bestFor: "Formal Events", group: "neutral", price: "£28" },
    { id: "charcoal-knit", name: "Charcoal Knit Tie", hex: "#3b3f46", colour: "Charcoal", pattern: "Knitted", formality: "Smart Casual", bestFor: "Smart Casual", group: "neutral", price: "£20" },
    { id: "royal-blue", name: "Royal Blue Tie", hex: "#274a8f", colour: "Royal Blue", pattern: "Solid", formality: "Business", bestFor: "Business & Interview", group: "cool", price: "£26" },
    { id: "burgundy-polka", name: "Burgundy Polka Tie", hex: "#7c2b38", colour: "Burgundy", pattern: "Polka dot", formality: "Business", bestFor: "Weddings & Evening", group: "warm", price: "£27" },
    { id: "gold-paisley", name: "Gold Paisley Tie", hex: "#a87c2d", colour: "Gold", pattern: "Paisley", formality: "Smart Casual", bestFor: "Weddings & Parties", group: "warm", price: "£24" },
    { id: "olive-check", name: "Olive Check Tie", hex: "#5a5f34", colour: "Olive", pattern: "Check", formality: "Casual", bestFor: "Smart Casual", group: "warm", price: "£21" },
    { id: "black-basalt", name: "Black Basalt Tie", hex: "#2a2a2e", colour: "Black", pattern: "Subtle texture", formality: "Formal", bestFor: "Formal Events", group: "neutral", price: "£29" },
    { id: "champagne-silk", name: "Champagne Silk Tie", hex: "#cbb487", colour: "Champagne", pattern: "Silk", formality: "Formal", bestFor: "Weddings", group: "neutral", price: "£32" },
    { id: "emerald-peacock", name: "Emerald Peacock Tie", hex: "#155e63", colour: "Emerald", pattern: "Intricate", formality: "Business", bestFor: "Parties & Evening", group: "cool", price: "£28" },
    { id: "coral-bright", name: "Coral Tie", hex: "#c2603f", colour: "Coral", pattern: "Solid", formality: "Casual", bestFor: "Parties", group: "warm", price: "£23" },
    { id: "lavender-linen", name: "Lavender Linen Tie", hex: "#8f8fb3", colour: "Lavender", pattern: "Linen", formality: "Casual", bestFor: "Smart Casual", group: "cool", price: "£22" },
    { id: "cranberry-maroon", name: "Cranberry Tie", hex: "#5f1630", colour: "Cranberry", pattern: "Solid", formality: "Business", bestFor: "Business & Formal", group: "warm", price: "£25" },
    { id: "steel-stripe", name: "Steel Blue Stripe Tie", hex: "#3d5a80", colour: "Steel Blue", pattern: "Stripe", formality: "Business", bestFor: "Business & Interview", group: "cool", price: "£26" }
  ];

  var NEUTRAL_IDS = ["navy-silk", "classic-silver", "charcoal-knit", "black-basalt", "champagne-silk"];

  function hueDistance(a, b) { var d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; }

  /* Score a single tie against the analysed outfit */
  function scoreTie(tie, outfit) {
    var oHue = outfit.dominant.hsl.h;
    var tHue = hexToHsl(tie.hex).h;
    var tSat = hexToHsl(tie.hex).s;

    var isNeutral = NEUTRAL_IDS.indexOf(tie.id) !== -1 || tSat < 0.16;

    var hueScore;
    if (outfit.isNeutralOutfit) {
      hueScore = 62; /* any accent works against a neutral outfit */
    } else if (isNeutral) {
      hueScore = 70; /* neutral ties are universally harmonious */
    } else {
      var d = hueDistance(oHue, tHue);
      var analogous = Math.max(0, 1 - d / 50);
      var complementary = Math.max(0, 1 - Math.abs(d - 180) / 50);
      hueScore = Math.max(analogous, complementary) * 55 + (complementary > 0.7 ? 8 : 0) + (analogous > 0.6 ? 6 : 0);
    }

    /* Formality compatibility */
    var order = { "Casual": 0, "Smart Casual": 1, "Business": 2, "Formal": 3 };
    var oLvl = order[outfit.formality] || 1;
    var tLvl = order[tie.formality] || 1;
    var diff = Math.abs(oLvl - tLvl);
    var formalityAdj = diff === 0 ? 12 : diff === 1 ? 5 : -8;

    /* Lightness contrast: avoid colliding with a very dark outfit */
    var oL = outfit.dominant.hsl.l;
    var tL = hexToHsl(tie.hex).l;
    var lightnessAdj = 0;
    if (oL < 0.28 && (tL - oL) > 0.22) lightnessAdj = 6;   /* dark outfit → lighter tie pops */
    else if (oL < 0.28 && Math.abs(tL - oL) < 0.07) lightnessAdj = -5;
    else if (oL > 0.6 && tL > 0.75) lightnessAdj = 3;      /* light outfit → light/soft tie */
    else lightnessAdj = 2;

    return clamp(Math.round(hueScore + formalityAdj + lightnessAdj), 55, 99);
  }

function buildReco(tie, score, outfit) {
    var label = score >= 88 ? "Excellent" : score >= 78 ? "Very Good" : score >= 68 ? "Good" : "Fair";
    var oName = outfit.dominant.name;
    var isNeutral = NEUTRAL_IDS.indexOf(tie.id) !== -1 || hexToHsl(tie.hex).s < 0.16;
    var why;
    if (isNeutral) {
      why = "A versatile neutral that pairs effortlessly with the " + oName.toLowerCase() + " of your outfit — polished and safe for " + tie.bestFor.toLowerCase() + ".";
    } else if (outfit.isNeutralOutfit) {
      why = "With a neutral base, this " + tie.colour.toLowerCase() + " adds a confident focal point while staying on-tone for your look.";
    } else {
      var d = hueDistance(outfit.dominant.hsl.h, hexToHsl(tie.hex).h);
      if (Math.abs(d - 180) <= 50) {
        why = "Cuts a refined complementary contrast against your " + oName.toLowerCase() + " tones, giving a sharp, intentional finish.";
      } else {
        why = "Sits harmoniously within the " + oName.toLowerCase() + " family of your outfit for a seamless, tonal pairing.";
      }
    }
    var advice = "Pair with a crisp white or " + (outfit.isDark ? "light" : "navy") + " shirt and keep the knot neat for a " + outfit.formality.toLowerCase() + " setting. A medium-width " + tie.pattern.toLowerCase() + " works best with most lapel widths.";
    return {
      id: tie.id, name: tie.name, colorHex: tie.hex, colorName: tie.colour,
      pattern: tie.pattern, bestFor: tie.bestFor, formality: tie.formality,
      price: tie.price, score: score, label: label, why: why, advice: advice
    };
  }

  /* ----------------------------------------------------------
     DEMO PROVIDER — the working default
     ---------------------------------------------------------- */
  var DEMO_PROVIDER = {
    name: "demo",
    label: "Demo analysis engine",
    /** Contract: analyze(imageDataUrl[, options]) -> Promise<Analysis> */
    analyze: function (imageDataUrl) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          try {
            var palette = extractPalette(img);
            if (!palette.length) { reject(new Error("Could not read colours from this image.")); return; }

            var dominant = palette[0];
            var hsl = hexToHsl(dominant.hex);
            var isDark = hsl.l < 0.28;
            var isNeutralOutfit = dominant.share >= 62 || hsl.s < 0.16;

            var formality = guessFormality(dominant);
            var pattern = guessPattern(palette);
            var style = guessStyle(formality);

            var outfit = {
              version: VERSION,
              provider: "demo",
              dominant: { hex: dominant.hex, name: dominant.name, share: dominant.share, hsl: hsl },
              colours: palette.slice(0, 4),
              isDark: isDark,
              isNeutralOutfit: isNeutralOutfit,
              pattern: pattern,
              formality: formality,
              style: style,
              clothingType: formality === "Formal" ? "Suit" : formality === "Business" ? "Shirt / Jacket" : "Shirt / Coat",
              generatedAt: new Date().toISOString()
            };

            var scored = TIES.map(function (tie) {
              return buildReco(tie, scoreTie(tie, outfit), outfit);
            }).sort(function (a, b) { return b.score - a.score; });

            outfit.recommendations = scored.slice(0, 6);
            resolve(outfit);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = function () { reject(new Error("Your image could not be loaded.")); };
        img.src = imageDataUrl;
      });
    }
  };

  /* ----------------------------------------------------------
     Provider registry
     ---------------------------------------------------------- */
  var providers = { demo: DEMO_PROVIDER };
  var activeProvider = null;

  function currentProvider() {
    if (activeProvider) return activeProvider;
    try {
      var stored = global.localStorage && global.localStorage.getItem("shoptie.ai.provider");
      if (stored && providers[stored]) return providers[stored];
    } catch (e) { /* ignore */ }
    return DEMO_PROVIDER;
  }

  var ShoptieAI = {
    version: VERSION,
    providers: function () { return Object.keys(providers); },
    currentProvider: function () { return currentProvider().name; },

    registerProvider: function (name, provider) {
      if (!name || !provider || typeof provider.analyze !== "function") {
        throw new Error("Provider must expose an analyze(imageDataUrl) -> Promise function.");
      }
      providers[name] = provider;
    },

    setProvider: function (name) {
      if (!providers[name]) throw new Error("Unknown provider: " + name);
      activeProvider = providers[name];
      try { global.localStorage && global.localStorage.setItem("shoptie.ai.provider", name); } catch (e) {}
    },

    /** Public entry point used by the UI. Returns a Promise<Analysis>. */
    analyzeOutfit: function (imageDataUrl) {
      return currentProvider().analyze(imageDataUrl);
    }
  };

  global.ShoptieAI = ShoptieAI;
  global.ShoptieAI.MODES = { demo: true };
})(window);
