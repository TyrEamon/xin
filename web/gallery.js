(() => {
  const apiBase = document.body.dataset.apiBase || "";
  const API_BASE = apiBase.replace(/\/$/, "");
  const MODE = (document.body.dataset.mode || "gallery").toLowerCase();
  const LIST_ENDPOINT = MODE === "favorites" ? "/api/favorites" : "/api/posts";
  const analytics = initAnalytics();

  const masonryInstances = {};
  const state = {
    all: { offset: 0, loading: false, done: false },
    h: { offset: 0, loading: false, done: false },
    v: { offset: 0, loading: false, done: false }
  };
  const BATCH_SIZE = 20;
  const LIGHTBOX_PRELOAD_THRESHOLD = 3;
  let activeType = "all";

  const segButtons = Array.prototype.slice.call(document.querySelectorAll('.seg-btn'));
  const segIndicator = document.querySelector('.seg-indicator');

  function readUmamiConfig() {
    const host = (document.body.dataset.umamiHost || '').trim().replace(/\/$/, '');
    const websiteId = (document.body.dataset.umamiWebsiteId || '').trim();
    return { host, websiteId };
  }

  function initAnalytics() {
    const cfg = readUmamiConfig();
    if (!cfg.host || !cfg.websiteId) {
      return { enabled: false };
    }

    if (!window.umami && !document.querySelector('script[data-umami-loader="1"]')) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = cfg.host + '/script.js';
      script.setAttribute('data-website-id', cfg.websiteId);
      script.setAttribute('data-umami-loader', '1');
      document.head.appendChild(script);
    }

    return { enabled: true };
  }

  function trackEvent(name, payload) {
    if (!analytics.enabled) return;
    if (!window.umami || typeof window.umami.track !== 'function') return;
    try {
      if (payload && Object.keys(payload).length > 0) {
        window.umami.track(name, payload);
      } else {
        window.umami.track(name);
      }
    } catch (_) {
      // no-op
    }
  }

  function setActiveButton(type) {
    const idx = segButtons.findIndex(btn => btn.dataset.type === type);
    if (idx === -1) return;
    segButtons.forEach(btn => btn.classList.remove('active'));
    segButtons[idx].classList.add('active');
    if (segIndicator) {
      const target = segButtons[idx];
      segIndicator.style.left = target.offsetLeft + 'px';
      segIndicator.style.width = target.offsetWidth + 'px';
    }
  }

  function setThemeLabel(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const sun = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="12" cy="12" r="4.2"/>' +
      '<path d="M12 2.5v2.2M12 19.3v2.2M4.5 12H2.3M21.7 12h-2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6"/>' +
      '</svg>';
    const moon = '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 12.7A8.5 8.5 0 1 1 11.3 3a6.7 6.7 0 1 0 9.7 9.7z"/>' +
      '</svg>';
    btn.innerHTML = theme === 'dark' ? moon : sun;
  }

  function initTheme() {
    const root = document.documentElement;
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = stored || (prefersDark ? 'dark' : 'light');
    root.setAttribute('data-theme', theme);
    setThemeLabel(theme);

    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', function() {
        const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        setThemeLabel(next);
      });
    }
  }

  function applyColumns(value, save) {
    const desired = parseInt(value, 10) || 4;
    let applied = desired;
    const width = window.innerWidth || 1200;
    if (width <= 560) {
      applied = Math.min(applied, 1);
    } else if (width <= 860) {
      applied = Math.min(applied, 2);
    }
    document.documentElement.style.setProperty('--cols', applied);
    const display = document.getElementById('cols-value');
    if (display) display.textContent = desired;
    if (save) {
      localStorage.setItem('gallery_cols', String(desired));
    }
    Object.keys(masonryInstances).forEach(k => masonryInstances[k].layout());
  }

  function initColumns() {
    const slider = document.getElementById('cols-range');
    const toggle = document.getElementById('columns-toggle');
    const panel = document.getElementById('cols-panel');
    const control = document.getElementById('cols-control');
    const saved = localStorage.getItem('gallery_cols');

    if (slider) {
      if (saved) slider.value = saved;
      applyColumns(slider.value, false);
      slider.addEventListener('input', function() {
        applyColumns(slider.value, true);
      });
    }

    if (toggle && panel && control) {
      toggle.addEventListener('click', function(e) {
        e.stopPropagation();
        panel.classList.toggle('open');
      });

      document.addEventListener('click', function(e) {
        if (!control.contains(e.target)) {
          panel.classList.remove('open');
        }
      });
    }

    window.addEventListener('resize', function() {
      if (slider) {
        applyColumns(slider.value, false);
      }
    });
  }

  function iconTools() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 5v14"/>' +
      '<path d="M5 12h14"/>' +
      '</svg>';
  }

  function iconPlay() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9.85 7.45c-.96-.62-2.2.07-2.2 1.2v6.8c0 1.13 1.24 1.82 2.2 1.2l5-3.4a1.45 1.45 0 0 0 0-2.4z" fill="currentColor" stroke="none"/>' +
      '</svg>';
  }

  function iconPause() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 8v8"/>' +
      '<path d="M14 8v8"/>' +
      '</svg>';
  }

  function iconUp() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M7 14l5-5 5 5"/>' +
      '<path d="M7 19l5-5 5 5"/>' +
      '</svg>';
  }

  function iconSpark() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.8l1.9 4.5 4.5 1.9-4.5 1.9-1.9 4.5-1.9-4.5-4.5-1.9 4.5-1.9z"/>' +
      '<path d="M18.4 15.8l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/>' +
      '</svg>';
  }


  function iconSmartRandom() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="3.5" y="7" width="7.2" height="11" rx="1.7"/>' +
      '<rect x="12.3" y="5" width="8.2" height="14" rx="1.8"/>' +
      '<path d="M7.1 4.4l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z"/>' +
      '</svg>';
  }

  function injectFloatingToolsStyle() {
    if (document.getElementById('floating-tools-style')) return;
    const style = document.createElement('style');
    style.id = 'floating-tools-style';
    style.textContent =
      '.floating-tools{position:fixed;right:max(24px,env(safe-area-inset-right));bottom:max(24px,env(safe-area-inset-bottom));z-index:30;width:220px;height:220px;pointer-events:none;}' +
      '.floating-tools-menu{position:absolute;inset:0;pointer-events:none;}' +
      '.floating-tools-action{--tx:0px;--ty:0px;position:absolute;right:6px;bottom:6px;width:44px;height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid var(--glass-border);background:var(--card-bg);color:var(--text);box-shadow:0 10px 24px rgba(12,18,30,.18);backdrop-filter:blur(10px);opacity:0;pointer-events:none;transform:translate3d(0,0,0) scale(.36);transition:transform .34s cubic-bezier(.2,.85,.25,1.2),opacity .2s ease,color .2s ease,border-color .2s ease;}' +
      '.floating-tools.open .floating-tools-action{opacity:1;pointer-events:auto;transform:translate3d(var(--tx),var(--ty),0) scale(1);}' +
      '.floating-tools.open .action-auto{transition-delay:.02s;}' +
      '.floating-tools.open .action-random-all{transition-delay:.06s;}' +
      '.floating-tools.open .action-random-smart{transition-delay:.11s;}' +
      '.floating-tools.open .action-top{transition-delay:.16s;}' +
      '.floating-tools-action svg,.floating-tools-trigger svg{width:20px;height:20px;stroke:currentColor;}' +
      '.floating-tools-action .icon-wrap,.floating-tools-trigger .icon-wrap{display:inline-flex;align-items:center;justify-content:center;line-height:0;}' +
      '.floating-tools-action.action-auto svg{width:24px;height:24px;}' +
      '.floating-tools.open .floating-tools-action:hover{transform:translate3d(var(--tx),var(--ty),0) scale(1.06);}' +
      '.floating-tools-action.action-auto,.floating-tools-action.action-top{color:var(--accent);}' +
      '.floating-tools-action.auto-active{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 32%,var(--glass-border));}' +
      '.floating-tools-action.random-tool-btn{color:var(--accent);}' +
      '[data-theme="dark"] .floating-tools-action.action-auto,[data-theme="dark"] .floating-tools-action.action-top,[data-theme="dark"] .floating-tools-action.random-tool-btn{color:#ffffff;border-color:rgba(255,255,255,.28);}' +
      '[data-theme="dark"] .floating-tools-action.auto-active{color:#ffffff;border-color:rgba(255,255,255,.42);}' +
      '.floating-tools-trigger{position:absolute;right:0;bottom:0;width:56px;height:56px;border-radius:18px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border:1px solid color-mix(in srgb,var(--accent) 36%, transparent);background:linear-gradient(145deg,color-mix(in srgb,var(--card-bg) 88%, var(--accent) 12%),var(--card-bg));color:var(--accent);box-shadow:0 16px 30px color-mix(in srgb,var(--accent) 32%, transparent),0 8px 14px rgba(0,0,0,.16);backdrop-filter:blur(12px);pointer-events:auto;transition:transform .24s cubic-bezier(.2,.9,.2,1.2),box-shadow .2s ease;}' +
      '.floating-tools-trigger::before{content:"";position:absolute;inset:-7px;border-radius:22px;border:1px solid color-mix(in srgb,var(--accent) 28%, transparent);opacity:0;transform:scale(.86);}' +
      '.floating-tools.is-auto .floating-tools-trigger::before{opacity:.72;animation:floating-pulse 2.2s ease-out infinite;}' +
      '.floating-tools.open .floating-tools-trigger{transform:rotate(45deg) scale(1.03);}' +
      '.floating-tools.open .floating-tools-trigger::before{opacity:.9;transform:scale(1);}' +
      '@keyframes floating-pulse{0%{opacity:.76;transform:scale(.82);}70%{opacity:.08;transform:scale(1.16);}100%{opacity:0;transform:scale(1.2);}}' +
      '@media (hover:hover){' +
      '  .floating-tools-action[data-tip]::after{content:attr(data-tip);position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-45%);white-space:nowrap;padding:6px 10px;border-radius:9px;background:var(--card-bg);border:1px solid var(--glass-border);box-shadow:0 8px 18px rgba(0,0,0,.16);font-size:12px;color:var(--text);opacity:0;pointer-events:none;transition:opacity .15s ease,transform .15s ease;}' +
      '  .floating-tools.open .floating-tools-action:hover::after{opacity:1;transform:translateY(-50%);}' +
      '}' +
      '@media (max-width:560px){.floating-tools{right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));width:188px;height:188px;}.floating-tools-trigger{width:48px;height:48px;border-radius:15px;}.floating-tools-action{width:40px;height:40px;border-radius:12px;right:4px;bottom:4px;}}' +
      '@media (prefers-reduced-motion:reduce){.floating-tools-action,.floating-tools-trigger{transition:none;}.floating-tools.is-auto .floating-tools-trigger::before{animation:none;}}';
    document.head.appendChild(style);
  }

  function initFloatingTools() {
    injectFloatingToolsStyle();

    const host = document.createElement('div');
    host.className = 'floating-tools';
    host.innerHTML =
      '<div class="floating-tools-menu">' +
      '  <button class="floating-tools-action action-auto" id="floating-auto-scroll-btn" type="button" aria-label="Auto Scroll" title="Auto Scroll" data-tip="Auto Scroll">' +
      '    <span class="icon-wrap">' + iconPlay() + '</span>' +
      '  </button>' +
      '  <button class="floating-tools-action random-tool-btn action-random-all" id="floating-random-all-btn" type="button" aria-label="Random Image" title="Random Image" data-tip="Random Image">' +
      '    <span class="icon-wrap">' + iconSpark() + '</span>' +
      '  </button>' +
      '  <button class="floating-tools-action random-tool-btn action-random-smart" id="floating-random-smart-btn" type="button" aria-label="Smart Random" title="Smart Random" data-tip="Smart Random">' +
      '    <span class="icon-wrap">' + iconSmartRandom() + '</span>' +
      '  </button>' +
      '  <button class="floating-tools-action action-top" id="floating-back-top-btn" type="button" aria-label="Back To Top" title="Back To Top" data-tip="Back To Top">' +
      '    <span class="icon-wrap">' + iconUp() + '</span>' +
      '  </button>' +
      '</div>' +
      '<button class="floating-tools-trigger" id="floating-tools-trigger" type="button" aria-expanded="false" aria-label="Quick Tools" title="Quick Tools">' +
      '  <span class="icon-wrap">' + iconTools() + '</span>' +
      '</button>';
    document.body.appendChild(host);

    const trigger = document.getElementById('floating-tools-trigger');
    const autoBtn = document.getElementById('floating-auto-scroll-btn');
    const randomAllBtn = document.getElementById('floating-random-all-btn');
    const randomSmartBtn = document.getElementById('floating-random-smart-btn');
    const topBtn = document.getElementById('floating-back-top-btn');
    const autoIconWrap = autoBtn ? autoBtn.querySelector('.icon-wrap') : null;

    if (!trigger || !autoBtn || !randomAllBtn || !randomSmartBtn || !topBtn || !autoIconWrap) return;

    const randomBase = API_BASE || window.location.origin;
    let rafId = 0;
    let autoMode = false;
    let interactionPauseUntil = 0;
    const step = 1.15;
    const interactionResumeDelayMs = 1200;
    const actionButtons = [autoBtn, randomAllBtn, randomSmartBtn, topBtn];
    let layoutRafId = 0;

    function applyRadialLayout() {
      const count = actionButtons.length;
      if (!count) return;

      const isMobile = window.innerWidth <= 560;
      const buttonSize = isMobile ? 40 : 44;

      if (isMobile) {
        const stackGap = 10;
        const stepY = buttonSize + stackGap;
        const zoneWidth = 92;
        const zoneHeight = stepY * count + buttonSize + 24;

        host.style.width = zoneWidth + 'px';
        host.style.height = zoneHeight + 'px';

        actionButtons.forEach(function(btn, index) {
          btn.style.setProperty('--tx', '0px');
          btn.style.setProperty('--ty', String(-Math.round(stepY * (index + 1))) + 'px');
        });
        return;
      }

      const gap = 8;
      const startDeg = 174;
      const endDeg = 282;
      const stepDeg = count > 1 ? (endDeg - startDeg) / (count - 1) : 0;
      const stepRad = stepDeg * Math.PI / 180;

      let radius = 96;
      if (count > 1 && stepRad > 0) {
        const minRadius = (buttonSize + gap) / (2 * Math.sin(stepRad / 2));
        if (Number.isFinite(minRadius)) {
          radius = Math.max(radius, Math.ceil(minRadius));
        }
      }

      const zoneSize = radius + 66;
      host.style.width = zoneSize + 'px';
      host.style.height = zoneSize + 'px';

      actionButtons.forEach(function(btn, index) {
        const angle = (startDeg + stepDeg * index) * Math.PI / 180;
        const tx = Math.round(radius * Math.cos(angle));
        const ty = Math.round(radius * Math.sin(angle));
        btn.style.setProperty('--tx', tx + 'px');
        btn.style.setProperty('--ty', ty + 'px');
      });
    }

    function scheduleRadialLayout() {
      if (layoutRafId) {
        window.cancelAnimationFrame(layoutRafId);
      }
      layoutRafId = window.requestAnimationFrame(function() {
        layoutRafId = 0;
        applyRadialLayout();
      });
    }

    function setPanelOpen(open) {
      host.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function updateAutoUI() {
      autoBtn.classList.toggle('auto-active', autoMode);
      host.classList.toggle('is-auto', autoMode);
      autoBtn.setAttribute('title', autoMode ? 'Stop Scroll' : 'Auto Scroll');
      autoBtn.setAttribute('aria-label', autoMode ? 'Stop Scroll' : 'Auto Scroll');
      autoBtn.setAttribute('data-tip', autoMode ? 'Stop Scroll' : 'Auto Scroll');
      autoIconWrap.innerHTML = autoMode ? iconPause() : iconPlay();
    }

    function stopAutoScroll() {
      autoMode = false;
      interactionPauseUntil = 0;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      updateAutoUI();
    }

    function pauseAutoTemporarily() {
      if (!autoMode) return;
      interactionPauseUntil = Date.now() + interactionResumeDelayMs;
    }

    function autoTick() {
      if (!autoMode) return;

      if (Date.now() < interactionPauseUntil) {
        rafId = window.requestAnimationFrame(autoTick);
        return;
      }

      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const nextY = window.scrollY + step;
      if (nextY >= maxY - 2) {
        stopAutoScroll();
        return;
      }

      window.scrollTo(0, nextY);
      rafId = window.requestAnimationFrame(autoTick);
    }

    function startAutoScroll() {
      autoMode = true;
      interactionPauseUntil = 0;
      updateAutoUI();
      autoTick();
    }

    trigger.addEventListener('click', function(event) {
      event.stopPropagation();
      setPanelOpen(!host.classList.contains('open'));
    });

    autoBtn.addEventListener('click', function() {
      if (autoMode) {
        stopAutoScroll();
      } else {
        startAutoScroll();
      }
      setPanelOpen(false);
      trackEvent('auto_scroll_toggle', { mode: MODE, enabled: autoMode ? '1' : '0' });
    });

    topBtn.addEventListener('click', function() {
      stopAutoScroll();
      window.scroll({ top: 0, behavior: 'smooth' });
      setPanelOpen(false);
      trackEvent('back_to_top_click', { mode: MODE });
    });

    function openRandomImage(type) {
      const url = new URL('/api/random', randomBase);
      url.searchParams.set('format', 'redirect');
      if (type !== 'all') {
        url.searchParams.set('type', type);
      }
      window.open(url.toString(), '_blank', 'noopener,noreferrer');
      setPanelOpen(false);
      trackEvent('random_image_open', { mode: MODE, type: type });
    }

    randomAllBtn.addEventListener('click', function() {
      openRandomImage('all');
    });

    function resolveSmartRandomType() {
      if (activeType === 'h' || activeType === 'v') {
        return activeType;
      }
      const portrait = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
      return portrait ? 'v' : 'h';
    }

    randomSmartBtn.addEventListener('click', function() {
      const pickedType = resolveSmartRandomType();
      openRandomImage(pickedType);
    });

    document.addEventListener('click', function(event) {
      if (!host.contains(event.target)) {
        setPanelOpen(false);
      }
    });

    window.addEventListener('wheel', pauseAutoTemporarily, { passive: true });
    window.addEventListener('touchstart', pauseAutoTemporarily, { passive: true });
    window.addEventListener('pointerdown', pauseAutoTemporarily, { passive: true });
    window.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        setPanelOpen(false);
        if (autoMode) stopAutoScroll();
        return;
      }
      if (autoMode) {
        const key = event.key;
        if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'PageDown' || key === 'PageUp' || key === 'Home' || key === 'End' || key === ' ') {
          pauseAutoTemporarily();
        }
      }
    });

    window.addEventListener('resize', scheduleRadialLayout, { passive: true });
    scheduleRadialLayout();
    updateAutoUI();
  }

  function getGrid(type) {

    return document.getElementById('grid-' + type);
  }

  function initMasonry(type) {
    if (masonryInstances[type]) return;
    const grid = getGrid(type);
    if (!grid) return;
    masonryInstances[type] = new Masonry(grid, {
      itemSelector: '.grid-item',
      columnWidth: '.grid-sizer',
      percentPosition: true,
      gutter: 16
    });
  }

  const observer = lozad('.lozad', {
    rootMargin: '200px 0px',
    threshold: 0,
    loaded: function(el) {
      const revealWhenDecoded = function() {
        if (el.getAttribute('data-loaded') === 'true') {
          return;
        }
        const finalize = function() {
          el.setAttribute('data-loaded', true);
          const item = el.closest('.grid-item');
          if (item) {
            item.classList.add('content-loaded');
            const gridType = item.getAttribute('data-grid');
            if (gridType && masonryInstances[gridType]) {
              masonryInstances[gridType].layout();
            }
          }
        };

        if (typeof el.decode === 'function') {
          el.decode().catch(function() {
            // Some browsers reject decode() for cached or cross-origin images.
          }).finally(finalize);
          return;
        }

        finalize();
      };

      const onImgLoad = function() {
        revealWhenDecoded();
      };

      if (el.complete && el.naturalHeight !== 0) {
        revealWhenDecoded();
      } else {
        el.onload = onImgLoad;
      }
    }
  });

  function svgLink() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 12"/>' +
      '<path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 11"/>' +
      '</svg>';
  }

  function svgDownload() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3v12"/>' +
      '<path d="M7 10l5 5 5-5"/>' +
      '<path d="M5 21h14"/>' +
      '</svg>';
  }

  function buildArtistProfileURL(item) {
    const artistId = String(item.artist_id || '').trim();
    if (!artistId || artistId === 'none') return '';

    const source = String(item.source || '').toLowerCase();
    if (source === 'twitter') {
      return 'https://x.com/' + artistId.replace(/^@+/, '');
    }
    if (source === 'fanbox') {
      return 'https://' + artistId.replace(/^@+/, '') + '.fanbox.cc';
    }

    return 'https://www.pixiv.net/users/' + artistId;
  }

  function createItem(item, type, idx) {
    const blankPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    const pad = (item.height && item.width) ? (item.height / item.width * 100).toFixed(2) : 56.25;
    const previewURL = item.preview_id ? (API_BASE + '/image/' + item.preview_id) : '';
    const originViewURL = item.origin_id ? (API_BASE + '/image/' + item.origin_id) : '';
    const displayURL = previewURL || originViewURL || blankPixel;
    // Use preview in lightbox first to avoid broken modal when origin fetch is unstable.
    const lightboxURL = previewURL || blankPixel;
    const downloadURL = originViewURL ? (originViewURL + '?dl=1') : (previewURL ? (previewURL + '?dl=1') : blankPixel);

    const wrapper = document.createElement('div');
    wrapper.className = 'grid-item';
    wrapper.setAttribute('data-grid', type);

    const link = document.createElement('a');
    link.className = 'lightbox-link';
    link.setAttribute('data-fancybox', 'group-' + type);
    link.setAttribute('data-thumb', displayURL);
    link.setAttribute('href', lightboxURL);
    link.setAttribute('data-caption', (item.title || 'Untitled') + ' - ' + (item.artist_name || ''));
    link.addEventListener('click', function() {
      trackEvent('image_open', {
        mode: MODE,
        segment: type,
        source: item.source || ''
      });
    });

    const ratio = document.createElement('div');
    ratio.className = 'ratio-box';
    ratio.style.paddingTop = pad + '%';

    const img = document.createElement('img');
    img.className = 'lozad';
    img.setAttribute('data-src', displayURL);
    img.setAttribute('alt', (item.title || 'image') + '-' + (idx + 1));
    img.loading = 'lazy';
    img.decoding = 'async';
    if (originViewURL && previewURL && originViewURL !== previewURL) {
      img.addEventListener('error', function() {
        if (img.dataset.fallbackTried === '1') {
          return;
        }
        img.dataset.fallbackTried = '1';
        img.src = originViewURL + (originViewURL.indexOf('?') >= 0 ? '&' : '?') + 'fallback=1';
      });
    }

    ratio.appendChild(img);
    link.appendChild(ratio);
    wrapper.appendChild(link);

    const overlay = document.createElement('div');
    overlay.className = 'card-overlay';

    const meta = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = item.title || 'Untitled';
    meta.appendChild(title);

    if (item.artist_name) {
      const artist = document.createElement('div');
      artist.className = 'card-artist';
      const artistURL = buildArtistProfileURL(item);
      if (artistURL) {
        const link = document.createElement('a');
        link.href = artistURL;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = item.artist_name;
        artist.appendChild(link);
      } else {
        artist.textContent = item.artist_name;
      }
      meta.appendChild(artist);
    }

    const actions = document.createElement('div');
    actions.className = 'card-actions';

    if (item.source_url && item.source_url !== 'none') {
      const origin = document.createElement('a');
      origin.href = item.source_url;
      origin.target = '_blank';
      origin.rel = 'noopener';
      origin.innerHTML = svgLink();
      origin.addEventListener('click', function() {
        trackEvent('source_click', {
          mode: MODE,
          segment: type,
          source: item.source || ''
        });
      });
      actions.appendChild(origin);
    }

    const download = document.createElement('a');
    download.href = downloadURL;
    download.innerHTML = svgDownload();
    download.addEventListener('click', function() {
      trackEvent('download_click', {
        mode: MODE,
        segment: type,
        source: item.source || ''
      });
    });
    actions.appendChild(download);

    overlay.appendChild(meta);
    overlay.appendChild(actions);
    wrapper.appendChild(overlay);

    return wrapper;
  }

  function toFancyboxSlide(linkEl) {
    if (!linkEl) return null;

    const data = linkEl.dataset || {};
    const thumbEl = linkEl.querySelector('img:not([aria-hidden])');
    const src = data.src || linkEl.getAttribute('href') || linkEl.getAttribute('currentSrc') || linkEl.getAttribute('src') || '';
    if (!src) return null;

    const thumbSrc = data.thumb || data.thumbSrc ||
      (thumbEl ? (thumbEl.getAttribute('currentSrc') || thumbEl.getAttribute('src') || thumbEl.dataset.src || '') : '');
    const slide = {
      src: src,
      alt: data.alt || (thumbEl ? thumbEl.getAttribute('alt') : '') || undefined,
      thumbSrc: thumbSrc || undefined,
      thumbEl: thumbEl || undefined,
      triggerEl: linkEl
    };

    Object.keys(data).forEach(function(key) {
      const raw = String(data[key]);
      slide[key] = raw === 'false' ? false : (raw === 'true' ? true : raw);
    });

    return slide;
  }

  function syncOpenLightbox(type, newItems) {
    if (!window.Fancybox || typeof window.Fancybox.getInstance !== 'function') return;

    const instance = window.Fancybox.getInstance();
    if (!instance || typeof instance.getSlide !== 'function') return;

    const currentSlide = instance.getSlide();
    const triggerEl = currentSlide && currentSlide.triggerEl;
    const group = triggerEl ? String(triggerEl.getAttribute('data-fancybox') || '') : '';
    if (group !== ('group-' + type)) return;

    const carousel = typeof instance.getCarousel === 'function' ? instance.getCarousel() : null;
    if (!carousel || typeof carousel.add !== 'function') return;

    const slides = newItems
      .map(function(itemEl) { return itemEl.querySelector('.lightbox-link'); })
      .map(toFancyboxSlide)
      .filter(Boolean);

    if (!slides.length) return;

    try {
      carousel.add(slides);
    } catch (_) {
      // no-op
    }
  }

  async function fetchBatch(type, options) {
    options = options || {};
    if (state[type].loading || state[type].done) return false;
    state[type].loading = true;

    const url = API_BASE + LIST_ENDPOINT + '?type=' + encodeURIComponent(type) + '&offset=' + state[type].offset + '&limit=' + BATCH_SIZE;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        state[type].loading = false;
        return false;
      }
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        state[type].done = true;
        state[type].loading = false;
        return false;
      }

      const grid = getGrid(type);
      if (!grid) {
        state[type].loading = false;
        return false;
      }

      initMasonry(type);

      const fragment = document.createDocumentFragment();
      const newItems = [];

      data.forEach((item, idx) => {
        const el = createItem(item, type, state[type].offset + idx);
        newItems.push(el);
        fragment.appendChild(el);
      });

      grid.appendChild(fragment);
      state[type].offset += data.length;

      if (masonryInstances[type]) {
        masonryInstances[type].appended(newItems);
        masonryInstances[type].layout();
      }

      if (options.syncLightbox) {
        syncOpenLightbox(type, newItems);
      }

      observer.observe();
      state[type].loading = false;
      return true;
    } catch (e) {
      state[type].loading = false;
      return false;
    }
  }

  function maybeLoadMore() {
    const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 900);
    if (!nearBottom) return;
    fetchBatch(activeType);
  }

  function getLightboxType(fancybox) {
    if (!fancybox || typeof fancybox.getSlide !== 'function') return '';
    const slide = fancybox.getSlide();
    const trigger = slide && slide.triggerEl;
    const group = trigger ? String(trigger.getAttribute('data-fancybox') || '') : '';
    if (!group.startsWith('group-')) return '';
    return group.slice(6);
  }

  function maybeLoadMoreForLightbox(fancybox) {
    const type = getLightboxType(fancybox);
    if (!type || !state[type] || state[type].done || state[type].loading) return;

    const carousel = fancybox && typeof fancybox.getCarousel === 'function' ? fancybox.getCarousel() : null;
    const slides = carousel && typeof carousel.getSlides === 'function' ? carousel.getSlides() : null;
    if (!Array.isArray(slides) || !slides.length) return;

    const current = fancybox.getSlide ? fancybox.getSlide() : null;
    const currentIndex = current && typeof current.index === 'number' ? current.index : 0;
    const remaining = slides.length - currentIndex - 1;

    if (remaining <= LIGHTBOX_PRELOAD_THRESHOLD) {
      fetchBatch(type, { syncLightbox: true });
    }
  }

  function filterGallery(type, trigger) {
    const prevType = activeType;
    activeType = type;
    setActiveButton(type);

    document.querySelectorAll('.gallery-section').forEach(sec => {
      if (sec.id === 'section-' + type) {
        sec.style.display = 'block';
      } else {
        sec.style.display = 'none';
      }
    });

    fetchBatch(type);

    if (trigger === 'segmented' && prevType !== type) {
      trackEvent('filter_switch', {
        mode: MODE,
        type: type
      });
    }

    setTimeout(() => {
      Object.keys(masonryInstances).forEach(k => masonryInstances[k].layout());
    }, 10);
  }

  document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initColumns();
    initFloatingTools();

    if (window.Fancybox) {
      const mobileViewer = window.matchMedia && window.matchMedia('(max-width: 860px)').matches;
      Fancybox.bind('[data-fancybox]', {
        Carousel: {
          infinite: false
        },
        Thumbs: { autoStart: !mobileViewer },
        Toolbar: {
          display: mobileViewer ? {
            left: ['close'],
            middle: [],
            right: []
          } : {
            left: ['zoom', 'slideshow', 'fullscreen', 'thumbs', 'close'],
            middle: [],
            right: []
          }
        },
        on: {
          ready: function(fancybox) {
            maybeLoadMoreForLightbox(fancybox);
          },
          'Carousel.change': function(fancybox) {
            maybeLoadMoreForLightbox(fancybox);
          }
        }
      });
    }

    segButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        filterGallery(btn.dataset.type, 'segmented');
      });
    });

    window.addEventListener('resize', function() {
      setActiveButton(activeType);
    });

    setActiveButton(activeType);
    filterGallery(activeType, 'init');
    window.addEventListener('scroll', maybeLoadMore, { passive: true });
  });
})();
