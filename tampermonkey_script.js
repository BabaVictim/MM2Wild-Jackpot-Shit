// ==UserScript==
// @name         MM2Wild Jackpot Extension
// @namespace    http://tampermonkey.net/
// @version      2026-03-01
// @description  real shit
// @author       Me Myself and I
// @match        https://mm2wild.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=mm2wild.com
// @grant        none
// ==/UserScript==

(() => {
  "use strict";

  const TARGET_PATH = "/fairness";
  const JACKPOT_LABEL = "Jackpot";
  const GRID_JACKPOT_COLOR = "180, 90, 255";

  const isEl = (x) => x instanceof Element;

  function qsa(root, sel) {
    try { return Array.from(root.querySelectorAll(sel)); } catch { return []; }
  }

  function spaNavigate(path) {
    if (typeof path !== "string" || !path.startsWith("/")) return;

    if (location.pathname === path) return;

    window.location.assign(path);
  }

  function wireSpaClick(el) {
    if (!el || el.dataset.tmSpaWired === "1") return;
    el.dataset.tmSpaWired = "1";

    el.addEventListener("click", (e) => {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();
      e.stopPropagation();
      spaNavigate(TARGET_PATH);
    }, true);
  }

  function findOpenGamesPopover(root = document) {
    const dialogs = qsa(root, 'div[role="dialog"][data-state="open"]');
    for (const d of dialogs) {
      if (!d.querySelector('a[href="/games/battles"]')) continue;
      const gameLinks = d.querySelectorAll('a[href^="/games/"]');
      if (gameLinks.length >= 3) return d;
    }
    return null;
  }

  function popoverHasJackpot(popover) {
    return !!popover.querySelector(`a[href="${TARGET_PATH}"]`);
  }

  function buildPopoverJackpotItem(popover) {
    const template = popover.querySelector('a[href="/games/battles"]');
    if (!template) return null;

    const jackpot = template.cloneNode(true);

    jackpot.setAttribute("href", TARGET_PATH);
    jackpot.classList.remove("router-link-active", "router-link-exact-active");
    jackpot.removeAttribute("aria-current");

    const label = jackpot.querySelector("p.font-semibold") || jackpot.querySelector("p");
    if (label) label.textContent = JACKPOT_LABEL;

    const activeWrap = jackpot.querySelector('[data-active]');
    if (activeWrap) activeWrap.setAttribute("data-active", "false");

    wireSpaClick(jackpot);

    return jackpot;
  }

  function ensurePopoverJackpotAtEnd(popover) {
    if (!popover || popoverHasJackpot(popover)) return;
    const item = buildPopoverJackpotItem(popover);
    if (!item) return;
    popover.appendChild(item);
  }

  function findGamesGrid(root = document) {
    const grids = qsa(root, "div.grid.gap-4");
    for (const g of grids) {
      const cards = g.querySelectorAll('a.game-card[href^="/games/"]');
      if (cards.length >= 4) return g;
    }

    const candidates = qsa(root, "div");
    for (const d of candidates) {
      const cls = d.className || "";
      if (typeof cls !== "string") continue;
      if (!cls.includes("grid") || !cls.includes("gap-4")) continue;

      const cards = d.querySelectorAll('a.game-card[href^="/games/"]');
      if (cards.length >= 4) return d;
    }
    return null;
  }

  function gridHasJackpot(grid) {
    return !!grid.querySelector(`a.game-card[href="${TARGET_PATH}"]`);
  }

  function buildGridJackpotCard(grid) {
    const template = grid.querySelector('a.game-card[href^="/games/"]');
    if (!template) return null;

    const card = template.cloneNode(true);
    card.setAttribute("href", TARGET_PATH);

    card.style.setProperty("--color", GRID_JACKPOT_COLOR);
    card.style.background =
      `radial-gradient(141.46% 89% at 50% 106.33%, rgba(var(--color), 0.65) 0%, rgba(34, 47, 89, 0) 100%), ` +
      `linear-gradient(0deg, rgba(var(--color), 0.05), rgba(var(--color), 0.05)), #222F59`;

    const h3 = card.querySelector("h3");
    if (h3) h3.textContent = "Jackpot";

    const h4 = card.querySelector("h4");
    if (h4) h4.textContent = "One Winner";

    card.querySelectorAll("img").forEach(img => img.remove());

    const mediaRow = card.querySelector(".flex.items-center.relative") || card.querySelector(".flex.items-center");
    if (mediaRow) {
      mediaRow.innerHTML = `<div style="width:100%; padding-bottom:100%;"></div>`;
    }

    wireSpaClick(card);

    return card;
  }

  function ensureGridJackpotAtEnd(grid) {
    if (!grid || gridHasJackpot(grid)) return;
    const card = buildGridJackpotCard(grid);
    if (!card) return;
    grid.appendChild(card);
  }

  function runAll(root = document) {
    const pop = findOpenGamesPopover(root) || findOpenGamesPopover(document);
    if (pop) ensurePopoverJackpotAtEnd(pop);

    const grid = findGamesGrid(root) || findGamesGrid(document);
    if (grid) ensureGridJackpotAtEnd(grid);
  }

  runAll(document);

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && isEl(m.target)) {
        if (m.attributeName === "data-state" && m.target.getAttribute("data-state") === "open") {
          runAll(m.target);
        }
      }
      for (const n of m.addedNodes) {
        if (!isEl(n)) continue;
        runAll(n);
      }
    }
  });

  obs.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-state"],
  });

  document.addEventListener("click", (e) => {
    const a = e.target?.closest?.(`a[href="${TARGET_PATH}"]`);
    if (!a) return;
    wireSpaClick(a);
  }, true);

})();

(() => {
  "use strict";

  const API_BASE = "https://5049nnv3-4010.euw.devtunnels.ms/api";
  const HEALTH_TIMEOUT_MS = 3000;
  const JACKPOT_RECEIVER_USERNAME = "KellyLozano5";
  const USER_PROFILE_API_URL = "https://api.mm2wild.com/user/getUserProfile";
  const WINNER_STAGE_MS = 4000;

  const PRIMARY_CONTAINER_SELECTOR =
    ".page-content.terms-page.py-8.md\\:py-12.flex.flex-col.gap-8";
  const FALLBACK_CONTAINER_SELECTOR = ".page-content.terms-page";

  let currentES = null;
  let currentObserver = null;
  let currentlyMounted = false;

  const $ = (sel, root = document) => root.querySelector(sel);

  function stopSSE() {
    if (currentES) {
      try { currentES.close(); } catch {}
      currentES = null;
    }
  }

  function disconnectObserver() {
    if (currentObserver) {
      try { currentObserver.disconnect(); } catch {}
      currentObserver = null;
    }
  }

  function ensureStyles() {
    if (document.getElementById("tmjp-styles")) return;
    const s = document.createElement("style");
    s.id = "tmjp-styles";
    s.textContent = `
      .tmjp-wrap { display:flex; flex-direction:column; gap:14px; }
      .tmjp-card { background:#223263; border-radius:16px; padding:16px; box-shadow: 0 16px 25px rgba(0,0,0,0.12); }
      .tmjp-row { display:flex; align-items:center; gap:10px; }
      .tmjp-col { display:flex; flex-direction:column; gap:8px; }
      .tmjp-title { font-weight:900; font-size:18px; color:#fff; }
      .tmjp-sub { color: rgba(238,242,251,.75); font-weight:700; font-size:13px; }
      .tmjp-status-banner { color:#EEF2FB; font-weight:900; font-size:18px; text-align:center; line-height:1.2; }
      .tmjp-pill { background:#31478D; border-radius:12px; padding:8px 10px; font-weight:900; color:#EEF2FB; display:inline-flex; gap:8px; align-items:center; }
      .tmjp-input { width:180px; background:#1D2A53; border:1px solid rgba(255,255,255,.10); color:#fff; padding:10px 12px; border-radius:12px; outline:none; font-weight:900; }
      .tmjp-btn { background:#3B54A4; color:#fff; border:none; padding:10px 12px; border-radius:12px; font-weight:900; cursor:pointer; }
      .tmjp-btn:disabled { opacity:.6; cursor:not-allowed; }
      .tmjp-list { display:flex; flex-direction:column; gap:10px; margin-top:10px; }
      .tmjp-down { text-align:center; padding:40px 20px; }
      .tmjp-down h2 { margin:0; font-size:18px; font-weight:900; color:#EEF2FB; }
      .tmjp-down p { margin:10px 0 0 0; font-size:13px; font-weight:700; opacity:.7; color:#EEF2FB; }
      .tmjp-err { color: rgba(255,216,150,.95); font-weight:900; font-size:12px; }

      .tmjp-msg { position:relative; display:flex; flex-direction:column; }
      .tmjp-msg-inner { display:flex; gap:8px; }
      .tmjp-avatarwrap { width:40px; height:40px; border-radius:9px; padding:2px; background: linear-gradient(to bottom, #1D2A53, #BEBEBE); }
      .tmjp-avatar { width:100%; height:100%; border-radius:7px; background:#1D2A53; display:flex; align-items:center; justify-content:center; overflow:hidden; }
      .tmjp-avatar img { width:75%; height:75%; object-fit:contain; border-radius:6px; }
      .tmjp-name { font-weight:900; font-size:13px; color:#fff; }
      .tmjp-meta { margin-left:auto; font-weight:900; font-size:15px; color: rgba(238,242,251,.9); }
      .tmjp-bar { margin-top:8px; height:8px; background: rgba(255,255,255,.10); border-radius:999px; overflow:hidden; }
      .tmjp-bar > div { height:100%; background: rgba(255,216,150,.85); }
    `;
    document.head.appendChild(s);
  }

  function findContainer() {
    return $(PRIMARY_CONTAINER_SELECTOR) || $(FALLBACK_CONTAINER_SELECTOR);
  }

  function showDown(container) {
    ensureStyles();
    container.innerHTML = `
      <div class="tmjp-card tmjp-down">
        <h2>Jackpot temporarily down</h2>
        <p>Please try again later.</p>
      </div>
    `;
  }

  async function healthCheck() {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const r = await fetch(`${API_BASE}/state`, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!r.ok) return { ok: false };
      const j = await r.json();
      return { ok: true, state: j };
    } catch {
      return { ok: false };
    }
  }

  function fmtAmount(a) {
    const n = Number(a) || 0;
    return (n / 100).toLocaleString("en-US", { maximumFractionDigits: 2 });
  }

  function msLeft(iso) {
    if (!iso) return 0;
    const t = new Date(iso).getTime();
    return Math.max(0, t - Date.now());
  }

  function statusText(round) {
    if (!round) return "Loading...";
    if (round.state === "WAITING") return "Waiting for players";
    if (round.state === "STARTING") return `Starting in ${Math.ceil(msLeft(round.starts_at) / 1000)}s`;
    if (round.state === "REVEALING") {
      const secondsLeft = Math.max(0, Math.ceil(msLeft(round.reveals_at) / 1000));
      return `Announcing winner in ${secondsLeft}s`;
    }
    if (round.state === "FINISHED") return `Winner: ${round.winner_username || "?"}`;
    return String(round.state);
  }

  function buildJackpotUI(container) {
    ensureStyles();
    const avatarCache = new Map();
    const avatarPending = new Set();
    let latestSnapshot = null;
    let repaintQueued = false;
    let winnerStage = { username: "", until: 0, timer: null };
    let joinRequestInFlight = false;
    let ui = null;

    const normalizeUsername = (value) => String(value || "").trim();
    const usernameKey = (value) => normalizeUsername(value).toLowerCase();
    const getCachedAvatar = (username) => {
      const key = usernameKey(username);
      if (!key) return null;
      return avatarCache.get(key) || null;
    };
    const getStatusText = (round) => {
      if (winnerStage.username && Date.now() < winnerStage.until) {
        return `Winner is ${winnerStage.username}`;
      }
      return statusText(round);
    };
    const isWinnerStageActive = () =>
      Boolean(winnerStage.username) && Date.now() < winnerStage.until;
    const isAnnouncingStage = (round) => String(round?.state || "") === "REVEALING";
    const isJoinLocked = (round) => isAnnouncingStage(round) || isWinnerStageActive();
    const updateStatus = () => {
      $("#tmjp-status", container).textContent = getStatusText(latestSnapshot?.round);
    };
    const updateJoinButtonState = () => {
      const joinBtn = $("#tmjp-join", container);
      if (!joinBtn) return;
      joinBtn.disabled = joinRequestInFlight || isJoinLocked(latestSnapshot?.round);
    };
    const scheduleRepaint = () => {
      if (repaintQueued) return;
      repaintQueued = true;
      setTimeout(() => {
        repaintQueued = false;
        if (!currentlyMounted || !latestSnapshot || !ui) return;
        ui.setSnapshot(latestSnapshot);
      }, 0);
    };
    const ensureAvatarLoaded = async (username) => {
      const cleanUsername = normalizeUsername(username);
      const key = usernameKey(cleanUsername);
      if (!key || avatarCache.has(key) || avatarPending.has(key)) return;

      avatarPending.add(key);
      try {
        const accessToken = (localStorage.getItem("accessToken") || "").trim();
        const query = new URLSearchParams({ username: cleanUsername });
        const response = await fetch(`${USER_PROFILE_API_URL}?${query.toString()}`, {
          method: "GET",
          headers: {
            accept: "application/json",
            "accept-language": "en-US,en;q=0.9,de;q=0.8",
            authorization: "Bearer " + accessToken,
          },
          mode: "cors",
          credentials: "include",
        });

        const payload = await response.json().catch(() => null);
        const avatar =
          typeof payload?.avatar === "string" ? payload.avatar.trim() : "";
        avatarCache.set(key, avatar || null);
      } catch {
        avatarCache.set(key, null);
      } finally {
        avatarPending.delete(key);
        scheduleRepaint();
      }
    };

    container.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "tmjp-wrap";

    const header = document.createElement("div");
    header.className = "tmjp-card";
    header.innerHTML = `
      <div class="tmjp-row" style="justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div class="tmjp-col" style="gap:4px;">
          <div class="tmjp-title">Jackpot</div>
        </div>
        <div class="tmjp-row" style="gap:10px; flex-wrap:wrap; justify-content:flex-end;">
          <div class="tmjp-pill"><span>Total pot:</span><span id="tmjp-pot">0</span></div>
        </div>
      </div>

      <div class="tmjp-row" style="margin-top:12px; gap:10px; flex-wrap:wrap;">
        <input class="tmjp-input" id="tmjp-amount" type="number" min="1" step="1" placeholder="Bet amount" />
        <button class="tmjp-btn" id="tmjp-join">Join jackpot</button>
        <div class="tmjp-sub" id="tmjp-joinhint"></div>
      </div>
      <div class="tmjp-err" id="tmjp-err" style="margin-top:8px; display:none;"></div>
    `;

    const status = document.createElement("div");
    status.className = "tmjp-status-banner";
    status.id = "tmjp-status";
    status.textContent = "Loading...";

    const players = document.createElement("div");
    players.className = "tmjp-card";
    players.innerHTML = `
      <div class="tmjp-row" style="justify-content:space-between;">
        <div class="tmjp-title" style="font-size:16px;">Players</div>
        <div class="tmjp-sub" id="tmjp-count">0 players</div>
      </div>
      <div class="tmjp-list" id="tmjp-list"></div>
    `;

    wrap.appendChild(header);
    wrap.appendChild(status);
    wrap.appendChild(players);
    container.appendChild(wrap);

    ui = {
      setError(msg) {
        const el = $("#tmjp-err", container);
        if (!msg) {
          el.style.display = "none";
          el.textContent = "";
          return;
        }
        el.style.display = "block";
        el.textContent = msg;
      },
      setSnapshot(snapshot) {
        latestSnapshot = snapshot;
        const round = snapshot?.round;
        const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
        const mergedByUser = new Map();

        entries.forEach((entry, index) => {
          const username = String(entry?.username || "").trim();
          const key = username ? `u:${username.toLowerCase()}` : `entry:${entry?.id ?? index}`;
          const amount = Number(entry?.amount) || 0;
          const cachedAvatar = getCachedAvatar(username);

          if (!mergedByUser.has(key)) {
            mergedByUser.set(key, {
              username,
              avatar_url: entry?.avatar_url || cachedAvatar || null,
              amount,
            });
            return;
          }

          const existing = mergedByUser.get(key);
          existing.amount += amount;
          if (!existing.avatar_url && entry?.avatar_url) {
            existing.avatar_url = entry.avatar_url;
          }
          if (!existing.avatar_url && cachedAvatar) {
            existing.avatar_url = cachedAvatar;
          }
          if (!existing.username && username) {
            existing.username = username;
          }
        });

        const mergedEntries = Array.from(mergedByUser.values());

        updateStatus();
        updateJoinButtonState();

        const totalPot = mergedEntries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        $("#tmjp-pot", container).textContent = fmtAmount(totalPot);

        $("#tmjp-count", container).textContent =
          `${mergedEntries.length} player${mergedEntries.length === 1 ? "" : "s"}`;

        const list = $("#tmjp-list", container);
        list.innerHTML = "";

        for (const e of mergedEntries) {
          if (!e.avatar_url && e.username) {
            ensureAvatarLoaded(e.username);
          }
          const chance = totalPot > 0
            ? Math.max(0, Math.min(100, (Number(e.amount) / totalPot) * 100))
            : 0;
          const row = document.createElement("div");
          row.className = "tmjp-msg";
          row.innerHTML = `
            <div class="tmjp-msg-inner">
              <div class="tmjp-avatarwrap">
                <div class="tmjp-avatar">
                  ${e.avatar_url ? `<img src="${e.avatar_url}" alt="">` : `<span style="color:#EEF2FB;font-weight:900;">?</span>`}
                </div>
              </div>
              <div style="flex:1; display:flex; flex-direction:column;">
                <div class="tmjp-row">
                  <div class="tmjp-name">${String(e.username || "")}</div>
                  <div class="tmjp-meta">${fmtAmount(e.amount)} | ${chance.toFixed(1)}%</div>
                </div>
                <div class="tmjp-bar" title="${chance.toFixed(1)}%">
                  <div style="width:${chance}%;"></div>
                </div>
              </div>
            </div>
          `;
          list.appendChild(row);
        }
      },
      showWinner(username) {
        const cleanUsername = normalizeUsername(username);
        if (!cleanUsername) return;

        winnerStage = {
          username: cleanUsername,
          until: Date.now() + WINNER_STAGE_MS,
          timer: winnerStage.timer,
        };
        if (winnerStage.timer) {
          clearTimeout(winnerStage.timer);
        }
        winnerStage.timer = setTimeout(() => {
          winnerStage.timer = null;
          if (!currentlyMounted) return;
          updateStatus();
          updateJoinButtonState();
        }, WINNER_STAGE_MS + 25);

        updateStatus();
        updateJoinButtonState();
      },
      wireJoin() {
        const btn = $("#tmjp-join", container);
        const amtEl = $("#tmjp-amount", container);
        const hint = $("#tmjp-joinhint", container);
        const getJoinCurrency = () => {
          const currencyPathEl =
            document.getElementsByClassName("flex items-center gap-0.5 cursor-pointer")?.[0]
              ?.children?.[0]?.children?.[0] || null;
          const hasOpacity = Boolean(
            currencyPathEl?.getAttribute && currencyPathEl.getAttribute("opacity")
          );
          return hasOpacity ? "MBX" : "MUSD";
        };

        btn.addEventListener("click", async () => {
          if (isJoinLocked(latestSnapshot?.round)) return;
          ui.setError("");

          const amt = Number(amtEl.value);
          if (!Number.isFinite(amt) || amt <= 0) {
            hint.textContent = "";
            ui.setError("Enter a valid amount.");
            return;
          }

          const accessToken = (localStorage.getItem("accessToken") || "").trim();
          if (!accessToken) {
            hint.textContent = "";
            ui.setError("Missing access token. Please log in again.");
            return;
          }

          joinRequestInFlight = true;
          updateJoinButtonState();
          hint.textContent = "Joining...";

          try {
            const tipAmount = Math.floor(amt * 100);
            if (!Number.isFinite(tipAmount) || tipAmount <= 0) {
              hint.textContent = "";
              ui.setError("Amount is too small.");
              return;
            }
            const tipCurrency = getJoinCurrency();

            const r = await fetch("https://api.mm2wild.com/user/tipUser", {
              method: "POST",
              headers: {
                accept: "application/json",
                "accept-language": "en-US,en;q=0.9,de;q=0.8",
                authorization: "Bearer " + accessToken,
                "content-type": "application/json",
              },
              referrer: "https://mm2wild.com/",
              body: JSON.stringify({
                username: JACKPOT_RECEIVER_USERNAME,
                amount: tipAmount,
                showInChat: false,
                currency: tipCurrency,
              }),
              mode: "cors",
              credentials: "include",
            });

            const j = await r.json().catch(() => ({}));
            if (!r.ok) {
              ui.setError(j?.reason || j?.error || "Tip failed.");
              hint.textContent = "";
            } else {
              hint.textContent = "Sucessfully joined Jackpot!";
              setTimeout(() => {
                if (hint.textContent === "Sucessfully joined Jackpot!") {
                  hint.textContent = "";
                }
              }, 3000);
              amtEl.value = "";
            }
          } catch {
            ui.setError("Network error.");
            hint.textContent = "";
          } finally {
            joinRequestInFlight = false;
            updateJoinButtonState();
          }
        });

        updateJoinButtonState();
      },
    };

    ui.wireJoin();
    return ui;
  }

  function waitForContainer(timeoutMs = 8000) {
    return new Promise((resolve) => {
      const start = Date.now();

      const tryNow = () => {
        const c = findContainer();
        if (c) return resolve(c);
        if (Date.now() - start > timeoutMs) return resolve(null);
        return null;
      };

      if (tryNow()) return;

      const obs = new MutationObserver(() => {
        const got = tryNow();
        if (got) {
          obs.disconnect();
          resolve(got);
        }
      });

      obs.observe(document.documentElement, { childList: true, subtree: true });

      setTimeout(() => {
        obs.disconnect();
        resolve(findContainer());
      }, timeoutMs);
    });
  }

  async function mountIfFairness() {
    const normalizedPath = String(location.pathname || "").replace(/\/+$/, "") || "/";
    if (normalizedPath !== "/fairness") {
      if (currentlyMounted) {
        stopSSE();
        disconnectObserver();
        currentlyMounted = false;
      }
      return;
    }

    document.title = "Jackpot";

    if (currentlyMounted) return;

    const container = await waitForContainer();
    if (!container) return;

    currentlyMounted = true;

    container.innerHTML = "";

    const hc = await healthCheck();
    if (!hc.ok) {
      showDown(container);
      return;
    }

    const ui = buildJackpotUI(container);
    ui.setSnapshot(hc.state);

    stopSSE();
    try {
      currentES = new EventSource(`${API_BASE}/events`, { withCredentials: true });

      currentES.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "snapshot" && msg.snapshot) ui.setSnapshot(msg.snapshot);
          if (msg.type === "winner" && msg.winner) ui.showWinner(msg.winner);
        } catch {}
      };

      currentES.onerror = () => {
        stopSSE();
        showDown(container);
      };
    } catch {
      showDown(container);
    }
  }

  function hookHistory() {
    const _push = history.pushState;
    const _replace = history.replaceState;

    history.pushState = function (...args) {
      const ret = _push.apply(this, args);
      window.dispatchEvent(new Event("tm:locationchange"));
      return ret;
    };
    history.replaceState = function (...args) {
      const ret = _replace.apply(this, args);
      window.dispatchEvent(new Event("tm:locationchange"));
      return ret;
    };

    window.addEventListener("popstate", () => {
      window.dispatchEvent(new Event("tm:locationchange"));
    });

    window.addEventListener("tm:locationchange", () => {
      setTimeout(mountIfFairness, 50);
    });
  }

  hookHistory();
  mountIfFairness(); // initial load
})();



