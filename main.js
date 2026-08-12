/* ============================================================
   Shoptie — AI Stylist
   Shared site interactions (header, mobile nav, reveals, footer)
   Loaded on every page.
   ============================================================ */
(function () {
  "use strict";

  /* Sticky header elevation on scroll */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Mobile navigation */
  var openBtn = document.querySelector(".nav-toggle");
  var closeBtn = document.querySelector(".nav-close");
  var navLinks = document.querySelector(".nav-links");

  function setMenu(open) {
    if (!navLinks) return;
    navLinks.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (openBtn) openBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (openBtn) openBtn.addEventListener("click", function () { setMenu(true); });
  if (closeBtn) closeBtn.addEventListener("click", function () { setMenu(false); });
  if (navLinks) navLinks.addEventListener("click", function (e) {
    if (e.target.closest("a")) setMenu(false);
  });
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setMenu(false);
  });

  /* Reveal-on-scroll */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* Footer year */
  var yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
