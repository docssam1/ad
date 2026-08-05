/* ============================================================================
   templates.js — 포스터 템플릿 엔진 (Agent T)
   7종 템플릿(window.PosterTemplates) + window.renderPoster 구현.
   SPEC.md "templates.js 계약" 섹션 참고.
   ========================================================================== */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------
   * 공용 유틸
   * ------------------------------------------------------------------- */

  // XSS 방지용 최소 이스케이프
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // 줄바꿈 보존이 필요한 텍스트(전화문의 등)
  function nl2br(s) {
    return esc(s).replace(/\n/g, "<br>");
  }

  /* ---------------------------------------------------------------------
   * 공용 데이터 블록 렌더러 — 7개 템플릿이 모두 재사용.
   * variant 클래스로 템플릿별 색감 변형.
   * ------------------------------------------------------------------- */

  // 사은품(gifts) — 0~5개, 문자열 배열
  function giftsBlock(poster, variant) {
    var gifts = poster.gifts || [];
    if (!gifts.length) return "";
    var items = gifts
      .map(function (g) {
        return '<li class="gift-item"><span class="gift-dot">✓</span>' + esc(g) + "</li>";
      })
      .join("");
    return '<ul class="gifts-block gifts-block--' + variant + '">' + items + "</ul>";
  }

  // 혜택(benefits) — 0~5개, {icon,title,sub}
  function benefitsBlock(poster, variant) {
    var benefits = poster.benefits || [];
    if (!benefits.length) return "";
    var count = benefits.length;
    var items = benefits
      .map(function (b) {
        return (
          '<div class="benefit-card">' +
          '<div class="benefit-icon">' + esc(b.icon || "🎯") + "</div>" +
          '<div class="benefit-title">' + esc(b.title) + "</div>" +
          (b.sub ? '<div class="benefit-sub">' + esc(b.sub) + "</div>" : "") +
          "</div>"
        );
      })
      .join("");
    return (
      '<div class="benefits-block benefits-block--' + variant + ' benefits-block--n' + count + '">' +
      items +
      "</div>"
    );
  }

  // 혜택(benefits) — 번호 리스트형(black-glow 전용)
  function benefitsListBlock(poster, variant) {
    var benefits = poster.benefits || [];
    if (!benefits.length) return "";
    var items = benefits
      .map(function (b, i) {
        return (
          '<div class="benefit-line">' +
          '<div class="benefit-line-head"><span class="benefit-line-num">혜택' + (i + 1) + ".</span>" +
          '<span class="benefit-line-title">' + esc(b.title) + "</span></div>" +
          (b.sub ? '<div class="benefit-line-sub"><span class="benefit-line-star">✦</span>' + esc(b.sub) + "</div>" : "") +
          "</div>"
        );
      })
      .join("");
    return '<div class="benefits-list benefits-list--' + variant + '">' + items + "</div>";
  }

  // 할인 블록
  function discountBlock(poster, variant) {
    var d = poster.discount;
    if (!d || !d.amount) return "";
    return (
      '<div class="discount-block discount-block--' + variant + '">' +
      (d.prefix ? '<span class="discount-prefix">' + esc(d.prefix) + "</span>" : "") +
      '<span class="discount-amount">' + esc(d.amount) + "</span>" +
      (d.unit ? '<span class="discount-unit">' + esc(d.unit) + "</span>" : "") +
      (d.suffix ? '<span class="discount-suffix">' + esc(d.suffix) + "</span>" : "") +
      "</div>"
    );
  }

  // 기간 pill
  function periodBlock(poster, variant) {
    var p = poster.period;
    if (!p || !p.from) return "";
    return (
      '<div class="period-pill period-pill--' + variant + '">' +
      (p.label ? '<span class="period-label">' + esc(p.label) + "</span>" : "") +
      '<span class="period-range">' + esc(p.from) + (p.to ? " ~ " + esc(p.to) : "") + "</span>" +
      "</div>"
    );
  }

  // 뱃지
  function badgeBlock(poster, variant) {
    if (!poster.badge) return "";
    return '<div class="badge-ribbon badge-ribbon--' + variant + '">' + esc(poster.badge) + "</div>";
  }

  // 기기 이미지 / 장식
  function deviceBlock(poster, decorVariant) {
    if (poster.deviceImage) {
      return '<img class="device-img" src="' + esc(poster.deviceImage) + '" alt="' + esc(poster.title) + '">';
    }
    return '<div class="device-decor device-decor--' + decorVariant + '" aria-hidden="true"><span>📱</span></div>';
  }

  // 매장 사진 + 약도 2단 블록
  function storeBlockHtml(poster, store, variant) {
    if (!poster.showStoreBlock) return "";
    return (
      '<div class="store-block store-block--' + variant + '">' +
      '<div class="store-col">' +
      '<div class="store-label">매장 사진</div>' +
      '<div class="store-img-wrap"><img class="store-img" src="' + esc(store.photo) + '" alt="매장 사진"></div>' +
      "</div>" +
      '<div class="store-col">' +
      '<div class="store-label">매장 약도</div>' +
      '<div class="store-img-wrap"><img class="store-img" src="' + esc(store.map) + '" alt="매장 약도"></div>' +
      "</div>" +
      "</div>"
    );
  }

  // 문의전화 + 방문프로모 + footerItems 4칸
  function footerBlockHtml(poster, store, variant) {
    if (!poster.showFooter) return "";
    var items = (store.footerItems || [])
      .map(function (it) {
        return (
          '<div class="footer-strip-item">' +
          '<div class="footer-strip-icon">' + esc(it.icon || "•") + "</div>" +
          '<div class="footer-strip-text"><b>' + esc(it.title) + "</b><span>" + esc(it.sub) + "</span></div>" +
          "</div>"
        );
      })
      .join("");
    return (
      '<div class="footer-block footer-block--' + variant + '">' +
      '<div class="footer-top">' +
      '<div class="footer-call">' +
      '<div class="footer-call-icon">📞</div>' +
      '<div class="footer-call-text"><span class="footer-call-label">문의전화</span>' +
      '<b class="footer-call-num">' + esc(store.phone1) + "</b>" +
      '<b class="footer-call-num">' + esc(store.phone2) + "</b></div>" +
      "</div>" +
      (store.visitPromo
        ? '<div class="footer-promo">' +
          '<div class="footer-promo-main">' + esc(store.visitPromo) + "</div>" +
          (store.visitPromoSub ? '<div class="footer-promo-sub">' + esc(store.visitPromoSub) + "</div>" : "") +
          "</div>"
        : "") +
      "</div>" +
      (items ? '<div class="footer-strip">' + items + "</div>" : "") +
      "</div>"
    );
  }

  function noticeHtml(poster, variant) {
    if (!poster.notice) return "";
    return '<div class="notice-text notice-text--' + variant + '">' + esc(poster.notice) + "</div>";
  }

  // discount/benefits/gifts/notice 중 하나라도 있어야 패널을 그린다(빈 패널 방지)
  function hasPanelContent(poster) {
    return !!(
      (poster.discount && poster.discount.amount) ||
      (poster.benefits && poster.benefits.length) ||
      (poster.gifts && poster.gifts.length) ||
      poster.notice
    );
  }

  /* ---------------------------------------------------------------------
   * 템플릿 1 — mega-navy : 정보 가득한 행사 전단형 (15주년 스타일)
   * ------------------------------------------------------------------- */
  function renderMegaNavy(poster, store) {
    var accent = poster.accent || "#1e3a8a";
    return (
      '<div class="tpl tpl-mega-navy" style="--accent:' + esc(accent) + '">' +
      '<div class="mn-topband">' +
      '<div class="mn-ribbon"><span class="mn-ribbon-num">' + esc(store.years) + '<sup>th</sup></span><span class="mn-ribbon-txt">ANNIVERSARY</span></div>' +
      '<div class="mn-topband-mid">' +
      '<div class="mn-storename">' + esc(store.name) + "</div>" +
      '<div class="mn-years">' + esc(store.years) + "주년</div>" +
      "</div>" +
      '<div class="mn-topband-cap">' + esc(store.years) + "년간 보내주신 성원에 <b>감사</b>드립니다!</div>" +
      "</div>" +
      '<div class="mn-main">' +
      badgeBlock(poster, "mega-navy") +
      '<div class="mn-headzone">' +
      '<div class="mn-brandline">' + esc(poster.brandLine) + "</div>" +
      '<div class="mn-title">' + esc(poster.title) + "</div>" +
      '<div class="mn-headline">' + esc(poster.headline) + "</div>" +
      (poster.subline ? '<div class="mn-subline">' + esc(poster.subline) + "</div>" : "") +
      periodBlock(poster, "mega-navy") +
      "</div>" +
      '<div class="mn-devicezone">' + deviceBlock(poster, "mega-navy") + "</div>" +
      "</div>" +
      (hasPanelContent(poster)
        ? '<div class="mn-panel">' +
          discountBlock(poster, "mega-navy") +
          benefitsBlock(poster, "mega-navy") +
          giftsBlock(poster, "mega-navy") +
          noticeHtml(poster, "mega-navy") +
          "</div>"
        : "") +
      storeBlockHtml(poster, store, "mega-navy") +
      footerBlockHtml(poster, store, "mega-navy") +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
   * 템플릿 2 — impact : 초임팩트형 (라벤더 + 대형 워터마크 + 흰 박스 3단)
   * ------------------------------------------------------------------- */
  function renderImpact(poster, store) {
    var accent = poster.accent || "#6d28d9";
    return (
      '<div class="tpl tpl-impact" style="--accent:' + esc(accent) + '">' +
      '<div class="ip-watermark" aria-hidden="true"></div>' +
      badgeBlock(poster, "impact") +
      '<div class="ip-devicezone">' + deviceBlock(poster, "impact") + "</div>" +
      '<div class="ip-box ip-box-title">' +
      '<div class="ip-brandline">' + esc(poster.brandLine) + "</div>" +
      '<div class="ip-title">' + esc(poster.title) + "</div>" +
      (poster.subline ? '<div class="ip-subline">' + esc(poster.subline) + "</div>" : "") +
      "</div>" +
      discountBlock(poster, "impact") +
      '<div class="ip-box ip-box-cta">' +
      '<div class="ip-headline">' + esc(poster.headline) + "</div>" +
      periodBlock(poster, "impact") +
      "</div>" +
      benefitsBlock(poster, "impact") +
      giftsBlock(poster, "impact") +
      noticeHtml(poster, "impact") +
      storeBlockHtml(poster, store, "impact") +
      footerBlockHtml(poster, store, "impact") +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
   * 템플릿 3 — soft-purple : 깔끔한 사전예약형 (연보라, 중앙정렬)
   * ------------------------------------------------------------------- */
  function renderSoftPurple(poster, store) {
    var accent = poster.accent || "#8b5cf6";
    return (
      '<div class="tpl tpl-soft-purple" style="--accent:' + esc(accent) + '">' +
      '<div class="sp-wave" aria-hidden="true"></div>' +
      badgeBlock(poster, "soft-purple") +
      '<div class="sp-head">' +
      '<div class="sp-brandline">' + esc(poster.brandLine) + "</div>" +
      '<div class="sp-title">' + esc(poster.title) + "</div>" +
      '<div class="sp-headline">' + esc(poster.headline) + "</div>" +
      (poster.subline ? '<div class="sp-subline">' + esc(poster.subline) + "</div>" : "") +
      '<div class="sp-pillrow">' +
      periodBlock(poster, "soft-purple") +
      discountBlock(poster, "soft-purple") +
      "</div>" +
      "</div>" +
      '<div class="sp-devicezone">' + deviceBlock(poster, "soft-purple") + "</div>" +
      benefitsBlock(poster, "soft-purple") +
      giftsBlock(poster, "soft-purple") +
      noticeHtml(poster, "soft-purple") +
      storeBlockHtml(poster, store, "soft-purple") +
      footerBlockHtml(poster, store, "soft-purple") +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
   * 템플릿 4 — black-glow : 블랙+보라 글로우, 좌 제품 / 우 혜택 리스트
   * ------------------------------------------------------------------- */
  function renderBlackGlow(poster, store) {
    var accent = poster.accent || "#a855f7";
    return (
      '<div class="tpl tpl-black-glow" style="--accent:' + esc(accent) + '">' +
      '<div class="bg-glow bg-glow-1" aria-hidden="true"></div>' +
      '<div class="bg-glow bg-glow-2" aria-hidden="true"></div>' +
      '<div class="bg-glow bg-glow-3" aria-hidden="true"></div>' +
      '<div class="bg-brandline">' + esc(poster.brandLine) + "</div>" +
      '<div class="bg-body">' +
      '<div class="bg-left">' + deviceBlock(poster, "black-glow") + "</div>" +
      '<div class="bg-right">' +
      badgeBlock(poster, "black-glow") +
      (poster.subline ? '<div class="bg-subline">' + esc(poster.subline) + "</div>" : "") +
      '<div class="bg-headline">' + esc(poster.headline) + "</div>" +
      '<div class="bg-title">' + esc(poster.title) + "</div>" +
      periodBlock(poster, "black-glow") +
      discountBlock(poster, "black-glow") +
      (poster.benefits && poster.benefits.length
        ? '<div class="bg-divider"></div><div class="bg-benefit-heading">' + esc(store.name) + "만의 혜택!</div>" + benefitsListBlock(poster, "black-glow")
        : "") +
      giftsBlock(poster, "black-glow") +
      "</div>" +
      "</div>" +
      noticeHtml(poster, "black-glow") +
      storeBlockHtml(poster, store, "black-glow") +
      footerBlockHtml(poster, store, "black-glow") +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
   * 템플릿 5 — pop-purple : 비비드 퍼플 + 만화체 헤드라인 + 말풍선
   * ------------------------------------------------------------------- */
  function renderPopPurple(poster, store) {
    var accent = poster.accent || "#9333ea";
    var bubbleSrc = [];
    (poster.benefits || []).forEach(function (b) { bubbleSrc.push(b.title); });
    (poster.gifts || []).forEach(function (g) { bubbleSrc.push(g); });
    if (!bubbleSrc.length) bubbleSrc = ["최신 스마트폰 할인", "사은품 증정"];
    var bubbles = bubbleSrc
      .slice(0, 4)
      .map(function (t, i) {
        return '<div class="pp-bubble pp-bubble-' + (i + 1) + '">' + esc(t) + "</div>";
      })
      .join("");
    return (
      '<div class="tpl tpl-pop-purple" style="--accent:' + esc(accent) + '">' +
      '<div class="pp-stars" aria-hidden="true"></div>' +
      periodBlock(poster, "pop-purple") +
      badgeBlock(poster, "pop-purple") +
      '<div class="pp-brandline">' + esc(poster.brandLine) + "</div>" +
      '<div class="pp-headline">' + esc(poster.headline) + "</div>" +
      '<div class="pp-title">' + esc(poster.title) + "</div>" +
      (poster.subline ? '<div class="pp-subline">' + esc(poster.subline) + "</div>" : "") +
      discountBlock(poster, "pop-purple") +
      '<div class="pp-bubblezone">' + bubbles + "</div>" +
      '<div class="pp-devicezone">' + deviceBlock(poster, "pop-purple") + "</div>" +
      noticeHtml(poster, "pop-purple") +
      storeBlockHtml(poster, store, "pop-purple") +
      footerBlockHtml(poster, store, "pop-purple") +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
   * 템플릿 6 — exam-chrome : 다크네이비+크롬 도형, 티켓형 흰 패널
   * ------------------------------------------------------------------- */
  function renderExamChrome(poster, store) {
    var accent = poster.accent || "#4c1d95";
    return (
      '<div class="tpl tpl-exam-chrome" style="--accent:' + esc(accent) + '">' +
      '<div class="ec-shape ec-shape-1" aria-hidden="true"></div>' +
      '<div class="ec-shape ec-shape-2" aria-hidden="true"></div>' +
      '<div class="ec-shape ec-shape-3" aria-hidden="true"></div>' +
      '<div class="ec-shape ec-shape-4" aria-hidden="true"></div>' +
      '<div class="ec-gem" aria-hidden="true"></div>' +
      '<div class="ec-ticket">' +
      '<div class="ec-ticket-notch ec-ticket-notch-l"></div>' +
      '<div class="ec-ticket-notch ec-ticket-notch-r"></div>' +
      badgeBlock(poster, "exam-chrome") +
      periodBlock(poster, "exam-chrome") +
      '<div class="ec-title">' + esc(poster.title) + "</div>" +
      '<div class="ec-headline">' + esc(poster.headline) + "</div>" +
      (poster.subline ? '<div class="ec-subline">' + esc(poster.subline) + "</div>" : "") +
      discountBlock(poster, "exam-chrome") +
      benefitsBlock(poster, "exam-chrome") +
      giftsBlock(poster, "exam-chrome") +
      "</div>" +
      '<div class="ec-devicezone">' + deviceBlock(poster, "exam-chrome") + "</div>" +
      '<div class="ec-storename">' + esc(store.name) + "</div>" +
      noticeHtml(poster, "exam-chrome") +
      storeBlockHtml(poster, store, "exam-chrome") +
      footerBlockHtml(poster, store, "exam-chrome") +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
   * 템플릿 7 — premium-black : 블랙, 메탈릭 대형 영문타이틀, 링글로우
   * ------------------------------------------------------------------- */
  function renderPremiumBlack(poster, store) {
    var accent = poster.accent || "#c9a227";
    return (
      '<div class="tpl tpl-premium-black" style="--accent:' + esc(accent) + '">' +
      '<div class="pb-brandline">' + esc(poster.brandLine || store.name) + "</div>" +
      '<div class="pb-title">' + esc(poster.title) + "</div>" +
      '<div class="pb-sub">' +
      (poster.headline ? '<span class="pb-headline">' + esc(poster.headline) + "</span>" : "") +
      (poster.subline ? '<span class="pb-subline">' + esc(poster.subline) + "</span>" : "") +
      "</div>" +
      badgeBlock(poster, "premium-black") +
      periodBlock(poster, "premium-black") +
      '<div class="pb-devicezone"><div class="pb-ring" aria-hidden="true"></div>' + deviceBlock(poster, "premium-black") + "</div>" +
      discountBlock(poster, "premium-black") +
      benefitsBlock(poster, "premium-black") +
      giftsBlock(poster, "premium-black") +
      noticeHtml(poster, "premium-black") +
      storeBlockHtml(poster, store, "premium-black") +
      footerBlockHtml(poster, store, "premium-black") +
      "</div>"
    );
  }

  /* ---------------------------------------------------------------------
   * 템플릿 레지스트리 & 엔트리 함수
   * ------------------------------------------------------------------- */
  window.PosterTemplates = {
    "mega-navy": {
      name: "메가세일 네이비",
      desc: "정보 가득한 행사 전단형 (15주년 스타일)",
      tags: ["preorder", "anniversary", "galaxy"],
      accent: "#1e3a8a",
      render: renderMegaNavy
    },
    impact: {
      name: "임팩트",
      desc: "대형 워터마크 + 초대형 글자, 멀리서도 보이는 임팩트형",
      tags: ["preorder", "galaxy", "simple"],
      accent: "#6d28d9",
      render: renderImpact
    },
    "soft-purple": {
      name: "소프트 퍼플",
      desc: "밝은 연보라 그라데이션의 깔끔한 사전예약형",
      tags: ["preorder", "iphone", "simple"],
      accent: "#8b5cf6",
      render: renderSoftPurple
    },
    "black-glow": {
      name: "블랙 글로우",
      desc: "블랙 배경 + 보라 글로우, 좌측 제품/우측 혜택 리스트형",
      tags: ["iphone", "premium"],
      accent: "#a855f7",
      render: renderBlackGlow
    },
    "pop-purple": {
      name: "팝 퍼플",
      desc: "비비드 퍼플 + 만화체 헤드라인, 말풍선 혜택 강조형",
      tags: ["season", "event", "iphone"],
      accent: "#9333ea",
      render: renderPopPurple
    },
    "exam-chrome": {
      name: "이벤트 크롬",
      desc: "다크네이비+크롬 3D 장식, 티켓형 패널의 시즌 이벤트형",
      tags: ["season", "event"],
      accent: "#4c1d95",
      render: renderExamChrome
    },
    "premium-black": {
      name: "프리미엄 블랙",
      desc: "블랙 + 메탈릭 대형 타이틀, 중앙 제품 링글로우형",
      tags: ["iphone", "premium"],
      accent: "#c9a227",
      render: renderPremiumBlack
    }
  };

  var DEFAULT_TEMPLATE_ID = "mega-navy";

  // poster/store 데이터를 받아 mountEl 내부에 렌더
  window.renderPoster = function (poster, store, mountEl) {
    if (!mountEl) return;
    poster = poster || {};
    store = store || {};
    var tplId = poster.templateId && window.PosterTemplates[poster.templateId] ? poster.templateId : DEFAULT_TEMPLATE_ID;
    var tpl = window.PosterTemplates[tplId];
    var html;
    try {
      html = tpl.render(poster, store);
    } catch (e) {
      html = '<div class="tpl tpl-error">포스터 렌더링 오류: ' + esc(e.message) + "</div>";
      if (window.console) console.error("renderPoster error", e);
    }
    mountEl.innerHTML = '<div class="poster-page" data-tpl="' + esc(tplId) + '">' + html + "</div>";
    return mountEl.querySelector(".poster-page");
  };
})();
