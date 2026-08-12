/* ============================================================
   Shoptie — AI Stylist page (/stylist)
   Upload → preview → analyse (loading) → results
   ============================================================ */
(function () {
  "use strict";

  var ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  var MAX_BYTES = 8 * 1024 * 1024; /* 8 MB */

  var dropzone = document.getElementById("dropzone");
  var fileInput = document.getElementById("image-input");
  var dropError = document.getElementById("dropzone-error");
  var preview = document.getElementById("preview");
  var previewImg = document.getElementById("preview-img");
  var btnAnalyse = document.getElementById("analyse-btn");
  var uploadPanel = document.getElementById("upload-panel");
  var loadingPanel = document.getElementById("loading-panel");

  var currentDataUrl = null;
  var analysing = false;

  if (!dropzone || !fileInput) return;

  function showError(msg) {
    if (!dropError) return;
    dropError.style.display = "block";
    dropError.textContent = msg;
  }
  function clearError() { if (dropError) dropError.style.display = "none"; }

  function readFile(file) {
    clearError();
    if (!file) return;
    if (ALLOWED.indexOf(file.type) === -1) {
      showError("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      showError("That image is too large — please choose one under 8 MB.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      /* Compress so the analysis and results stay within browser storage limits */
      compressImage(e.target.result, function (dataUrl) {
        setImage(dataUrl, file.name);
      });
    };
    reader.onerror = function () { showError("Sorry, we couldn't read that image. Please try another."); };
    reader.readAsDataURL(file);
  }

  /* Downscale very large photos before storing / analysing */
  function compressImage(dataUrl, cb) {
    var img = new Image();
    img.onload = function () {
      var maxDim = 900;
      var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      if (scale === 1) { cb(dataUrl); return; }
      var w = Math.round(img.width * scale);
      var h = Math.round(img.height * scale);
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      try { cb(c.toDataURL("image/jpeg", 0.82)); } catch (err) { cb(dataUrl); }
    };
    img.onerror = function () { cb(dataUrl); };
    img.src = dataUrl;
  }

  function setImage(dataUrl, name) {
    currentDataUrl = dataUrl;
    previewImg.src = dataUrl;
    preview.classList.add("has-image");
    dropzone.style.display = "none";
    btnAnalyse.disabled = false;
    if (fileInput) fileInput.value = "";
  }

  function resetImage() {
    currentDataUrl = null;
    preview.classList.remove("has-image");
    previewImg.removeAttribute("src");
    dropzone.style.display = "";
    btnAnalyse.disabled = true;
    clearError();
  }

  /* File input */
  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) readFile(fileInput.files[0]);
  });

  /* Drag & drop */
  ["dragenter", "dragover"].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      e.preventDefault();
      dropzone.classList.add("is-drag");
    });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) {
      e.preventDefault();
      dropzone.classList.remove("is-drag");
    });
  });
  dropzone.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      readFile(e.dataTransfer.files[0]);
    }
  });

  /* Preview actions */
  var removeBtn = document.getElementById("remove-image");
  var changeBtn = document.getElementById("change-image");
  if (removeBtn) removeBtn.addEventListener("click", function (e) {
    e.preventDefault(); resetImage();
  });
  if (changeBtn) changeBtn.addEventListener("click", function (e) {
    e.preventDefault(); fileInput.click();
  });

  /* Analyse */
  btnAnalyse.addEventListener("click", function (e) {
    e.preventDefault();
    if (!currentDataUrl || analysing) return;
    analysing = true;
    btnAnalyse.disabled = true;
    uploadPanel.style.display = "none";
    loadingPanel.style.display = "block";
    window.scrollTo({ top: loadingPanel.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });

    /* Give the spinner a beat of visibility before the heavy work */
    window.setTimeout(function () {
      ShoptieAI.analyzeOutfit(currentDataUrl)
        .then(function (analysis) {
          var state = { image: currentDataUrl, analysis: analysis };
          try { sessionStorage.setItem("shoptie.result", JSON.stringify(state)); } catch (err) { /* storage full */ }
          window.location.href = "results.html";
        })
        .catch(function (err) {
          analysing = false;
          uploadPanel.style.display = "";
          loadingPanel.style.display = "none";
          btnAnalyse.disabled = false;
          showError((err && err.message) || "We hit a snag analysing that image. Please try again.");
        });
    }, 900);
  });

  /* Optional "use sample" demo helper */
  var sampleBtn = document.getElementById("demo-sample-blue");
  if (sampleBtn) {
    sampleBtn.addEventListener("click", function (e) {
      e.preventDefault();
      /* If a real provider is configured, the demo sample only applies to the demo engine */
      setImage(buildSample(), "demo-outfit.png");
    });
  }

  /* Populate the animated loading tie illustration */
  var tieLoad = document.querySelector(".tie-load");
  if (tieLoad && window.ShoptieTie) {
    tieLoad.innerHTML = ShoptieTie.render("#6d1f2e", "Solid silk", 150, "load");
  }

  /* Arriving with #demo → auto-load the demo outfit and run the analysis */
  if (window.location.hash === "#demo" && sampleBtn) {
    sampleBtn.click();
    window.setTimeout(function () {
      if (currentDataUrl) btnAnalyse.click();
    }, 700);
  }

  /* Client-generated sample outfit (a navy shirt block with tie), so the
     demo works on the stylist page without needing a stock photo file. */
  function buildSample() {
    var c = document.createElement("canvas");
    c.width = 400; c.height = 500;
    var ctx = c.getContext("2d");
    var grad = ctx.createLinearGradient(0, 0, 0, 500);
    grad.addColorStop(0, "#22345c");
    grad.addColorStop(0.7, "#14213d");
    grad.addColorStop(1, "#0d1830");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 500);
    /* shirt placket */
    ctx.fillStyle = "#f2ece1";
    ctx.fillRect(180, 120, 40, 380);
    /* collar */
    ctx.beginPath();
    ctx.moveTo(130, 130); ctx.lineTo(200, 170); ctx.lineTo(270, 130); ctx.lineTo(200, 140);
    ctx.closePath(); ctx.fillStyle = "#f7f2e9"; ctx.fill();
    /* tie */
    ctx.fillStyle = "#6d1f2e";
    ctx.beginPath();
    ctx.moveTo(196, 150); ctx.lineTo(204, 150); ctx.lineTo(216, 400); ctx.lineTo(184, 400);
    ctx.closePath(); ctx.fill();
    return c.toDataURL("image/png");
  }
})();