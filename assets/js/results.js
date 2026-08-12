/* ============================================================
   Shoptie — Results page (/results)
   Reads the latest analysis from session storage and renders
   the outfit summary + tie recommendations.
   ============================================================ */
(function () {
  "use strict";

  var state = null;
  try { state = JSON.parse(sessionStorage.getItem("shoptie.result")); } catch (e) { state = null; }

  var emptyView = document.getElementById("results-empty");

  function valToLabel(v) {
    if (v >= 90) return "Excellent";
    if (v >= 80) return "Very Good";
    if (v >= 70) return "Good";
    return "Fair";
  }
  function scoreClass(v) {
    if (v >= 90) return "excellent";
    if (v >= 80) return "verygood";
    return "good";
  }

  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  if (!state || !state.analysis || !state.image) {
    if (emptyView) emptyView.style.display = "block";
    var mainView = document.getElementById("results-main");
    if (mainView) mainView.style.display = "none";
    return;
  }

  var A = state.analysis;
  var grid = document.getElementById("reco-grid");
  var summary = document.getElementById("result-summary");

  /* --- Outfit summary --- */
  var photo = document.getElementById("result-photo");
  if (photo) { photo.src = state.image; photo.alt = "Your uploaded outfit"; }

  var head = document.getElementById("result-heading");
  if (head) head.textContent = "Your " + (A.clothingType || "Outfit") + " — Analysed";

  var pal = document.getElementById("result-palette");
  if (pal) {
    (A.colours || []).slice(0, 4).forEach(function (c) {
      var d = document.createElement("div");
      d.className = "swatch";
      d.style.background = c.hex;
      d.title = c.name + " (" + c.share + "%)";
      d.innerHTML = "<span>" + escapeHTML(c.name) + "</span>";
      pal.appendChild(d);
    });
  }

  var tags = document.getElementById("analysis-tags");
  if (tags) {
    var items = [
      ["Dominant", A.dominant ? A.dominant.name : "—"],
      ["Pattern", A.pattern || "—"],
      ["Formality", A.formality || "—"],
      ["Style", A.style || "—"],
      ["Clothing", A.clothingType || "—"]
    ];
    items.forEach(function (it) {
      var t = document.createElement("li");
      t.className = "analysis-tag";
      t.innerHTML = "<strong>" + escapeHTML(it[0]) + ": </strong>" + escapeHTML(it[1]);
      tags.appendChild(t);
    });
  }

  var note = document.getElementById("reco-note");
  if (note) {
    note.textContent = "Recommendation engine: " + ((A.provider === "demo") ? "Shoptie Demo (client-side colour analysis)" : A.provider) + " · " + (A.recommendations ? A.recommendations.length : 0) + " styles matched to your outfit.";
  }

  if (summary) summary.classList.add("show");

  /* --- Recommendation cards --- */
  if (!grid) return;

  (A.recommendations || []).forEach(function (r) {
    var card = document.createElement("article");
    card.className = "reco-card reveal";

    var art = document.createElement("div");
    art.className = "reco-art";
    art.innerHTML = ShoptieTie.render(r.colorHex, r.pattern, 150, "rec" + r.id);

    var badge = document.createElement("span");
    badge.className = "reco-match " + scoreClass(r.score);
    badge.textContent = "Match: " + r.label;

    var body = document.createElement("div");
    body.className = "reco-body";

    var title = document.createElement("h3");
    title.textContent = r.name;

    var tags = document.createElement("div");
    tags.className = "reco-tags";
    var t1 = document.createElement("span"); t1.className = "reco-tag"; t1.textContent = r.colorName;
    var t2 = document.createElement("span"); t2.className = "reco-tag"; t2.textContent = r.pattern;
    var t3 = document.createElement("span"); t3.className = "reco-tag"; t3.textContent = "Best for: " + r.bestFor;
    tags.appendChild(t1); tags.appendChild(t2); tags.appendChild(t3);

    var why = document.createElement("p");
    why.className = "reco-why";
    why.innerHTML = "<strong>Why it matches: </strong>" + escapeHTML(r.why);

    var advice = document.createElement("p");
    advice.className = "reco-style-advice";
    advice.innerHTML = "<strong>Styling advice: </strong>" + escapeHTML(r.advice);

    var scoreWrap = document.createElement("div");
    scoreWrap.className = "reco-score";
    scoreWrap.innerHTML = "Recommendation score " + r.score + "%";
    var bar = document.createElement("div");
    bar.className = "score-bar";
    var fill = document.createElement("div");
    fill.className = "score-fill";
    fill.style.width = r.score + "%";
    bar.appendChild(fill);

    var actions = document.createElement("div");
    actions.className = "reco-actions";
    var shop = document.createElement("button");
    shop.className = "btn btn-primary";
    shop.innerHTML = 'Shop this tie <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
    shop.setAttribute("aria-label", "Shop " + r.name);
    var hint = document.createElement("span");
    hint.className = "form-note";
    hint.textContent = "From " + r.price + " at UK retailers (coming soon)";
    shop.addEventListener("click", function () {
      /* Placeholder for retailer links — wire to affiliate/retailer URLs later */
      window.location.hash = "shop";
    });
    actions.appendChild(shop);
    actions.appendChild(hint);

    body.appendChild(title);
    body.appendChild(tags);
    body.appendChild(why);
    body.appendChild(scoreWrap);
    body.appendChild(bar);
    body.appendChild(advice);
    body.appendChild(actions);

    art.appendChild(badge);
    card.appendChild(art);
    card.appendChild(body);
    grid.appendChild(card);
  });

  /* Trigger reveal animation for the freshly injected cards */
  var revealEls = grid.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }
})();
