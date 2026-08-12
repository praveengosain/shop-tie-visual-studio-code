/* ============================================================
   Shoptie — Tie SVG renderer
   Generates an elegant flat-illustration necktie as an inline
   SVG string for any colour, with optional fabric patterns.
   Used by the recommendation cards, sample sections and the
   loading animation. Zero dependencies.
   ============================================================ */
(function (global) {
  "use strict";

  function hexToRgb(hex) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function shade(hex, amt) {
    var c = hexToRgb(hex);
    var mix = function (v) { v = v + (amt * 255); return Math.max(0, Math.min(255, Math.round(v))); };
    function p(v) { var s = v.toString(16); return s.length === 1 ? "0" + s : s; }
    return "#" + p(mix(c.r)) + p(mix(c.g)) + p(mix(c.b));
  }

  /* Pattern overlays drawn inside a <clipPath> of the blade+knot */
  function patternDefs(pattern, uid, colour) {
    var s = pattern.toLowerCase();
    if (s.indexOf("stripe") !== -1) {
      return '<g clip-path="url(#blade' + uid + ')" opacity="0.5">' +
        '<rect x="44" y="40" width="4" height="120" fill="#fff"/>' +
        '<rect x="52" y="40" width="4" height="120" fill="#fff" opacity="0.7"/>' +
        '</g>';
    }
    if (s.indexOf("polka") !== -1) {
      var dots = "";
      for (var y = 52; y < 148; y += 18) {
        for (var x = 40; x < 62; x += 14) { dots += '<circle cx="' + x + '" cy="' + y + '" r="3" fill="#fff"/>'; }
      }
      return '<g clip-path="url(#blade' + uid + ')" opacity="0.55">' + dots + '</g>';
    }
    if (s.indexOf("check") !== -1) {
      var chk = "";
      for (var cy = 44; cy < 150; cy += 14) {
        for (var cx = 34; cx < 66; cx += 14) { chk += '<rect x="' + cx + '" y="' + cy + '" width="7" height="7" fill="#fff" opacity="0.65"/>'; }
      }
      return '<g clip-path="url(#blade' + uid + ')" opacity="0.5">' + chk + '</g>';
    }
    if (s.indexOf("knit") !== -1) {
      return '<g clip-path="url(#blade' + uid + ')" stroke="#fff" stroke-width="0.6" opacity="0.22">' +
        '<path d="M38 44 L62 44 M36 56 L64 56 M36 68 L64 68 M35 80 L65 80 M35 92 L65 92 M35 104 L65 104 M35 116 L65 116 M36 128 L64 128 M38 140 L62 140"/>' +
        '</g>';
    }
    if (s.indexOf("paisley") !== -1 || s.indexOf("intricate") !== -1) {
      return '<g clip-path="url(#blade' + uid + ')" fill="#fff" opacity="0.28">' +
        '<circle cx="42" cy="70" r="5"/><circle cx="52" cy="84" r="6"/><circle cx="58" cy="104" r="5"/>' +
        '<circle cx="46" cy="118" r="4"/><circle cx="54" cy="132" r="4"/>' +
        '</g>';
    }
    /* Textured / solid — nothing extra */
    return "";
  }

  /**
   * Render a necktie.
   * @param {string} colour - base hex colour
   * @param {string} pattern - fabric description (used for overlay)
   * @param {number} height - height in px (auto width)
   * @param {string} [uid] - unique id for gradients/clips
   * @returns {string} inline SVG markup
   */
  function tieSVG(colour, pattern, height, uid) {
    var id = uid || ("tie" + Math.random().toString(36).slice(2, 8));
    var w = Math.round((height * 100) / 160);
    var light = shade(colour, 0.18);
    var dark = shade(colour, -0.22);

    return (
      '<svg viewBox="0 0 100 160" width="' + w + '" height="' + height + '" role="img" aria-label="Tie">' +
        '<defs>' +
          '<linearGradient id="g' + id + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="' + light + '"/>' +
            '<stop offset="0.5" stop-color="' + colour + '"/>' +
            '<stop offset="1" stop-color="' + dark + '"/>' +
          '</linearGradient>' +
          '<clipPath id="blade' + id + '">' +
            '<path d="M46 40 L54 40 L63 118 C64.5 132 58 148 50 151 C42 148 35.5 132 37 118 Z"/>' +
          '</clipPath>' +
        '</defs>' +
        '<g transform="rotate(6 50 55)">' +
          /* neck band + knot */
          '<rect x="46" y="14" width="8" height="14" fill="url(#g' + id + ')" opacity="0.55"/>' +
          '<path d="M43 28 L57 28 L59 44 L41 44 Z" fill="url(#g' + id + ')" stroke="' + dark + '" stroke-width="0.6"/>' +
          '<path d="M43 30 L57 30 L54 40 L46 40 Z" fill="url(#g' + id + ')"/>' +
          '<circle cx="50" cy="40" r="2.6" fill="' + dark + '"/>' +
          '<path d="M44 21 C46 18 50 17 50 17 L52.5 27 L51 28 L50 27.5 L49 28 L47.5 27 Z" fill="' + light + '" opacity="0.85"/>' +
          /* blade */
          '<path d="M46 40 L54 40 L63 118 C64.5 132 58 148 50 151 C42 148 35.5 132 37 118 Z" fill="url(#g' + id + ')" stroke="' + dark + '" stroke-width="0.6"/>' +
          '<path d="M42.5 46 L54.5 44 L61 116 C62 126 58 138 50 143 L47.5 130 L49.5 92 Z" fill="#fff" opacity="0.14"/>' +
          patternDefs(pattern, id) +
        '</g>' +
      '</svg>'
    );
  }

  global.ShoptieTie = { render: tieSVG };
})(window);
