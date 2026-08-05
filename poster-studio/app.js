/* =========================================================
   폰샵 포스터 스튜디오 — 앱 로직 (Agent A)
   - templates.js 가 제공하는 window.PosterTemplates / window.renderPoster 계약만 사용
   - 상태는 localStorage(ps_store / ps_settings / ps_saved)에 저장
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
   * 0. 상수 & 기본값
   * --------------------------------------------------------- */
  var LS_STORE = "ps_store";
  var LS_SETTINGS = "ps_settings";
  var LS_SAVED = "ps_saved";

  var TEMPLATE_ORDER = [
    "mega-navy", "impact", "soft-purple", "black-glow",
    "pop-purple", "exam-chrome", "premium-black"
  ];

  var BENEFIT_ICONS = ["💾", "🚚", "💙", "🎁", "🔥", "⚡", "✅", "📶", "🛡️", "💰", "⏰", "📦", "🌟", "💡", "🏆"];

  function defaultStore() {
    return {
      name: "대치동 휴대폰 할인매장",
      years: "15",
      phone1: "070.8883.9016",
      phone2: "010.7563.0130",
      address: "강남구 역삼로 443, 1층",
      directions: "선릉역 2번 출구 도보 5분",
      photo: window.DEFAULT_ASSETS.photo,
      map: window.DEFAULT_ASSETS.map,
      visitPromo: "방문만 하셔도! 무료 필름 교체",
      visitPromoSub: "언제든 편하게 방문해주세요!",
      footerItems: [
        { icon: "📱", title: "최신 스마트폰", sub: "최대 할인" },
        { icon: "🎁", title: "사전예약 혜택", sub: "풍성하게!" },
        { icon: "✅", title: "정품 · 안심 개통", sub: "믿을 수 있는 매장" },
        { icon: "🤝", title: "친절한 상담", sub: "15년의 노하우" }
      ]
    };
  }

  function defaultPoster() {
    return {
      templateId: "mega-navy",
      badge: "신제품",
      brandLine: "Galaxy Z",
      title: "Fold8 | Flip8",
      headline: "사전예약 진행중!",
      subline: "비교할 수 없는 압도적 성능",
      discount: { prefix: "최대", amount: "100", unit: "만원", suffix: "할인" },
      period: { label: "사전예약 기간", from: "07.28(화)", to: "08.03(월)" },
      gifts: ["필름 + 케이스 + 고속충전기 증정", "Galaxy Watch 할인 혜택"],
      benefits: [
        { icon: "💾", title: "256GB → 512GB", sub: "업그레이드!" },
        { icon: "🚚", title: "기기", sub: "우선배정!" },
        { icon: "💙", title: "삼성케어+", sub: "서비스!" }
      ],
      deviceImage: null,
      notice: "※ 혜택은 기종·요금제·개통 유형에 따라 상이하며 매장 상황에 따라 변경될 수 있습니다.",
      showStoreBlock: true,
      showFooter: true,
      accent: ""
    };
  }

  function defaultSettings() {
    return {
      google: { apiKey: "", cx: "" },
      github: { token: "", owner: "docssam1", repo: "ad", branch: "main", pagesBase: "https://docssam1.github.io/ad" },
      solapi: { apiKey: "", apiSecret: "", sender: "" }
    };
  }

  /* ---------------------------------------------------------
   * 1. 공통 유틸
   * --------------------------------------------------------- */
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      toast("저장 공간이 부족하거나 저장에 실패했습니다.", true);
    }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function pad2(n) { return String(n).padStart(2, "0"); }

  function nowFilenameStamp() {
    var d = new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + "_" + pad2(d.getHours()) + pad2(d.getMinutes());
  }

  function buildPublishId() {
    var d = new Date();
    return (
      d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
      "-" + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds())
    );
  }

  function randomHex(len) {
    var arr = new Uint8Array(len / 2);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    return Array.prototype.map.call(arr, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  async function hmacSha256Hex(secret, message) {
    var enc = new TextEncoder();
    var key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    var sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
    return Array.prototype.map.call(new Uint8Array(sig), function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("복사되었습니다.");
    } catch (e) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast("복사되었습니다.");
      } catch (e2) {
        toast("복사에 실패했습니다. 직접 선택해 복사해주세요.", true);
      }
    }
  }

  function downloadDataUrl(dataUrl, filename) {
    var a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /* ---------------------------------------------------------
   * 2. 토스트
   * --------------------------------------------------------- */
  function toast(message, isError) {
    var container = document.getElementById("toastContainer");
    if (!container) return;
    var el = document.createElement("div");
    el.className = "toast" + (isError ? " toast-error" : "");
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .3s";
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 320);
    }, 2600);
  }

  /* ---------------------------------------------------------
   * 3. 전역 상태
   * --------------------------------------------------------- */
  var state = {
    store: loadJSON(LS_STORE, null) || defaultStore(),
    settings: mergeSettings(loadJSON(LS_SETTINGS, null)),
    saved: loadJSON(LS_SAVED, []) || [],
    poster: defaultPoster(),
    currentSavedId: null,
    lastPublishLink: null
  };
  // store가 최초 실행이라 없었다면 즉시 기본값을 저장해둔다.
  if (!loadJSON(LS_STORE, null)) saveJSON(LS_STORE, state.store);

  function mergeSettings(saved) {
    var d = defaultSettings();
    if (!saved) return d;
    return {
      google: Object.assign({}, d.google, saved.google),
      github: Object.assign({}, d.github, saved.github),
      solapi: Object.assign({}, d.solapi, saved.solapi)
    };
  }

  /* ---------------------------------------------------------
   * 4. DOM 캐시
   * --------------------------------------------------------- */
  var $ = function (id) { return document.getElementById(id); };

  var els = {};

  function cacheEls() {
    [
      "templateList", "recommendBtn", "recommendPanel", "recommendList", "recommendCloseBtn",
      "f-badge", "f-brandLine", "f-title", "f-headline", "f-subline",
      "f-disc-prefix", "f-disc-amount", "f-disc-unit", "f-disc-suffix",
      "f-period-label", "f-period-from", "f-period-to",
      "giftInput", "giftList", "benefitList", "addBenefitBtn",
      "deviceThumb", "deviceThumbEmpty", "searchImageBtn", "uploadImageBtn", "fileImageInput", "clearImageBtn",
      "f-notice", "f-showStore", "f-showFooter", "f-accent", "accentClearBtn",
      "previewWrap", "previewScaler", "posterMount",
      "btnPng", "btnPdf", "btnPrint", "btnSaveLib", "btnPublish", "btnSms",
      "s-name", "s-years", "s-phone1", "s-phone2", "s-address", "s-directions",
      "s-visitPromo", "s-visitPromoSub", "s-photo-file", "s-photo-preview", "s-map-file", "s-map-preview",
      "footerItemsGrid", "storeSaveBtn", "storeResetBtn",
      "savedList", "savedEmptyHint",
      "g-apiKey", "g-cx", "gh-token", "gh-owner", "gh-repo", "gh-branch", "gh-pagesBase",
      "sol-apiKey", "sol-apiSecret", "sol-sender", "settingsSaveBtn",
      "modalImageSearch", "imgSearchQuery", "imgSearchBtn", "imgSearchStatus", "imgSearchResults",
      "modalPublish", "publishStatus", "publishResult", "publishLinkText", "publishCopyBtn", "publishQr",
      "modalSms", "smsText", "smsCopyBtn", "smsAppLink", "solapiSection", "solapiRecipients", "solapiSendBtn", "solapiStatus", "solapiHint"
    ].forEach(function (id) { els[id] = $(id); });
  }

  /* ---------------------------------------------------------
   * 5. 탭 전환
   * --------------------------------------------------------- */
  function initTabs() {
    var btns = document.querySelectorAll(".tab-btn");
    btns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        openTab(btn.getAttribute("data-tab"));
      });
    });
  }

  function openTab(name) {
    document.querySelectorAll(".tab-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === name);
    });
    document.querySelectorAll(".tab-panel").forEach(function (p) {
      p.classList.toggle("active", p.getAttribute("data-panel") === name);
    });
    if (name === "make") {
      requestAnimationFrame(fitPreviewScale);
    } else if (name === "saved") {
      renderSavedList();
    }
  }

  /* ---------------------------------------------------------
   * 6. 템플릿 카드 & 미리보기
   * --------------------------------------------------------- */
  function renderTemplateCards() {
    var lib = window.PosterTemplates || {};
    var ids = TEMPLATE_ORDER.filter(function (id) { return lib[id]; });
    if (ids.length === 0) ids = Object.keys(lib);
    els.templateList.innerHTML = "";
    ids.forEach(function (id) {
      var t = lib[id];
      var card = document.createElement("div");
      card.className = "tpl-card" + (state.poster.templateId === id ? " active" : "");
      card.setAttribute("data-tpl-id", id);
      card.innerHTML =
        '<div class="tpl-swatch" style="background:' + esc(t.accent || "#7c3aed") + '"></div>' +
        '<div class="tpl-name">' + esc(t.name || id) + "</div>" +
        '<div class="tpl-desc">' + esc(t.desc || "") + "</div>";
      card.addEventListener("click", function () {
        state.poster.templateId = id;
        renderTemplateCards();
        updatePreview();
      });
      els.templateList.appendChild(card);
    });
  }

  function updatePreview() {
    if (typeof window.renderPoster === "function") {
      try {
        window.renderPoster(state.poster, state.store, els.posterMount);
      } catch (e) {
        console.error("renderPoster 오류:", e);
        els.posterMount.innerHTML = '<div style="padding:24px;color:#900;background:#fff;">포스터 렌더링 중 오류가 발생했습니다.</div>';
      }
    } else {
      els.posterMount.innerHTML = '<div style="padding:24px;color:#900;background:#fff;">templates.js가 로드되지 않았습니다.</div>';
    }
  }

  function fitPreviewScale() {
    if (!els.previewWrap || !els.previewScaler) return;
    var w = els.previewWrap.clientWidth;
    var h = els.previewWrap.clientHeight;
    if (!w || !h) return;
    var scale = Math.min(w / 794, h / 1123);
    // transform은 레이아웃 박스 크기를 바꾸지 않으므로, 포스터 자체(posterMount)에 스케일을
    // 적용하고 래퍼(previewScaler)는 스케일된 실제 크기로 지정해 가운데 정렬이 깨지지 않게 한다.
    els.posterMount.style.transform = "scale(" + scale + ")";
    els.previewScaler.style.width = (794 * scale) + "px";
    els.previewScaler.style.height = (1123 * scale) + "px";
  }

  /* ---------------------------------------------------------
   * 7. 디자인 추천
   * --------------------------------------------------------- */
  function recommend(poster) {
    var text = ((poster.title || "") + " " + (poster.brandLine || "")).toLowerCase();
    var result = [];

    if (/폴드|플립|fold|flip|galaxy\s*z/.test(text)) {
      result.push({
        templates: ["soft-purple", "mega-navy"],
        badge: "신제품",
        headline: "사전예약 진행중!",
        note: "폴더블 신제품에는 부드러운 톤의 소프트 퍼플 또는 정보량이 많은 메가세일 네이비를 추천합니다."
      });
    }
    if (/아이폰|iphone|\bpro\b|프로/.test(text)) {
      result.push({
        templates: ["premium-black", "black-glow"],
        headline: "지금 바로 경험하세요",
        note: "아이폰/프로 라인업에는 고급스러운 프리미엄 블랙 또는 블랙 글로우를 추천합니다."
      });
    }
    if (/갤럭시\s*s|울트라/.test(text)) {
      result.push({
        templates: ["mega-navy", "impact"],
        note: "갤럭시 S 시리즈에는 메가세일 네이비 또는 임팩트 템플릿을 추천합니다."
      });
    }

    var month = new Date().getMonth() + 1;
    if (month === 11) {
      result.push({ templates: ["exam-chrome"], badge: "수험표 이벤트", note: "11월입니다. 수험표 이벤트 컨셉의 수험 크롬 템플릿을 제안합니다." });
    } else if (month >= 2 && month <= 3) {
      result.push({ templates: ["pop-purple"], headline: "신학기, 지금 바꾸기 좋은 타이밍!", note: "신학기 시즌입니다. 팝 퍼플 템플릿과 신학기 문구를 제안합니다." });
    } else if (month >= 7 && month <= 8) {
      result.push({ note: "사전예약 시즌입니다. 사전예약 관련 문구를 강조해보세요." });
    }

    return result;
  }

  function showRecommend() {
    var lib = window.PosterTemplates || {};
    var list = recommend(state.poster);
    els.recommendList.innerHTML = "";
    if (list.length === 0) {
      els.recommendList.innerHTML = '<div class="recommend-item-text">현재 입력 내용에 특별히 추천할 디자인이 없습니다. 제품명을 입력해보세요.</div>';
    } else {
      list.forEach(function (sugg) {
        var row = document.createElement("div");
        row.className = "recommend-item";
        var tplNames = (sugg.templates || []).map(function (id) { return (lib[id] && lib[id].name) || id; }).join(", ");
        var textParts = [];
        if (tplNames) textParts.push("<b>" + esc(tplNames) + "</b>");
        textParts.push(esc(sugg.note || ""));
        var textEl = document.createElement("div");
        textEl.className = "recommend-item-text";
        textEl.innerHTML = textParts.join(" — ");
        row.appendChild(textEl);
        if (sugg.templates && sugg.templates.length) {
          var applyBtn = document.createElement("button");
          applyBtn.className = "btn btn-accent btn-sm";
          applyBtn.type = "button";
          applyBtn.textContent = "적용";
          applyBtn.addEventListener("click", function () { applyRecommend(sugg); });
          row.appendChild(applyBtn);
        }
        els.recommendList.appendChild(row);
      });
    }
    els.recommendPanel.classList.remove("hidden");
  }

  function applyRecommend(sugg) {
    if (sugg.templates && sugg.templates[0]) state.poster.templateId = sugg.templates[0];
    if (sugg.badge) state.poster.badge = sugg.badge;
    if (sugg.headline) state.poster.headline = sugg.headline;
    syncFormFromPoster();
    renderTemplateCards();
    updatePreview();
    els.recommendPanel.classList.add("hidden");
    toast("추천 디자인을 적용했습니다.");
  }

  /* ---------------------------------------------------------
   * 8. 포스터 입력 폼 바인딩
   * --------------------------------------------------------- */
  function syncFormFromPoster() {
    var p = state.poster;
    els["f-badge"].value = p.badge || "";
    els["f-brandLine"].value = p.brandLine || "";
    els["f-title"].value = p.title || "";
    els["f-headline"].value = p.headline || "";
    els["f-subline"].value = p.subline || "";
    els["f-disc-prefix"].value = p.discount.prefix || "";
    els["f-disc-amount"].value = p.discount.amount || "";
    els["f-disc-unit"].value = p.discount.unit || "";
    els["f-disc-suffix"].value = p.discount.suffix || "";
    els["f-period-label"].value = p.period.label || "";
    els["f-period-from"].value = p.period.from || "";
    els["f-period-to"].value = p.period.to || "";
    els["f-notice"].value = p.notice || "";
    els["f-showStore"].checked = !!p.showStoreBlock;
    els["f-showFooter"].checked = !!p.showFooter;
    els["f-accent"].value = p.accent || "#7c3aed";
    renderGiftChips();
    renderBenefitRows();
    renderDeviceThumb();
    renderTemplateCards();
  }

  function bindPosterForm() {
    function bindText(el, path) {
      el.addEventListener("input", function () {
        setDeep(state.poster, path, el.value);
        updatePreview();
      });
    }
    bindText(els["f-badge"], "badge");
    bindText(els["f-brandLine"], "brandLine");
    bindText(els["f-title"], "title");
    bindText(els["f-headline"], "headline");
    bindText(els["f-subline"], "subline");
    bindText(els["f-disc-prefix"], "discount.prefix");
    bindText(els["f-disc-amount"], "discount.amount");
    bindText(els["f-disc-unit"], "discount.unit");
    bindText(els["f-disc-suffix"], "discount.suffix");
    bindText(els["f-period-label"], "period.label");
    bindText(els["f-period-from"], "period.from");
    bindText(els["f-period-to"], "period.to");
    bindText(els["f-notice"], "notice");

    els["f-showStore"].addEventListener("change", function () {
      state.poster.showStoreBlock = els["f-showStore"].checked;
      updatePreview();
    });
    els["f-showFooter"].addEventListener("change", function () {
      state.poster.showFooter = els["f-showFooter"].checked;
      updatePreview();
    });
    els["f-accent"].addEventListener("input", function () {
      state.poster.accent = els["f-accent"].value;
      updatePreview();
    });
    els.accentClearBtn.addEventListener("click", function () {
      state.poster.accent = "";
      updatePreview();
      toast("템플릿 기본 강조색을 사용합니다.");
    });

    // 사은품
    els.giftInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      var v = els.giftInput.value.trim();
      if (!v) return;
      if (state.poster.gifts.length >= 5) { toast("사은품은 최대 5개까지 가능합니다.", true); return; }
      state.poster.gifts.push(v);
      els.giftInput.value = "";
      renderGiftChips();
      updatePreview();
    });

    // 혜택 추가
    els.addBenefitBtn.addEventListener("click", function () {
      if (state.poster.benefits.length >= 5) { toast("혜택 카드는 최대 5개까지 가능합니다.", true); return; }
      state.poster.benefits.push({ icon: BENEFIT_ICONS[0], title: "", sub: "" });
      renderBenefitRows();
      updatePreview();
    });

    // 기종 이미지
    els.searchImageBtn.addEventListener("click", openImageSearchModal);
    els.uploadImageBtn.addEventListener("click", function () { els.fileImageInput.click(); });
    els.fileImageInput.addEventListener("change", async function () {
      var file = els.fileImageInput.files && els.fileImageInput.files[0];
      if (!file) return;
      try {
        var dataUrl = await fileToDataUrl(file);
        state.poster.deviceImage = dataUrl;
        renderDeviceThumb();
        updatePreview();
        toast("이미지를 적용했습니다.");
      } catch (e) {
        toast("이미지를 불러오지 못했습니다.", true);
      }
      els.fileImageInput.value = "";
    });
    els.clearImageBtn.addEventListener("click", function () {
      state.poster.deviceImage = null;
      renderDeviceThumb();
      updatePreview();
    });
  }

  function setDeep(obj, path, value) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = value;
  }

  function renderGiftChips() {
    els.giftList.innerHTML = "";
    state.poster.gifts.forEach(function (g, i) {
      var chip = document.createElement("span");
      chip.className = "chip";
      chip.innerHTML = '<span>' + esc(g) + '</span>';
      var rm = document.createElement("button");
      rm.type = "button";
      rm.textContent = "×";
      rm.addEventListener("click", function () {
        state.poster.gifts.splice(i, 1);
        renderGiftChips();
        updatePreview();
      });
      chip.appendChild(rm);
      els.giftList.appendChild(chip);
    });
  }

  function renderBenefitRows() {
    els.benefitList.innerHTML = "";
    state.poster.benefits.forEach(function (b, i) {
      var row = document.createElement("div");
      row.className = "benefit-row";

      var sel = document.createElement("select");
      BENEFIT_ICONS.forEach(function (icon) {
        var opt = document.createElement("option");
        opt.value = icon;
        opt.textContent = icon;
        if (b.icon === icon) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", function () { b.icon = sel.value; updatePreview(); });

      var titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.placeholder = "제목";
      titleInput.value = b.title || "";
      titleInput.addEventListener("input", function () { b.title = titleInput.value; updatePreview(); });

      var subInput = document.createElement("input");
      subInput.type = "text";
      subInput.placeholder = "강조 문구";
      subInput.value = b.sub || "";
      subInput.addEventListener("input", function () { b.sub = subInput.value; updatePreview(); });

      var rmBtn = document.createElement("button");
      rmBtn.type = "button";
      rmBtn.className = "row-remove-btn";
      rmBtn.textContent = "✕";
      rmBtn.addEventListener("click", function () {
        state.poster.benefits.splice(i, 1);
        renderBenefitRows();
        updatePreview();
      });

      row.appendChild(sel);
      row.appendChild(titleInput);
      row.appendChild(subInput);
      row.appendChild(rmBtn);
      els.benefitList.appendChild(row);
    });
  }

  function renderDeviceThumb() {
    if (state.poster.deviceImage) {
      els.deviceThumb.src = state.poster.deviceImage;
      els.deviceThumb.classList.remove("hidden");
      els.deviceThumbEmpty.classList.add("hidden");
    } else {
      els.deviceThumb.classList.add("hidden");
      els.deviceThumbEmpty.classList.remove("hidden");
    }
  }

  /* ---------------------------------------------------------
   * 9. 구글 이미지 검색 모달
   * --------------------------------------------------------- */
  function openImageSearchModal() {
    els.imgSearchQuery.value = (state.poster.title || "") + " 제품 이미지 png";
    els.imgSearchResults.innerHTML = "";
    var g = state.settings.google;
    if (!g.apiKey || !g.cx) {
      els.imgSearchStatus.textContent = "설정 탭에서 Google Custom Search API 키와 검색엔진 ID(cx)를 입력해주세요. 대신 [파일 업로드] 버튼으로 이미지를 직접 올릴 수 있습니다.";
    } else {
      els.imgSearchStatus.textContent = "검색어를 확인하고 [검색] 버튼을 눌러주세요.";
    }
    openModal("modalImageSearch");
  }

  async function performImageSearch() {
    var g = state.settings.google;
    if (!g.apiKey || !g.cx) {
      els.imgSearchStatus.textContent = "설정 탭에서 Google Custom Search API 키와 검색엔진 ID(cx)를 먼저 입력해주세요.";
      return;
    }
    var q = els.imgSearchQuery.value.trim();
    if (!q) { toast("검색어를 입력하세요.", true); return; }
    els.imgSearchStatus.textContent = "검색 중...";
    els.imgSearchResults.innerHTML = "";
    try {
      var url = "https://www.googleapis.com/customsearch/v1?key=" + encodeURIComponent(g.apiKey) +
        "&cx=" + encodeURIComponent(g.cx) + "&q=" + encodeURIComponent(q) +
        "&searchType=image&num=10&imgSize=xlarge";
      var res = await fetch(url);
      if (!res.ok) {
        var errData = await res.json().catch(function () { return {}; });
        throw new Error((errData.error && errData.error.message) || ("HTTP " + res.status));
      }
      var data = await res.json();
      var items = data.items || [];
      if (items.length === 0) {
        els.imgSearchStatus.textContent = "검색 결과가 없습니다. 다른 검색어를 시도해보세요.";
        return;
      }
      els.imgSearchStatus.textContent = "이미지를 클릭하면 기종 이미지로 적용됩니다.";
      items.forEach(function (item) {
        var img = document.createElement("img");
        img.src = (item.image && item.image.thumbnailLink) || item.link;
        img.loading = "lazy";
        img.addEventListener("click", function () { applySearchImage(item.link); });
        els.imgSearchResults.appendChild(img);
      });
    } catch (e) {
      els.imgSearchStatus.textContent = "검색에 실패했습니다: " + e.message + " (API 키/사용량/CORS를 확인하세요)";
    }
  }

  async function applySearchImage(originalUrl) {
    els.imgSearchStatus.textContent = "이미지를 가져오는 중...";
    try {
      var dataUrl = await fetchImageAsDataUrl(originalUrl);
      state.poster.deviceImage = dataUrl;
      renderDeviceThumb();
      updatePreview();
      closeModal("modalImageSearch");
      toast("기종 이미지를 적용했습니다.");
    } catch (e) {
      els.imgSearchStatus.textContent = "이미지를 가져오지 못했습니다. 다른 이미지를 시도하거나 파일 업로드를 이용해주세요.";
    }
  }

  async function fetchImageAsDataUrl(url) {
    try {
      var res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      var blob = await res.blob();
      return await blobToDataUrl(blob);
    } catch (e) {
      // 직접 fetch 실패 시 프록시로 재시도
      var proxied = "https://images.weserv.nl/?url=" + encodeURIComponent(url.replace(/^https?:\/\//, ""));
      var res2 = await fetch(proxied);
      if (!res2.ok) throw new Error("proxy HTTP " + res2.status);
      var blob2 = await res2.blob();
      return await blobToDataUrl(blob2);
    }
  }

  /* ---------------------------------------------------------
   * 10. 내보내기 (PNG / PDF / 인쇄)
   * --------------------------------------------------------- */
  function withUnscaledCapture(fn) {
    var prevTransform = els.posterMount.style.transform;
    els.posterMount.style.transform = "none";
    return Promise.resolve()
      .then(fn)
      .finally(function () {
        els.posterMount.style.transform = prevTransform;
      });
  }

  async function captureCanvas(scale, bg) {
    if (typeof window.html2canvas !== "function") {
      throw new Error("html2canvas 라이브러리를 불러오지 못했습니다.");
    }
    return withUnscaledCapture(function () {
      return window.html2canvas(els.posterMount, { scale: scale, backgroundColor: bg, useCORS: true, allowTaint: true });
    });
  }

  async function exportPng() {
    try {
      var canvas = await captureCanvas(3, null);
      downloadDataUrl(canvas.toDataURL("image/png"), "poster_" + nowFilenameStamp() + ".png");
      toast("PNG로 저장했습니다.");
    } catch (e) {
      toast("PNG 저장에 실패했습니다: " + e.message, true);
    }
  }

  async function exportPdf() {
    try {
      if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("jsPDF 라이브러리를 불러오지 못했습니다.");
      var canvas = await captureCanvas(3, "#ffffff");
      var imgData = canvas.toDataURL("image/png");
      var pdf = new window.jspdf.jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      pdf.addImage(imgData, "PNG", 0, 0, 210, 297, "", "FAST");
      pdf.save("poster_" + nowFilenameStamp() + ".pdf");
      toast("PDF로 저장했습니다.");
    } catch (e) {
      toast("PDF 저장에 실패했습니다: " + e.message, true);
    }
  }

  function printPoster() {
    var w = window.open("", "_blank");
    if (!w) { toast("팝업이 차단되었습니다. 팝업을 허용해주세요.", true); return; }
    var posterHtml = els.posterMount.innerHTML;
    var doc = "<!DOCTYPE html><html lang=\"ko\"><head><meta charset=\"UTF-8\">" +
      "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css\">" +
      "<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=Gugi&display=swap\">" +
      "<link rel=\"stylesheet\" href=\"poster.css\">" +
      "<style>@page{size:A4;margin:0} html,body{margin:0;padding:0;} .poster-page{width:794px;height:1123px;overflow:hidden;position:relative;}</style>" +
      "</head><body><div class=\"poster-page\">" + posterHtml + "</div></body></html>";
    w.document.open();
    w.document.write(doc);
    w.document.close();
    w.onload = function () {
      setTimeout(function () { w.focus(); w.print(); }, 400);
    };
  }

  /* ---------------------------------------------------------
   * 11. 보관함
   * --------------------------------------------------------- */
  async function saveCurrentToLibrary() {
    try {
      var canvas = await captureCanvas(0.35, "#ffffff");
      var thumb = canvas.toDataURL("image/jpeg", 0.75);
      var id = state.currentSavedId && state.saved.some(function (s) { return s.id === state.currentSavedId; })
        ? state.currentSavedId
        : "lib-" + Date.now();
      var entry = {
        id: id,
        savedAt: new Date().toISOString(),
        poster: clone(state.poster),
        thumbnail: thumb,
        publishLink: state.lastPublishLink || null
      };
      var idx = state.saved.findIndex(function (s) { return s.id === id; });
      if (idx >= 0) state.saved[idx] = entry; else state.saved.unshift(entry);
      state.currentSavedId = id;
      saveJSON(LS_SAVED, state.saved);
      renderSavedList();
      toast("보관함에 저장했습니다.");
    } catch (e) {
      toast("보관함 저장에 실패했습니다: " + e.message, true);
    }
  }

  function renderSavedList() {
    els.savedList.innerHTML = "";
    if (!state.saved.length) {
      els.savedEmptyHint.classList.remove("hidden");
      return;
    }
    els.savedEmptyHint.classList.add("hidden");
    state.saved.forEach(function (entry) {
      var card = document.createElement("div");
      card.className = "saved-card";
      var d = new Date(entry.savedAt);
      var dateStr = d.getFullYear() + "." + pad2(d.getMonth() + 1) + "." + pad2(d.getDate()) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());

      var thumbWrap = document.createElement("div");
      thumbWrap.className = "saved-thumb-wrap";
      var img = document.createElement("img");
      img.src = entry.thumbnail;
      img.alt = entry.poster.title || "포스터";
      thumbWrap.appendChild(img);

      var body = document.createElement("div");
      body.className = "saved-card-body";
      body.innerHTML =
        '<div class="saved-card-title">' + esc(entry.poster.title || "(제목 없음)") + " · " + esc(entry.poster.headline || "") + '</div>' +
        '<div class="saved-card-meta">' + esc(dateStr) + (entry.publishLink ? " · 게시됨" : "") + '</div>';

      var btnRow = document.createElement("div");
      btnRow.className = "saved-card-btns";

      var loadBtn = document.createElement("button");
      loadBtn.className = "btn btn-ghost btn-sm";
      loadBtn.type = "button";
      loadBtn.textContent = "불러오기";
      loadBtn.addEventListener("click", function () { loadSavedEntry(entry.id); });

      var dupBtn = document.createElement("button");
      dupBtn.className = "btn btn-ghost btn-sm";
      dupBtn.type = "button";
      dupBtn.textContent = "복제";
      dupBtn.addEventListener("click", function () { duplicateSavedEntry(entry.id); });

      var delBtn = document.createElement("button");
      delBtn.className = "btn btn-ghost btn-sm btn-danger";
      delBtn.type = "button";
      delBtn.textContent = "삭제";
      delBtn.addEventListener("click", function () { deleteSavedEntry(entry.id); });

      var linkBtn = document.createElement("button");
      linkBtn.className = "btn btn-ghost btn-sm";
      linkBtn.type = "button";
      linkBtn.textContent = "링크 열기";
      if (!entry.publishLink) linkBtn.disabled = true;
      linkBtn.addEventListener("click", function () {
        if (entry.publishLink) window.open(entry.publishLink, "_blank");
      });

      btnRow.appendChild(loadBtn);
      btnRow.appendChild(dupBtn);
      btnRow.appendChild(delBtn);
      btnRow.appendChild(linkBtn);
      body.appendChild(btnRow);

      card.appendChild(thumbWrap);
      card.appendChild(body);
      els.savedList.appendChild(card);
    });
  }

  function loadSavedEntry(id) {
    var entry = state.saved.find(function (s) { return s.id === id; });
    if (!entry) return;
    state.poster = clone(entry.poster);
    state.currentSavedId = entry.id;
    state.lastPublishLink = entry.publishLink || null;
    openTab("make");
    syncFormFromPoster();
    updatePreview();
    requestAnimationFrame(fitPreviewScale);
    toast("포스터를 불러왔습니다.");
  }

  function duplicateSavedEntry(id) {
    var entry = state.saved.find(function (s) { return s.id === id; });
    if (!entry) return;
    var copy = {
      id: "lib-" + Date.now(),
      savedAt: new Date().toISOString(),
      poster: clone(entry.poster),
      thumbnail: entry.thumbnail,
      publishLink: null
    };
    state.saved.unshift(copy);
    saveJSON(LS_SAVED, state.saved);
    renderSavedList();
    toast("복제했습니다.");
  }

  function deleteSavedEntry(id) {
    if (!confirm("이 포스터를 보관함에서 삭제할까요?")) return;
    state.saved = state.saved.filter(function (s) { return s.id !== id; });
    saveJSON(LS_SAVED, state.saved);
    renderSavedList();
    toast("삭제했습니다.");
  }

  /* ---------------------------------------------------------
   * 12. GitHub 게시 (링크 만들기)
   * --------------------------------------------------------- */
  async function publishToGithub() {
    var gh = state.settings.github;
    if (!gh.token) {
      toast("설정 탭에서 GitHub 토큰을 먼저 입력해주세요.", true);
      openTab("settings");
      return;
    }
    if (!gh.owner || !gh.repo) {
      toast("설정 탭에서 GitHub owner/repo를 확인해주세요.", true);
      openTab("settings");
      return;
    }
    els.publishResult.classList.add("hidden");
    els.publishStatus.textContent = "PNG 이미지를 만드는 중...";
    openModal("modalPublish");

    try {
      var id = buildPublishId();
      var canvas = await captureCanvas(2, "#ffffff");
      var pngDataUrl = canvas.toDataURL("image/png");
      var pngBase64 = pngDataUrl.split(",")[1];

      els.publishStatus.textContent = "포스터 이미지를 업로드하는 중...";
      await githubPutFile(gh, "posters/" + id + "/poster.png", pngBase64, "poster: " + (state.poster.title || id));

      els.publishStatus.textContent = "고객용 페이지를 만드는 중...";
      var customerHtml = buildCustomerHtml(state.poster, state.store, id);
      await githubPutFile(gh, "posters/" + id + "/index.html", utf8ToBase64(customerHtml), "poster: " + (state.poster.title || id));

      var link = gh.pagesBase.replace(/\/$/, "") + "/posters/" + id + "/";
      state.lastPublishLink = link;

      els.publishStatus.textContent = "게시가 완료되었습니다!";
      els.publishLinkText.value = link;
      els.publishResult.classList.remove("hidden");
      els.publishQr.innerHTML = "";
      if (window.QRCode) {
        new window.QRCode(els.publishQr, { text: link, width: 160, height: 160 });
      }

      await upsertSavedEntryWithLink(link, canvas);
      toast("포스터를 게시했습니다.");
    } catch (err) {
      handlePublishError(err);
    }
  }

  async function githubPutFile(gh, path, base64Content, message) {
    var encodedPath = path.split("/").map(encodeURIComponent).join("/");
    var url = "https://api.github.com/repos/" + gh.owner + "/" + gh.repo + "/contents/" + encodedPath;
    var res = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": "token " + gh.token,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: message, content: base64Content, branch: gh.branch || "main" })
    });
    if (!res.ok) {
      var body = await res.json().catch(function () { return {}; });
      var e = new Error(body.message || res.statusText || ("HTTP " + res.status));
      e.status = res.status;
      throw e;
    }
    return res.json();
  }

  function handlePublishError(err) {
    var msg;
    if (err && (err.status === 401 || err.status === 404)) {
      msg = "토큰 권한 오류입니다. fine-grained PAT를 발급하고 대상 저장소에 Contents 읽기/쓰기 권한을 부여했는지 확인해주세요.";
    } else if (err && err.message) {
      msg = "게시에 실패했습니다: " + err.message;
    } else {
      msg = "게시 중 알 수 없는 오류가 발생했습니다.";
    }
    els.publishStatus.textContent = msg;
    toast(msg, true);
  }

  async function upsertSavedEntryWithLink(link, canvas) {
    var thumb;
    try {
      thumb = canvas.toDataURL("image/jpeg", 0.6);
    } catch (e) {
      thumb = null;
    }
    var id = state.currentSavedId && state.saved.some(function (s) { return s.id === state.currentSavedId; })
      ? state.currentSavedId
      : "lib-" + Date.now();
    var idx = state.saved.findIndex(function (s) { return s.id === id; });
    var entry = idx >= 0 ? state.saved[idx] : {
      id: id, savedAt: new Date().toISOString(), poster: clone(state.poster), thumbnail: thumb
    };
    entry.publishLink = link;
    if (thumb) entry.thumbnail = thumb;
    entry.poster = clone(state.poster);
    if (idx >= 0) state.saved[idx] = entry; else state.saved.unshift(entry);
    state.currentSavedId = id;
    saveJSON(LS_SAVED, state.saved);
    renderSavedList();
  }

  function buildCustomerHtml(poster, store, id) {
    var kakaoUrl = "https://map.kakao.com/link/search/" + encodeURIComponent(store.address || "");
    var telHref = "tel:" + (store.phone1 || store.phone2 || "").replace(/[^0-9+]/g, "");
    var smsHref = "sms:" + (store.phone2 || store.phone1 || "").replace(/[^0-9+]/g, "");
    return (
      '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      "<title>" + esc(poster.title || store.name) + " | " + esc(store.name) + "</title>" +
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">' +
      "<style>" +
      "*{box-sizing:border-box;} body{margin:0;background:#0b0e1f;color:#f3f4fb;font-family:'Pretendard Variable',sans-serif;padding-bottom:40px;}" +
      ".hero{width:100%;max-width:560px;margin:0 auto;display:block;}" +
      ".wrap{max-width:560px;margin:0 auto;padding:16px;}" +
      ".btns{display:flex;flex-direction:column;gap:10px;margin-top:16px;}" +
      ".btn{display:block;text-align:center;padding:16px;border-radius:12px;font-weight:800;font-size:16px;text-decoration:none;color:#fff;background:#1f2450;border:1px solid #2c3266;}" +
      ".btn.accent{background:linear-gradient(90deg,#6d28d9,#8b5cf6);}" +
      ".info{margin-top:24px;padding:16px;border-radius:12px;background:#121635;border:1px solid #2c3266;line-height:1.8;}" +
      ".info b{color:#a78bfa;}" +
      ".promo{margin-top:16px;padding:14px;border-radius:12px;background:#facc15;color:#111;font-weight:800;text-align:center;}" +
      "</style></head><body>" +
      '<img class="hero" src="poster.png" alt="' + esc(poster.title || "포스터") + '">' +
      '<div class="wrap">' +
      '<div class="btns">' +
      '<a class="btn accent" href="' + telHref + '">📞 전화하기</a>' +
      '<a class="btn" href="' + smsHref + '">💬 문자문의</a>' +
      '<a class="btn" href="' + kakaoUrl + '" target="_blank" rel="noopener">🗺 길찾기</a>' +
      "</div>" +
      '<div class="promo">' + esc(store.visitPromo || "") + "</div>" +
      '<div class="info">' +
      "<b>" + esc(store.name) + "</b><br>" +
      esc(store.address || "") + "<br>" +
      esc(store.directions || "") + "<br>" +
      "☎ " + esc(store.phone1 || "") + (store.phone2 ? " / " + esc(store.phone2) : "") +
      "</div>" +
      "</div></body></html>"
    );
  }

  /* ---------------------------------------------------------
   * 13. 문자 보내기 모달
   * --------------------------------------------------------- */
  function buildSmsText() {
    var p = state.poster, s = state.store;
    var discSummary = (p.discount && p.discount.amount)
      ? (p.discount.prefix + " " + p.discount.amount + p.discount.unit + " " + p.discount.suffix).trim()
      : "";
    var link = state.lastPublishLink || "(먼저 [🌐 링크 만들기]로 게시해주세요)";
    var lines = [
      "[" + s.name + "] " + p.title + " " + p.headline,
      discSummary,
      (p.gifts && p.gifts.length) ? "사은품: " + p.gifts.join(", ") : "",
      "▶ 자세히 보기: " + link,
      "☎ " + s.phone2,
      s.visitPromo
    ].filter(Boolean);
    return lines.join("\n");
  }

  function openSmsModal() {
    els.smsText.value = buildSmsText();
    updateSmsAppLink();
    var sol = state.settings.solapi;
    if (sol.apiKey && sol.apiSecret && sol.sender) {
      els.solapiSection.classList.remove("hidden");
      els.solapiHint.classList.add("hidden");
      els.solapiStatus.textContent = "";
    } else {
      els.solapiSection.classList.add("hidden");
      els.solapiHint.classList.remove("hidden");
    }
    openModal("modalSms");
  }

  function updateSmsAppLink() {
    els.smsAppLink.setAttribute("href", "sms:?body=" + encodeURIComponent(els.smsText.value));
  }

  async function sendSolapiBulk() {
    var sol = state.settings.solapi;
    var recipients = els.solapiRecipients.value.split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!recipients.length) { toast("수신번호를 입력해주세요.", true); return; }
    els.solapiStatus.textContent = "발송 준비 중...";
    try {
      var date = new Date().toISOString();
      var salt = randomHex(32);
      var signature = await hmacSha256Hex(sol.apiSecret, date + salt);
      var auth = "HMAC-SHA256 apiKey=" + sol.apiKey + ", date=" + date + ", salt=" + salt + ", signature=" + signature;
      var text = els.smsText.value;
      var body = {
        messages: recipients.map(function (to) { return { to: to, from: sol.sender, text: text }; })
      };
      var res = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
        method: "POST",
        headers: { "Authorization": auth, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      els.solapiStatus.textContent = "발송 요청을 완료했습니다. (" + recipients.length + "건)";
      toast("문자 발송 요청을 보냈습니다.");
    } catch (e) {
      els.solapiStatus.textContent = "브라우저 직접 발송이 차단되었습니다 — 문구 복사 후 솔라피/알리고 웹에서 발송하세요.";
    }
  }

  /* ---------------------------------------------------------
   * 14. 모달 공통
   * --------------------------------------------------------- */
  function openModal(id) { $(id).classList.remove("hidden"); }
  function closeModal(id) { $(id).classList.add("hidden"); }

  function bindModals() {
    document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
      btn.addEventListener("click", function () { closeModal(btn.getAttribute("data-close-modal")); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal:not(.hidden)").forEach(function (m) { m.classList.add("hidden"); });
      }
    });
  }

  /* ---------------------------------------------------------
   * 15. 매장 정보 탭
   * --------------------------------------------------------- */
  var pendingStoreImages = {};

  function syncStoreForm() {
    var s = state.store;
    els["s-name"].value = s.name || "";
    els["s-years"].value = s.years || "";
    els["s-phone1"].value = s.phone1 || "";
    els["s-phone2"].value = s.phone2 || "";
    els["s-address"].value = s.address || "";
    els["s-directions"].value = s.directions || "";
    els["s-visitPromo"].value = s.visitPromo || "";
    els["s-visitPromoSub"].value = s.visitPromoSub || "";
    els["s-photo-preview"].src = s.photo || "";
    els["s-map-preview"].src = s.map || "";
    pendingStoreImages = {};
    renderFooterItemsForm();
  }

  function renderFooterItemsForm() {
    els.footerItemsGrid.innerHTML = "";
    var items = state.store.footerItems || [];
    for (var i = 0; i < 4; i++) {
      var item = items[i] || { icon: "", title: "", sub: "" };
      var card = document.createElement("div");
      card.className = "footer-item-card";
      var iconInput = document.createElement("input");
      iconInput.type = "text";
      iconInput.maxLength = 4;
      iconInput.placeholder = "아이콘";
      iconInput.value = item.icon || "";
      var titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.placeholder = "제목";
      titleInput.value = item.title || "";
      var subInput = document.createElement("input");
      subInput.type = "text";
      subInput.placeholder = "보조 문구";
      subInput.value = item.sub || "";
      iconInput.dataset.idx = titleInput.dataset.idx = subInput.dataset.idx = String(i);
      iconInput.dataset.field = "icon";
      titleInput.dataset.field = "title";
      subInput.dataset.field = "sub";
      card.appendChild(iconInput);
      card.appendChild(titleInput);
      card.appendChild(subInput);
      els.footerItemsGrid.appendChild(card);
    }
  }

  function readStoreFormIntoState() {
    var s = state.store;
    s.name = els["s-name"].value;
    s.years = els["s-years"].value;
    s.phone1 = els["s-phone1"].value;
    s.phone2 = els["s-phone2"].value;
    s.address = els["s-address"].value;
    s.directions = els["s-directions"].value;
    s.visitPromo = els["s-visitPromo"].value;
    s.visitPromoSub = els["s-visitPromoSub"].value;
    if (pendingStoreImages.photo) s.photo = pendingStoreImages.photo;
    if (pendingStoreImages.map) s.map = pendingStoreImages.map;

    var items = [];
    var cards = els.footerItemsGrid.querySelectorAll(".footer-item-card");
    cards.forEach(function (card) {
      var inputs = card.querySelectorAll("input");
      items.push({ icon: inputs[0].value, title: inputs[1].value, sub: inputs[2].value });
    });
    s.footerItems = items;
  }

  function bindStoreTab() {
    els["s-photo-file"].addEventListener("change", async function () {
      var file = els["s-photo-file"].files && els["s-photo-file"].files[0];
      if (!file) return;
      var dataUrl = await fileToDataUrl(file);
      pendingStoreImages.photo = dataUrl;
      els["s-photo-preview"].src = dataUrl;
    });
    els["s-map-file"].addEventListener("change", async function () {
      var file = els["s-map-file"].files && els["s-map-file"].files[0];
      if (!file) return;
      var dataUrl = await fileToDataUrl(file);
      pendingStoreImages.map = dataUrl;
      els["s-map-preview"].src = dataUrl;
    });
    els.storeSaveBtn.addEventListener("click", function () {
      readStoreFormIntoState();
      saveJSON(LS_STORE, state.store);
      updatePreview();
      toast("매장 정보를 저장했습니다.");
    });
    els.storeResetBtn.addEventListener("click", function () {
      if (!confirm("매장 정보를 기본값으로 복원할까요?")) return;
      state.store = defaultStore();
      saveJSON(LS_STORE, state.store);
      syncStoreForm();
      updatePreview();
      toast("기본값으로 복원했습니다.");
    });
  }

  /* ---------------------------------------------------------
   * 16. 설정 탭
   * --------------------------------------------------------- */
  function syncSettingsForm() {
    var g = state.settings.google, gh = state.settings.github, sol = state.settings.solapi;
    els["g-apiKey"].value = g.apiKey || "";
    els["g-cx"].value = g.cx || "";
    els["gh-token"].value = gh.token || "";
    els["gh-owner"].value = gh.owner || "";
    els["gh-repo"].value = gh.repo || "";
    els["gh-branch"].value = gh.branch || "";
    els["gh-pagesBase"].value = gh.pagesBase || "";
    els["sol-apiKey"].value = sol.apiKey || "";
    els["sol-apiSecret"].value = sol.apiSecret || "";
    els["sol-sender"].value = sol.sender || "";
  }

  function readSettingsFormIntoState() {
    state.settings.google.apiKey = els["g-apiKey"].value.trim();
    state.settings.google.cx = els["g-cx"].value.trim();
    state.settings.github.token = els["gh-token"].value.trim();
    state.settings.github.owner = els["gh-owner"].value.trim();
    state.settings.github.repo = els["gh-repo"].value.trim();
    state.settings.github.branch = els["gh-branch"].value.trim();
    state.settings.github.pagesBase = els["gh-pagesBase"].value.trim();
    state.settings.solapi.apiKey = els["sol-apiKey"].value.trim();
    state.settings.solapi.apiSecret = els["sol-apiSecret"].value.trim();
    state.settings.solapi.sender = els["sol-sender"].value.trim();
  }

  function bindSettingsTab() {
    document.querySelectorAll(".guide-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var panel = $(btn.getAttribute("data-guide"));
        panel.classList.toggle("hidden");
      });
    });
    els.settingsSaveBtn.addEventListener("click", function () {
      readSettingsFormIntoState();
      saveJSON(LS_SETTINGS, state.settings);
      toast("설정을 저장했습니다.");
    });
  }

  /* ---------------------------------------------------------
   * 17. 액션바 & 모달 트리거 바인딩
   * --------------------------------------------------------- */
  function bindActionBar() {
    els.btnPng.addEventListener("click", exportPng);
    els.btnPdf.addEventListener("click", exportPdf);
    els.btnPrint.addEventListener("click", printPoster);
    els.btnSaveLib.addEventListener("click", saveCurrentToLibrary);
    els.btnPublish.addEventListener("click", publishToGithub);
    els.btnSms.addEventListener("click", openSmsModal);

    els.recommendBtn.addEventListener("click", showRecommend);
    els.recommendCloseBtn.addEventListener("click", function () { els.recommendPanel.classList.add("hidden"); });

    els.imgSearchBtn.addEventListener("click", performImageSearch);
    els.imgSearchQuery.addEventListener("keydown", function (e) { if (e.key === "Enter") performImageSearch(); });

    els.publishCopyBtn.addEventListener("click", function () { copyText(els.publishLinkText.value); });

    els.smsCopyBtn.addEventListener("click", function () { copyText(els.smsText.value); });
    els.smsText.addEventListener("input", updateSmsAppLink);
    els.solapiSendBtn.addEventListener("click", sendSolapiBulk);
  }

  /* ---------------------------------------------------------
   * 18. 초기화
   * --------------------------------------------------------- */
  function init() {
    cacheEls();
    initTabs();
    bindModals();
    bindPosterForm();
    bindActionBar();
    bindStoreTab();
    bindSettingsTab();

    syncFormFromPoster();
    syncStoreForm();
    syncSettingsForm();
    renderSavedList();

    updatePreview();
    requestAnimationFrame(fitPreviewScale);
    window.addEventListener("resize", fitPreviewScale);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
