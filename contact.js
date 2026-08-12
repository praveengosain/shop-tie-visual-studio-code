/* ============================================================
   Shoptie — Contact form (client-side demo handling)
   No backend is configured yet, so the form validates input
   and shows a confirmation with a note about next steps.
   ============================================================ */
(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  if (!form) return;

  var success = document.getElementById("form-success");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();
    var message = form.elements.message.value.trim();

    if (!name || !email || !message) {
      alert("Please complete your name, email and message before sending.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    /* Demo mode: we don't send anywhere yet. Store locally for convenience. */
    try {
      localStorage.setItem("shoptie.contact." + Date.now(), JSON.stringify({ name: name, email: email, message: message }));
    } catch (err) { /* ignore storage errors */ }

    form.style.display = "none";
    if (success) success.classList.add("show");
  });
})();