(function () {
  "use strict";

  let ENTRIES = [];
  let ICAROS = [];
  const app = document.getElementById("app");

  // --- Config ---

  var API_URL = location.hostname === "localhost"
    ? "http://localhost:8787"
    : "https://shipibo-api.brett-5db.workers.dev";

  var GOOGLE_CLIENT_ID = "1031125691626-be1alhdjerga7uicudgmgaghsh3ad6je.apps.googleusercontent.com";

  // --- Auth State ---

  var currentUser = null;
  var userProgress = {}; // keyed by icaro_id

  function getRedirectUri() {
    return location.origin + "/auth/callback/";
  }

  function getGoogleAuthUrl() {
    var params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: getRedirectUri(),
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent"
    });
    return "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString();
  }

  // --- API Client (token-based auth via localStorage) ---

  function getToken() {
    return localStorage.getItem("shipibo_token");
  }

  function setToken(token) {
    localStorage.setItem("shipibo_token", token);
  }

  function clearToken() {
    localStorage.removeItem("shipibo_token");
  }

  async function api(path, options) {
    var opts = options || {};
    var headers = {};
    var token = getToken();
    if (token) {
      headers["Authorization"] = "Bearer " + token;
    }
    if (opts.body) {
      headers["Content-Type"] = "application/json";
    }
    var res = await fetch(API_URL + path, {
      method: opts.method || "GET",
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    if (!res.ok && res.status === 401) {
      currentUser = null;
      clearToken();
      renderNav();
      return null;
    }
    return res.json();
  }

  async function checkAuth() {
    if (!getToken()) {
      currentUser = null;
      renderNav();
      return;
    }
    try {
      var data = await api("/api/auth/me");
      if (data && data.user) {
        currentUser = data.user;
      } else {
        currentUser = null;
        clearToken();
      }
    } catch (e) {
      currentUser = null;
    }
    renderNav();
  }

  async function handleOAuthCallback() {
    var params = new URLSearchParams(window.location.search);
    var code = params.get("code");
    if (!code) return false;

    try {
      var data = await api("/api/auth/google", {
        method: "POST",
        body: { code: code, redirect_uri: getRedirectUri() }
      });
      if (data && data.token) {
        setToken(data.token);
      }
      if (data && data.user) {
        currentUser = data.user;
      }
    } catch (e) {
      // OAuth callback failed silently
    }

    // Redirect to home
    window.location.href = location.origin + "/#/icaros";
    return true;
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    clearToken();
    currentUser = null;
    userProgress = {};
    renderNav();
    route();
  }

  // --- Progress ---

  async function loadProgress() {
    if (!currentUser) return;
    try {
      var data = await api("/api/progress");
      if (data && data.progress) {
        userProgress = {};
        data.progress.forEach(function (p) {
          userProgress[p.icaroId] = p;
        });
      }
    } catch (e) {
      // silent
    }
  }

  async function trackIcaro(icaroId, stanzaIdx) {
    var data = await api("/api/progress/" + icaroId, {
      method: "PUT",
      body: { currentStanzaIdx: stanzaIdx || 0 }
    });
    if (data && data.progress) {
      userProgress[icaroId] = data.progress;
    }
    return data;
  }

  async function untrackIcaro(icaroId) {
    await api("/api/progress/" + icaroId, { method: "DELETE" });
    delete userProgress[icaroId];
  }

  async function updateStanzaPosition(icaroId, stanzaIdx) {
    var data = await api("/api/progress/" + icaroId, {
      method: "PUT",
      body: { currentStanzaIdx: stanzaIdx }
    });
    if (data && data.progress) {
      userProgress[icaroId] = data.progress;
    }
  }

  // --- Bookmarks ---

  var userBookmarks = []; // array of bookmark objects from API

  async function loadBookmarks() {
    if (!currentUser) return;
    try {
      var data = await api("/api/bookmarks");
      if (data && data.bookmarks) {
        userBookmarks = data.bookmarks;
      }
    } catch (e) {
      // silent
    }
  }

  function findBookmark(type, opts) {
    return userBookmarks.find(function (b) {
      if (b.type !== type) return false;
      if (type === "word") return b.entryId === opts.entryId;
      if (type === "phrase") return b.icaroId === opts.icaroId && b.phraseIdx === opts.phraseIdx;
      if (type === "stanza") return b.icaroId === opts.icaroId && b.stanzaIdx === opts.stanzaIdx;
      return false;
    });
  }

  async function addBookmark(type, opts) {
    var data = await api("/api/bookmarks", {
      method: "POST",
      body: {
        type: type,
        icaroId: opts.icaroId || null,
        stanzaIdx: opts.stanzaIdx != null ? opts.stanzaIdx : null,
        phraseIdx: opts.phraseIdx != null ? opts.phraseIdx : null,
        entryId: opts.entryId || null
      }
    });
    if (data && data.bookmark) {
      userBookmarks.push(data.bookmark);
    }
    return data;
  }

  async function removeBookmark(bookmarkId) {
    await api("/api/bookmarks/" + bookmarkId, { method: "DELETE" });
    userBookmarks = userBookmarks.filter(function (b) { return b.id !== bookmarkId; });
  }

  function bookmarkBtnHTML(type, opts, extraClass) {
    var existing = findBookmark(type, opts);
    var active = existing ? " bookmark-btn-active" : "";
    var dataAttrs = ' data-bm-type="' + type + '"';
    if (opts.icaroId != null) dataAttrs += ' data-bm-icaro="' + esc(String(opts.icaroId)) + '"';
    if (opts.stanzaIdx != null) dataAttrs += ' data-bm-stanza="' + opts.stanzaIdx + '"';
    if (opts.phraseIdx != null) dataAttrs += ' data-bm-phrase="' + opts.phraseIdx + '"';
    if (opts.entryId != null) dataAttrs += ' data-bm-entry="' + opts.entryId + '"';
    if (existing) dataAttrs += ' data-bm-id="' + existing.id + '"';
    return '<button class="bookmark-btn' + active + (extraClass ? " " + extraClass : "") + '"' + dataAttrs + ' title="' + (existing ? "Remove bookmark" : "Bookmark") + '">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + (existing ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
      '</button>';
  }

  function wireBookmarkButtons(container) {
    if (!currentUser) return;
    (container || document).querySelectorAll(".bookmark-btn").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.preventDefault();
        e.stopPropagation();
        btn.disabled = true;
        var bmId = btn.getAttribute("data-bm-id");
        if (bmId) {
          await removeBookmark(parseInt(bmId));
          btn.removeAttribute("data-bm-id");
          btn.classList.remove("bookmark-btn-active");
          btn.querySelector("svg").setAttribute("fill", "none");
          btn.title = "Bookmark";
        } else {
          var type = btn.getAttribute("data-bm-type");
          var opts = {};
          if (btn.getAttribute("data-bm-icaro")) opts.icaroId = btn.getAttribute("data-bm-icaro");
          if (btn.getAttribute("data-bm-stanza")) opts.stanzaIdx = parseInt(btn.getAttribute("data-bm-stanza"));
          if (btn.getAttribute("data-bm-phrase")) opts.phraseIdx = parseInt(btn.getAttribute("data-bm-phrase"));
          if (btn.getAttribute("data-bm-entry")) opts.entryId = parseInt(btn.getAttribute("data-bm-entry"));
          var data = await addBookmark(type, opts);
          if (data && data.bookmark) {
            btn.setAttribute("data-bm-id", data.bookmark.id);
            btn.classList.add("bookmark-btn-active");
            btn.querySelector("svg").setAttribute("fill", "currentColor");
            btn.title = "Remove bookmark";
          }
        }
        btn.disabled = false;
      });
    });
  }

  // --- Feedback ---

  function showFeedbackModal(targetType, targetId, targetLabel) {
    // Remove any existing modal
    var existing = document.getElementById("feedback-modal");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "feedback-modal";
    overlay.className = "feedback-overlay";
    overlay.innerHTML = '<div class="feedback-modal">' +
      '<div class="feedback-modal-header">' +
      '<h3 class="font-display text-xl text-ink">Report Issue</h3>' +
      '<button class="feedback-modal-close" id="feedback-close">\u00d7</button>' +
      '</div>' +
      '<p class="text-ink-muted text-sm mb-4">About: ' + esc(targetLabel) + '</p>' +
      '<div class="feedback-field mb-3">' +
      '<label class="text-xs text-ink-muted uppercase tracking-wide mb-1">Category</label>' +
      '<div class="feedback-categories" id="feedback-categories">' +
      '<button class="feedback-cat-btn feedback-cat-active" data-cat="incorrect">Incorrect</button>' +
      '<button class="feedback-cat-btn" data-cat="missing">Missing</button>' +
      '<button class="feedback-cat-btn" data-cat="suggestion">Suggestion</button>' +
      '</div></div>' +
      '<div class="feedback-field mb-4">' +
      '<label class="text-xs text-ink-muted uppercase tracking-wide mb-1">Details</label>' +
      '<textarea class="feedback-textarea" id="feedback-message" rows="4" placeholder="Describe the issue..."></textarea>' +
      '</div>' +
      '<div class="feedback-actions">' +
      '<button class="feedback-cancel-btn" id="feedback-cancel">Cancel</button>' +
      '<button class="feedback-submit-btn" id="feedback-submit">Submit</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var selectedCat = "incorrect";

    // Category selection
    overlay.querySelectorAll(".feedback-cat-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        overlay.querySelectorAll(".feedback-cat-btn").forEach(function (b) { b.classList.remove("feedback-cat-active"); });
        btn.classList.add("feedback-cat-active");
        selectedCat = btn.getAttribute("data-cat");
      });
    });

    // Close
    function closeModal() { overlay.remove(); }
    document.getElementById("feedback-close").addEventListener("click", closeModal);
    document.getElementById("feedback-cancel").addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    // Submit
    document.getElementById("feedback-submit").addEventListener("click", async function () {
      var message = document.getElementById("feedback-message").value.trim();
      if (!message) {
        document.getElementById("feedback-message").focus();
        return;
      }
      var submitBtn = document.getElementById("feedback-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      try {
        await api("/api/feedback", {
          method: "POST",
          body: {
            targetType: targetType,
            targetId: targetId,
            category: selectedCat,
            message: message
          }
        });
        overlay.querySelector(".feedback-modal").innerHTML =
          '<div class="feedback-done">' +
          '<p class="font-display text-xl text-ink mb-2">Thank you!</p>' +
          '<p class="text-ink-muted text-sm">Your feedback has been submitted.</p>' +
          '<button class="feedback-cancel-btn mt-4" id="feedback-done-close">Close</button>' +
          '</div>';
        document.getElementById("feedback-done-close").addEventListener("click", closeModal);
      } catch (e) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit";
      }
    });
  }

  function feedbackBtnHTML(targetType, targetId, targetLabel) {
    if (!currentUser) return "";
    return '<button class="feedback-btn" data-fb-type="' + esc(targetType) +
      '" data-fb-id="' + esc(targetId) +
      '" data-fb-label="' + esc(targetLabel) + '">Report issue</button>';
  }

  function wireFeedbackButtons(container) {
    if (!currentUser) return;
    (container || document).querySelectorAll(".feedback-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showFeedbackModal(
          btn.getAttribute("data-fb-type"),
          btn.getAttribute("data-fb-id"),
          btn.getAttribute("data-fb-label")
        );
      });
    });
  }

  // --- Nav Rendering ---
  // Note: all user-supplied values go through esc() which uses textContent for safe escaping

  function renderNav() {
    var nav = document.getElementById("site-nav");
    if (!nav) return;

    var links = '<a href="#/" class="site-nav-link">Browse</a>' +
      '<a href="#/icaros" class="site-nav-link">Icaros</a>' +
      '<a href="#/about" class="site-nav-link">About</a>';

    if (currentUser) {
      links += '<a href="#/bookmarks" class="site-nav-link">Bookmarks</a>';
      links += '<a href="#/review" class="site-nav-link">Review</a>';
      links += '<a href="#/contributions" class="site-nav-link">Contribute</a>';
      if (currentUser.role === "admin") {
        links += '<a href="#/admin/feedback" class="site-nav-link">Admin</a>';
      }
      links += '<div class="user-menu">' +
        '<button class="user-menu-btn" id="user-menu-btn">';
      if (currentUser.avatarUrl) {
        links += '<img src="' + esc(currentUser.avatarUrl) + '" alt="" class="user-avatar">';
      } else {
        links += '<span class="user-avatar-placeholder">' + esc(currentUser.name.charAt(0)) + '</span>';
      }
      links += '</button>' +
        '<div class="user-dropdown hidden" id="user-dropdown">' +
        '<div class="user-dropdown-name">' + esc(currentUser.name) + '</div>' +
        '<div class="user-dropdown-email">' + esc(currentUser.email) + '</div>' +
        '<button class="user-dropdown-logout" id="logout-btn">Sign out</button>' +
        '</div></div>';
    } else {
      links += '<a href="' + getGoogleAuthUrl() + '" class="sign-in-btn">Sign in</a>';
    }

    // Safe: all dynamic values escaped via esc()
    nav.textContent = "";
    nav.insertAdjacentHTML("afterbegin", links);

    // Wire up user menu
    var menuBtn = document.getElementById("user-menu-btn");
    var dropdown = document.getElementById("user-dropdown");
    var logoutBtn = document.getElementById("logout-btn");

    if (menuBtn && dropdown) {
      menuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        dropdown.classList.toggle("hidden");
      });
      document.addEventListener("click", function () {
        dropdown.classList.add("hidden");
      });
    }
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        logout();
      });
    }
  }

  // --- Data ---

  async function loadEntries() {
    const res = await fetch("/data/entries.json");
    ENTRIES = await res.json();
  }

  async function loadIcaros() {
    const res = await fetch("/data/icaros.json");
    ICAROS = await res.json();
  }

  async function loadAll() {
    // Check for OAuth callback first — handle it and stop, the redirect will reload the app
    if (window.location.pathname === "/auth/callback" || window.location.pathname === "/auth/callback/") {
      await handleOAuthCallback();
      return;
    }

    await Promise.all([loadEntries(), loadIcaros()]);
    await checkAuth();
    await Promise.all([loadProgress(), loadBookmarks()]);
    route();
  }

  // --- Router ---

  function route() {
    const hash = location.hash || "#/";
    const [path, qs] = hash.slice(1).split("?");
    const params = new URLSearchParams(qs || "");

    if (path === "/about") {
      renderAbout();
    } else if (path === "/bookmarks") {
      renderBookmarks();
    } else if (path === "/review") {
      renderReview(params);
    } else if (path === "/admin/feedback") {
      renderAdminFeedback();
    } else if (path === "/contributions") {
      renderContributions();
    } else if (path === "/contributions/new") {
      renderContributionEditor(null);
    } else if (path.match(/^\/contributions\/\d+\/edit$/)) {
      var cid = parseInt(path.split("/")[2], 10);
      renderContributionEditor(cid);
    } else if (path === "/admin/audio") {
      renderAdminAudio();
    } else if (path === "/admin/contributions") {
      renderAdminContributions();
    } else if (path === "/icaros") {
      renderIcaroIndex();
    } else if (path.match(/^\/icaro\/\d+\/learn$/)) {
      var id = parseInt(path.split("/")[2], 10);
      location.hash = "#/icaro/" + id;
    } else if (path.match(/^\/icaro\/\d+$/)) {
      var id = parseInt(path.split("/")[2], 10);
      renderIcaro(id);
    } else if (path.startsWith("/entry/")) {
      const id = parseInt(path.split("/")[2], 10);
      renderEntry(id);
    } else if (path === "/search") {
      renderSearch(params.get("q") || "");
    } else {
      renderBrowse(params.get("letter") || null);
    }
  }

  window.addEventListener("hashchange", route);

  // --- Search ---

  function searchEntries(query) {
    const q = query.toLowerCase();
    return ENTRIES.filter(function (entry) {
      if (entry.headword.toLowerCase().includes(q)) return true;
      if (entry.definitions_english && entry.definitions_english.some(function (d) { return d.toLowerCase().includes(q); })) return true;
      if (entry.definitions_spanish && entry.definitions_spanish.some(function (d) { return d.toLowerCase().includes(q); })) return true;
      return false;
    }).slice(0, 50);
  }

  function computeLetters() {
    var letters = new Set();
    ENTRIES.forEach(function (e) {
      var clean = e.headword.replace(/^[-\u2014]/, "");
      if (clean.length > 0) letters.add(clean[0].toLowerCase());
    });
    return Array.from(letters).sort();
  }

  // --- Helpers ---

  function esc(str) {
    if (!str) return "";
    var d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function entryCardHTML(entry) {
    var defs = "";
    if (entry.definitions_english && entry.definitions_english.length > 0) {
      defs = '<p class="text-ink-light text-sm mt-1 leading-relaxed">' + esc(entry.definitions_english.slice(0, 3).join(" ; ")) + "</p>";
    } else if (entry.definitions_spanish && entry.definitions_spanish.length > 0) {
      defs = '<p class="text-ink-muted text-sm mt-1 italic leading-relaxed">' + esc(entry.definitions_spanish.slice(0, 2).join(" ; ")) + "</p>";
    }
    var badge = entry.part_of_speech ? ' <span class="badge">' + esc(entry.part_of_speech) + "</span>" : "";
    return '<a href="#/entry/' + entry.id + '" class="entry-card">' +
      '<div class="flex items-baseline gap-2.5">' +
      '<span class="font-display text-xl text-ink">' + esc(entry.headword) + "</span>" +
      badge +
      "</div>" +
      defs +
      "</a>";
  }

  // --- Views ---

  function renderBrowse(letter) {
    document.title = "Shipibo Dictionary \u2014 Browse";
    var letters = computeLetters();
    var filtered = ENTRIES;
    if (letter) {
      filtered = ENTRIES.filter(function (e) {
        var clean = e.headword.replace(/^[-\u2014]/, "");
        return clean.length > 0 && clean[0].toLowerCase() === letter;
      });
    }

    var searchIcon = '<svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>';

    var html = '<div class="mb-12">' +
      '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">Find a word</h1>' +
      '<p class="text-ink-muted text-lg font-light mb-8">A bilingual dictionary of the Shipibo language from the Peruvian Amazon</p>' +
      '<div class="relative">' +
      searchIcon +
      '<input type="search" id="search-input" placeholder="Search Shipibo, Spanish, or English\u2026" class="search-input" autocomplete="off">' +
      "</div>" +
      '<div id="search-results" class="hidden mt-6"></div>' +
      "</div>";

    // Alphabet nav
    if (letters.length > 0) {
      html += '<div class="flex flex-wrap gap-1 mb-6">';
      html += '<a href="#/" class="alpha-link' + (!letter ? " active" : "") + '">All</a>';
      letters.forEach(function (l) {
        html += '<a href="#/?letter=' + l + '" class="alpha-link' + (letter === l ? " active" : "") + '">' + l.toUpperCase() + "</a>";
      });
      html += "</div>";
    }

    // Count
    html += '<p class="text-sm text-ink-muted mb-4 font-light">' +
      filtered.length + " " + (filtered.length === 1 ? "entry" : "entries") +
      (letter ? ' starting with "' + letter.toUpperCase() + '"' : "") +
      "</p>";

    // Entries list
    html += '<div class="entries-container">';
    if (filtered.length > 0) {
      filtered.forEach(function (entry) {
        html += entryCardHTML(entry);
      });
    } else {
      html += '<div class="py-12 text-center text-ink-muted"><p>No entries found.</p></div>';
    }
    html += "</div>";

    app.innerHTML = html;

    // Wire up live search
    var input = document.getElementById("search-input");
    var resultsDiv = document.getElementById("search-results");
    var timeout = null;

    input.addEventListener("input", function () {
      clearTimeout(timeout);
      var q = input.value.trim();
      if (q.length < 2) {
        resultsDiv.classList.add("hidden");
        resultsDiv.innerHTML = "";
        return;
      }
      timeout = setTimeout(function () {
        var results = searchEntries(q);
        var rhtml = '<p class="text-sm text-ink-muted mb-4 font-light">' +
          results.length + " " + (results.length === 1 ? "result" : "results") +
          ' for <span class="font-semibold text-ink">"' + esc(q) + '"</span></p>';
        if (results.length > 0) {
          rhtml += '<div class="entries-container">';
          results.forEach(function (entry) {
            rhtml += entryCardHTML(entry);
          });
          rhtml += "</div>";
        } else {
          rhtml += '<div class="py-12 text-center"><p class="text-ink-muted">No entries found for "' + esc(q) + '"</p>' +
            '<p class="text-sm text-ink-muted font-light">Try a different spelling or search in another language</p></div>';
        }
        resultsDiv.innerHTML = rhtml;
        resultsDiv.classList.remove("hidden");
      }, 250);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var q = input.value.trim();
        if (q.length >= 2) {
          location.hash = "#/search?q=" + encodeURIComponent(q);
        }
      }
    });

    input.focus();
  }

  function renderSearch(query) {
    document.title = "Search \u201c" + query + "\u201d \u2014 Shipibo Dictionary";
    var results = query ? searchEntries(query) : [];

    var searchIcon = '<svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>';

    var html = '<div class="mb-8">' +
      '<div class="relative">' +
      searchIcon +
      '<input type="search" id="search-input" value="' + esc(query) + '" placeholder="Search Shipibo, Spanish, or English\u2026" class="search-input" autocomplete="off">' +
      "</div></div>";

    if (query) {
      html += '<p class="text-sm text-ink-muted mb-4 font-light">' +
        results.length + " " + (results.length === 1 ? "result" : "results") +
        ' for <span class="font-semibold text-ink">"' + esc(query) + '"</span></p>';

      if (results.length > 0) {
        html += '<div class="entries-container">';
        results.forEach(function (entry) {
          html += entryCardHTML(entry);
        });
        html += "</div>";
      } else {
        html += '<div class="py-16 text-center"><p class="text-ink-muted mb-1">No entries found for "' + esc(query) + '"</p>' +
          '<p class="text-sm text-ink-muted font-light">Try a different spelling or search in another language</p></div>';
      }
    } else {
      html += '<div class="py-16 text-center"><p class="text-ink-muted">Type to search across Shipibo, Spanish, and English</p></div>';
    }

    html += '<div class="mt-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      "Browse all entries</a></div>";

    app.innerHTML = html;

    var input = document.getElementById("search-input");
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var q = input.value.trim();
        if (q.length >= 2) {
          location.hash = "#/search?q=" + encodeURIComponent(q);
        }
      }
    });
    var len = input.value.length;
    input.focus();
    input.setSelectionRange(len, len);
  }

  function renderEntry(id) {
    var entry = ENTRIES.find(function (e) { return e.id === id; });
    if (!entry) {
      app.innerHTML = '<p class="text-ink-muted">Entry not found.</p>';
      return;
    }

    document.title = entry.headword + " \u2014 Shipibo Dictionary";

    var html = "";

    // Back link
    html += '<div class="mb-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      "Back to dictionary</a></div>";

    // Header
    html += '<div class="mb-8 pb-6 border-b border-earth-200">';
    html += '<div class="flex items-baseline gap-3 mb-2">';
    html += '<h1 class="font-display text-5xl text-ink tracking-tight font-light">' + esc(entry.headword) + "</h1>";
    if (entry.part_of_speech) {
      html += '<span class="badge text-sm">' + esc(entry.part_of_speech) + "</span>";
    }
    if (currentUser) {
      html += bookmarkBtnHTML("word", { entryId: entry.id });
    }
    html += "</div>";

    if (entry.variant_forms && entry.variant_forms.length > 0) {
      html += '<p class="text-ink-muted mt-2"><span class="text-sm font-semibold uppercase tracking-wide">Also</span>' +
        '<span class="ml-1.5 font-display text-lg italic">' + esc(entry.variant_forms.join(", ")) + "</span></p>";
    }
    if (entry.etymology) {
      html += '<p class="text-ink-muted text-sm italic mt-2 leading-relaxed">' + esc(entry.etymology) + "</p>";
    }
    if (entry.scientific_name) {
      html += '<p class="text-ink-muted text-sm italic mt-1">' + esc(entry.scientific_name) + "</p>";
    }
    html += "</div>";

    // Definitions
    html += '<div class="space-y-8 mb-8">';
    if (entry.definitions_english && entry.definitions_english.length > 0) {
      html += '<div><h2 class="section-label">English</h2><ol class="space-y-1.5">';
      entry.definitions_english.forEach(function (defn, i) {
        html += '<li class="flex gap-3 text-ink leading-relaxed">';
        if (entry.definitions_english.length > 1) {
          html += '<span class="font-mono text-sm text-ink-muted mt-0.5 select-none">' + (i + 1) + "</span>";
        }
        html += "<span>" + esc(defn) + "</span></li>";
      });
      html += "</ol></div>";
    }
    if (entry.definitions_spanish && entry.definitions_spanish.length > 0) {
      html += '<div><h2 class="section-label">Spanish</h2><ol class="space-y-1.5">';
      entry.definitions_spanish.forEach(function (defn, i) {
        html += '<li class="flex gap-3 text-ink-light leading-relaxed">';
        if (entry.definitions_spanish.length > 1) {
          html += '<span class="font-mono text-sm text-ink-muted mt-0.5 select-none">' + (i + 1) + "</span>";
        }
        html += "<span>" + esc(defn) + "</span></li>";
      });
      html += "</ol></div>";
    }
    html += "</div>";

    // Examples
    if (entry.examples && entry.examples.length > 0) {
      html += '<div class="mb-8"><h2 class="section-label">Examples</h2><div class="space-y-3">';
      entry.examples.forEach(function (ex) {
        html += '<div class="example-block">';
        html += '<p class="text-ink font-semibold text-sm leading-relaxed">' + esc(ex.shipibo) + "</p>";
        if (ex.english) {
          html += '<p class="text-ink-light text-sm mt-1 leading-relaxed">' + esc(ex.english) + "</p>";
        }
        if (ex.spanish) {
          html += '<p class="text-ink-muted text-sm mt-1 italic leading-relaxed">' + esc(ex.spanish) + "</p>";
        }
        html += "</div>";
      });
      html += "</div></div>";
    }

    // Usage notes
    if (entry.grammatical_notes) {
      html += '<div class="mb-8"><h2 class="section-label">Usage</h2>' +
        '<p class="text-ink-light leading-relaxed">' + esc(entry.grammatical_notes) + "</p></div>";
    }

    // Synonyms & Cross References
    if ((entry.synonyms && entry.synonyms.length > 0) || (entry.cross_references && entry.cross_references.length > 0)) {
      html += '<div class="pt-6 border-t border-earth-200 space-y-4">';

      if (entry.synonyms && entry.synonyms.length > 0) {
        html += '<div><h2 class="section-label">Synonyms</h2><div class="flex flex-wrap gap-2">';
        entry.synonyms.forEach(function (syn) {
          var related = ENTRIES.find(function (e) { return e.headword === syn; });
          if (related) {
            html += '<a href="#/entry/' + related.id + '" class="accent-link text-lg">' + esc(syn) + "</a>";
          } else {
            html += '<span class="font-display text-lg text-ink-muted">' + esc(syn) + "</span>";
          }
        });
        html += "</div></div>";
      }

      if (entry.cross_references && entry.cross_references.length > 0) {
        html += '<div><h2 class="section-label">See also</h2><div class="flex flex-wrap gap-2">';
        entry.cross_references.forEach(function (ref) {
          var related = ENTRIES.find(function (e) { return e.headword === ref; });
          if (related) {
            html += '<a href="#/entry/' + related.id + '" class="accent-link text-lg">' + esc(ref) + "</a>";
          } else {
            html += '<span class="font-display text-lg text-ink-muted">' + esc(ref) + "</span>";
          }
        });
        html += "</div></div>";
      }

      html += "</div>";
    }

    // Page reference + feedback
    html += '<div class="mt-10 pt-4 border-t border-earth-200 flex items-center justify-between">';
    if (entry.page_number) {
      html += '<p class="text-xs text-ink-muted font-light">Source: page ' + entry.page_number + "</p>";
    } else {
      html += '<span></span>';
    }
    html += feedbackBtnHTML("entry", String(entry.id), entry.headword);
    html += '</div>';

    app.textContent = "";
    app.insertAdjacentHTML("afterbegin", html);
    wireBookmarkButtons(app);
    wireFeedbackButtons(app);
    window.scrollTo(0, 0);
  }

  // --- Icaro color map ---

  var SUFFIX_COLORS = {
    red: "morph-suffix-shaman",
    green: "morph-suffix-yon",
    blue: "morph-suffix-bo",
    orange: "morph-suffix-pari",
    purple: "morph-suffix-kin",
    brown: "morph-suffix-banon"
  };

  function suffixClass(color) {
    return SUFFIX_COLORS[color] || "morph-root";
  }

  function findDictEntry(word) {
    if (!word) return null;
    var lower = word.toLowerCase().replace(/^[-\u2014]/, "");
    return ENTRIES.find(function (e) {
      return e.headword.toLowerCase() === lower;
    }) || null;
  }

  // --- Icaro Views ---

  function icaroCardHTML(icaro) {
    var phraseCount = icaro.phrases ? icaro.phrases.length : 0;
    var progress = userProgress[String(icaro.id)];
    var trackingClass = progress ? ' icaro-card-tracked' : '';

    var cardHtml = '<a href="#/icaro/' + icaro.id + '" class="icaro-card' + trackingClass + '">' +
      '<div class="flex items-baseline gap-3">' +
      '<span class="font-display text-2xl text-ink">' + esc(icaro.title) + '</span>' +
      '<span class="badge">' + phraseCount + ' phrases</span>';
    if (progress) {
      var sectionCount = icaro.song && icaro.song.sections ? icaro.song.sections.length : 0;
      var stanza = (progress.currentStanzaIdx || 0) + 1;
      cardHtml += '<span class="badge badge-progress">Stanza ' + stanza + '/' + sectionCount + '</span>';
    }
    cardHtml += '</div>' +
      '<p class="text-ink-light text-sm mt-1.5 leading-relaxed">';
    if (icaro.song && icaro.song.sections && icaro.song.sections.length > 0) {
      var firstLine = icaro.song.sections[0].lines[0];
      cardHtml += esc(firstLine ? firstLine.text : "");
      if (icaro.song.sections[0].lines.length > 1) {
        cardHtml += ' / ' + esc(icaro.song.sections[0].lines[1].text);
      }
      cardHtml += ' \u2026';
    }
    cardHtml += '</p></a>';
    return cardHtml;
  }

  function renderIcaroIndex() {
    document.title = "Icaros \u2014 Shipibo Dictionary";

    var html = '<div class="mb-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      "Back to dictionary</a></div>";

    html += '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">Icaros</h1>';
    html += '<p class="text-ink-muted text-lg font-light mb-10">Learn traditional Shipibo healing songs</p>';

    // My Icaros section (if user is tracking any)
    var trackedIcaros = ICAROS.filter(function (ic) {
      return userProgress[String(ic.id)];
    });

    if (currentUser && trackedIcaros.length > 0) {
      html += '<div class="mb-10">';
      html += '<h2 class="section-label mb-4">My Icaros</h2>';
      html += '<div class="entries-container">';
      trackedIcaros.forEach(function (icaro) {
        html += icaroCardHTML(icaro);
      });
      html += '</div></div>';
      html += '<h2 class="section-label mb-4">All Icaros</h2>';
    }

    html += '<div class="entries-container">';
    ICAROS.forEach(function (icaro) {
      html += icaroCardHTML(icaro);
    });
    html += '</div>';

    app.textContent = "";
    app.insertAdjacentHTML("afterbegin", html);
    window.scrollTo(0, 0);
  }

  function phraseCardHTML(phrase, phraseIdx, icaroId) {
    var html = '<div class="panel-card" data-phrase-idx="' + phraseIdx + '">';
    html += '<div class="panel-card-actions">';
    if (currentUser && icaroId != null) {
      html += bookmarkBtnHTML("phrase", { icaroId: String(icaroId), phraseIdx: phraseIdx }, "bookmark-btn-sm");
    }
    html += '<div class="panel-card-close" data-dismiss="' + phraseIdx + '">\u00d7</div>';
    html += '</div>';

    // Color-coded shipibo text
    html += '<div class="font-display text-xl mb-3" style="padding-right:1.5rem">';
    if (phrase.parts && phrase.parts.length > 0) {
      phrase.parts.forEach(function (part) {
        var cls = part.type === "root" ? "morph-root" : suffixClass(part.color);
        html += '<span class="' + cls + '">' + esc(part.text) + '</span>';
      });
    } else {
      html += esc(phrase.shipibo);
    }
    html += '</div>';

    // Root word with dictionary link
    if (phrase.root_word) {
      var dictEntry = findDictEntry(phrase.root_word);
      html += '<div class="mb-2">';
      html += '<span class="section-label" style="margin-bottom:0">Root</span> ';
      if (dictEntry) {
        html += '<a href="#/entry/' + dictEntry.id + '" class="accent-link">' + esc(phrase.root_word) + '</a>';
      } else {
        html += '<span class="font-display text-ink">' + esc(phrase.root_word) + '</span>';
      }
      if (phrase.part_of_speech) {
        html += ' <span class="badge">' + esc(phrase.part_of_speech) + '</span>';
      }
      if (phrase.root_meaning) {
        html += ' <span class="text-ink-light text-sm">\u2014 ' + esc(phrase.root_meaning) + '</span>';
      }
      html += '</div>';
    }

    // Suffix breakdown
    if (phrase.suffixes && phrase.suffixes.length > 0) {
      html += '<div class="mb-2">';
      html += '<span class="section-label" style="margin-bottom:0.25rem">Suffixes</span>';
      html += '<div class="space-y-1 mt-1">';
      phrase.suffixes.forEach(function (suf) {
        var cls = suffixClass(suf.color);
        html += '<div class="text-sm"><span class="font-semibold ' + cls + '">-' + esc(suf.form) + '</span> ' +
          '<span class="text-ink-light">' + esc(suf.meaning) + '</span></div>';
      });
      html += '</div></div>';
    }

    // Literal translation
    if (phrase.literal_translation) {
      html += '<div class="literal-translation">' + esc(phrase.literal_translation) + '</div>';
    }

    // Cultural note
    if (phrase.cultural_note) {
      html += '<p class="text-ink-muted text-sm italic mt-2">' + esc(phrase.cultural_note) + '</p>';
    }

    // Feedback button
    if (icaroId != null) {
      html += '<div class="mt-3 pt-2 border-t border-earth-200">' +
        feedbackBtnHTML("phrase", icaroId + ":" + phraseIdx, phrase.shipibo) +
        '</div>';
    }

    html += '</div>';
    return html;
  }

  function renderIcaro(id) {
    var icaro = ICAROS.find(function (ic) { return ic.id === id; });
    if (!icaro) {
      app.innerHTML = '<p class="text-ink-muted">Icaro not found.</p>';
      return;
    }

    document.title = icaro.title + " \u2014 Icaros \u2014 Shipibo Dictionary";
    var phrases = icaro.phrases || [];

    // Track selected phrase indices (Set-like using object)
    var selectedPhrases = {};

    var html = '<div class="mb-8">' +
      '<a href="#/icaros" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      "All icaros</a></div>";

    // Title + track button
    html += '<div class="flex items-center justify-between mb-6">';
    html += '<h1 class="font-display text-5xl text-ink tracking-tight font-light">' + esc(icaro.title) + '</h1>';
    if (currentUser) {
      var isTracked = !!userProgress[String(id)];
      html += '<button class="track-btn' + (isTracked ? ' track-btn-active' : '') + '" id="track-btn" data-icaro-id="' + id + '">' +
        '<svg class="w-5 h-5" fill="' + (isTracked ? 'currentColor' : 'none') + '" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">' +
        '<path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />' +
        '</svg>' +
        '<span>' + (isTracked ? 'Tracking' : 'Track') + '</span>' +
        '</button>';
    }
    html += '</div>';
    html += '<p class="text-ink-muted text-sm mb-8 icaro-hint">Tap a line to explore its meaning</p>';

    // Two-column layout: song + panel
    html += '<div class="icaro-layout">';

    // Song column
    html += '<div class="icaro-song-col">';
    if (icaro.song && icaro.song.sections) {
      icaro.song.sections.forEach(function (section, si) {
        html += '<div class="song-section">';
        if (currentUser) {
          html += '<div class="song-section-actions">' +
            bookmarkBtnHTML("stanza", { icaroId: String(id), stanzaIdx: si }, "bookmark-btn-sm") +
            '</div>';
        }
        if (section.repeat && section.repeat > 1) {
          html += '<div class="song-section-bracket"></div>';
          html += '<span class="song-repeat">X' + section.repeat + '</span>';
        }
        section.lines.forEach(function (line, li) {
          var pi = line.phrase_idx;
          var clickable = pi !== null && pi !== undefined;
          html += '<div class="song-line' + (clickable ? '' : '') + '"';
          if (clickable) {
            html += ' data-clickable data-phrase-idx="' + pi + '" data-section="' + si + '" data-line="' + li + '"';
          }
          html += '>' + esc(line.text);
          if (line.repeat && line.repeat > 1) {
            html += '<span class="song-line-repeat">(' + line.repeat + ')</span>';
          }
          html += '</div>';
        });
        html += '</div>';
      });
    }
    html += '</div>';

    // Side panel (desktop)
    html += '<div class="icaro-panel" id="icaro-panel">';
    html += '<div class="icaro-panel-empty" id="panel-empty">Tap a line to explore<br>its meaning</div>';
    html += '<div id="panel-cards"></div>';
    html += '</div>';

    html += '</div>'; // end icaro-layout

    // Vocabulary section (full width, below layout)
    if (icaro.vocabulary && icaro.vocabulary.length > 0) {
      html += '<div class="mt-10"><h2 class="section-label mb-4">Vocabulary</h2>';
      html += '<table class="suffix-table"><thead><tr><th>Shipibo</th><th>Type</th><th>Meaning</th></tr></thead><tbody>';
      icaro.vocabulary.forEach(function (v) {
        var dictEntry = findDictEntry(v.shipibo);
        html += '<tr><td>';
        if (dictEntry) {
          html += '<a href="#/entry/' + dictEntry.id + '" class="accent-link">' + esc(v.shipibo) + '</a>';
        } else {
          html += '<span class="font-semibold">' + esc(v.shipibo) + '</span>';
        }
        html += '</td><td><span class="badge">' + esc(v.pos || "") + '</span></td>';
        html += '<td>' + esc(v.meaning) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    // Suffix reference table
    if (icaro.suffix_reference && icaro.suffix_reference.length > 0) {
      html += '<div class="mt-10"><h2 class="section-label mb-4">Suffix Reference</h2>';
      html += '<table class="suffix-table"><thead><tr><th>Suffix</th><th>Meaning</th></tr></thead><tbody>';
      icaro.suffix_reference.forEach(function (suf) {
        html += '<tr><td class="font-semibold">-' + esc(suf.form) + '</td>';
        html += '<td>' + esc(suf.meaning) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }

    // Audio section
    html += '<div class="mt-10" id="audio-section"></div>';

    // Nav to prev/next icaro
    html += '<div class="mt-10 pt-6 border-t border-earth-200 flex justify-between">';
    if (id > 1) {
      var prev = ICAROS.find(function (ic) { return ic.id === id - 1; });
      if (prev) {
        html += '<a href="#/icaro/' + (id - 1) + '" class="back-link">' +
          '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
          esc(prev.title) + '</a>';
      }
    } else {
      html += '<span></span>';
    }
    var next = ICAROS.find(function (ic) { return ic.id === id + 1; });
    if (next) {
      html += '<a href="#/icaro/' + (id + 1) + '" class="accent-link">' +
        esc(next.title) +
        ' <svg class="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg></a>';
    }
    html += '</div>';

    // Mobile drawer
    html += '<div class="icaro-drawer-backdrop" id="drawer-backdrop"></div>';
    html += '<div class="icaro-drawer" id="icaro-drawer">';
    html += '<div class="icaro-drawer-handle"></div>';
    html += '<div class="icaro-drawer-content" id="drawer-cards"></div>';
    html += '</div>';

    app.innerHTML = html;
    wireBookmarkButtons(app);
    window.scrollTo(0, 0);

    // --- Interactive logic ---
    var panelEmpty = document.getElementById("panel-empty");
    var panelCards = document.getElementById("panel-cards");
    var drawer = document.getElementById("icaro-drawer");
    var drawerBackdrop = document.getElementById("drawer-backdrop");
    var drawerCards = document.getElementById("drawer-cards");
    var isMobile = window.innerWidth < 768;

    function updatePanel() {
      // Collect selected phrase indices in song order
      var orderedIndices = [];
      var seen = {};
      var songLines = document.querySelectorAll(".song-line[data-clickable]");
      songLines.forEach(function (el) {
        var pi = parseInt(el.getAttribute("data-phrase-idx"), 10);
        if (selectedPhrases[pi] && !seen[pi]) {
          orderedIndices.push(pi);
          seen[pi] = true;
        }
      });

      var cardsHTML = "";
      orderedIndices.forEach(function (pi) {
        cardsHTML += phraseCardHTML(phrases[pi], pi, id);
      });

      // Desktop panel
      panelCards.innerHTML = cardsHTML;
      panelEmpty.style.display = orderedIndices.length === 0 ? "" : "none";
      wireBookmarkButtons(panelCards);
      wireFeedbackButtons(panelCards);

      // Mobile drawer
      drawerCards.innerHTML = cardsHTML;
      wireBookmarkButtons(drawerCards);
      wireFeedbackButtons(drawerCards);
      if (isMobile) {
        if (orderedIndices.length > 0) {
          drawer.classList.add("active");
          drawerBackdrop.classList.add("active");
        } else {
          drawer.classList.remove("active");
          drawerBackdrop.classList.remove("active");
        }
      }

      // Wire dismiss buttons
      document.querySelectorAll(".panel-card-close").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          var pi = parseInt(btn.getAttribute("data-dismiss"), 10);
          togglePhrase(pi);
        });
      });
    }

    function togglePhrase(phraseIdx) {
      var wasSelected = !!selectedPhrases[phraseIdx];

      // Clear all existing selections
      Object.keys(selectedPhrases).forEach(function (pi) {
        delete selectedPhrases[pi];
        document.querySelectorAll('.song-line[data-phrase-idx="' + pi + '"]').forEach(function (el) {
          el.classList.remove("song-line-active");
        });
      });

      // If it wasn't already selected, select it
      if (!wasSelected) {
        selectedPhrases[phraseIdx] = true;
        document.querySelectorAll('.song-line[data-phrase-idx="' + phraseIdx + '"]').forEach(function (el) {
          el.classList.add("song-line-active");
        });
      }

      updatePanel();
    }

    // Song line click handler (event delegation)
    document.querySelector(".icaro-song-col").addEventListener("click", function (e) {
      var lineEl = e.target.closest(".song-line[data-clickable]");
      if (!lineEl) return;
      var pi = parseInt(lineEl.getAttribute("data-phrase-idx"), 10);
      togglePhrase(pi);
    });

    // Mobile drawer backdrop dismiss
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener("click", function () {
        // Close drawer, deselect all
        Object.keys(selectedPhrases).forEach(function (pi) {
          togglePhrase(parseInt(pi, 10));
        });
      });
    }

    // Handle resize
    window.addEventListener("resize", function () {
      isMobile = window.innerWidth < 768;
    });

    // Track/untrack button
    var trackBtn = document.getElementById("track-btn");
    if (trackBtn) {
      trackBtn.addEventListener("click", async function () {
        var icaroId = String(trackBtn.getAttribute("data-icaro-id"));
        var isTracked = !!userProgress[icaroId];
        trackBtn.disabled = true;

        if (isTracked) {
          await untrackIcaro(icaroId);
        } else {
          await trackIcaro(icaroId, 0);
        }

        // Update button state
        var nowTracked = !!userProgress[icaroId];
        trackBtn.className = "track-btn" + (nowTracked ? " track-btn-active" : "");
        var svgEl = trackBtn.querySelector("svg");
        if (svgEl) svgEl.setAttribute("fill", nowTracked ? "currentColor" : "none");
        var spanEl = trackBtn.querySelector("span");
        if (spanEl) spanEl.textContent = nowTracked ? "Tracking" : "Track";
        trackBtn.disabled = false;
      });
    }

    // Stanza position tracking: when a user clicks a line, update their position
    // and highlight the current stanza section
    function highlightCurrentStanza(sectionIdx) {
      var sections = document.querySelectorAll(".song-section");
      sections.forEach(function (s) { s.classList.remove("song-section-current"); });
      if (sections[sectionIdx]) {
        sections[sectionIdx].classList.add("song-section-current");
      }
    }

    if (currentUser && userProgress[String(id)]) {
      var songCol = document.querySelector(".icaro-song-col");
      if (songCol) {
        songCol.addEventListener("click", function (e) {
          var lineEl = e.target.closest(".song-line[data-clickable]");
          if (!lineEl) return;
          var sectionIdx = parseInt(lineEl.getAttribute("data-section"), 10);
          if (!isNaN(sectionIdx)) {
            highlightCurrentStanza(sectionIdx);
            updateStanzaPosition(String(id), sectionIdx);
          }
        });
      }
    }

    // Restore tracked stanza position: highlight and scroll
    var progress = userProgress[String(id)];
    if (progress && progress.currentStanzaIdx != null) {
      var sections = document.querySelectorAll(".song-section");
      if (sections[progress.currentStanzaIdx]) {
        highlightCurrentStanza(progress.currentStanzaIdx);
        setTimeout(function () {
          sections[progress.currentStanzaIdx].scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    }

    // Load audio recordings asynchronously
    loadAudioSection(id);
  }

  async function loadAudioSection(icaroId) {
    var container = document.getElementById("audio-section");
    if (!container) return;

    var data;
    try {
      var res = await fetch(API_URL + "/api/audio?icaro_id=" + icaroId);
      data = await res.json();
    } catch (e) {
      return; // silent fail — audio is optional
    }

    var recordings = data && data.recordings ? data.recordings : [];

    var html = '<h2 class="section-label mb-4">Audio Recordings</h2>';

    if (recordings.length === 0) {
      html += '<p class="text-ink-muted text-sm">No recordings yet.</p>';
    } else {
      html += '<div class="audio-list">';
      recordings.forEach(function (rec) {
        html += '<div class="audio-item">';
        html += '<div class="audio-info">';
        html += '<span class="audio-singer">' + esc(rec.singerName) + '</span>';
        if (rec.singerBio) {
          html += '<span class="audio-bio">' + esc(rec.singerBio) + '</span>';
        }
        html += '</div>';
        html += '<audio controls preload="none" class="audio-player">' +
          '<source src="' + API_URL + '/api/audio/' + rec.id + '/url" type="audio/mpeg">' +
          '</audio>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Upload button for logged-in users
    if (currentUser) {
      html += '<div class="audio-upload mt-4">';
      html += '<button class="audio-upload-btn" id="audio-upload-btn">Upload Recording</button>';
      html += '<div class="audio-upload-form hidden" id="audio-upload-form">';
      html += '<div class="feedback-field mb-3">';
      html += '<label class="text-xs text-ink-muted uppercase tracking-wide mb-1">Singer Name</label>';
      html += '<input type="text" class="feedback-textarea" id="audio-singer" style="padding:0.5rem" placeholder="Name of the singer">';
      html += '</div>';
      html += '<div class="feedback-field mb-3">';
      html += '<label class="text-xs text-ink-muted uppercase tracking-wide mb-1">Singer Bio (optional)</label>';
      html += '<input type="text" class="feedback-textarea" id="audio-bio" style="padding:0.5rem" placeholder="e.g. Maestro from Pucallpa">';
      html += '</div>';
      html += '<div class="feedback-field mb-3">';
      html += '<label class="text-xs text-ink-muted uppercase tracking-wide mb-1">Audio File (mp3, m4a, wav)</label>';
      html += '<input type="file" id="audio-file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm">';
      html += '</div>';
      html += '<div class="feedback-actions">';
      html += '<button class="feedback-cancel-btn" id="audio-cancel">Cancel</button>';
      html += '<button class="feedback-submit-btn" id="audio-submit">Upload</button>';
      html += '</div>';
      html += '</div></div>';
    }

    container.innerHTML = html;

    // Wire upload form
    var uploadBtn = document.getElementById("audio-upload-btn");
    var uploadForm = document.getElementById("audio-upload-form");
    if (uploadBtn && uploadForm) {
      uploadBtn.addEventListener("click", function () {
        uploadBtn.classList.add("hidden");
        uploadForm.classList.remove("hidden");
      });
      document.getElementById("audio-cancel").addEventListener("click", function () {
        uploadForm.classList.add("hidden");
        uploadBtn.classList.remove("hidden");
      });
      document.getElementById("audio-submit").addEventListener("click", async function () {
        var singerName = document.getElementById("audio-singer").value.trim();
        var singerBio = document.getElementById("audio-bio").value.trim();
        var fileInput = document.getElementById("audio-file");
        var file = fileInput.files[0];

        if (!singerName || !file) {
          if (!singerName) document.getElementById("audio-singer").focus();
          else fileInput.focus();
          return;
        }

        var submitBtn = document.getElementById("audio-submit");
        submitBtn.disabled = true;
        submitBtn.textContent = "Uploading...";

        var formData = new FormData();
        formData.append("file", file);
        formData.append("icaro_id", String(icaroId));
        formData.append("singer_name", singerName);
        if (singerBio) formData.append("singer_bio", singerBio);

        try {
          var token = getToken();
          var res = await fetch(API_URL + "/api/audio", {
            method: "POST",
            headers: token ? { "Authorization": "Bearer " + token } : {},
            body: formData
          });
          if (res.ok) {
            // Reload audio section
            loadAudioSection(icaroId);
          } else {
            var err = await res.json();
            submitBtn.textContent = err.error || "Upload failed";
            submitBtn.disabled = false;
          }
        } catch (e) {
          submitBtn.textContent = "Upload failed";
          submitBtn.disabled = false;
        }
      });
    }
  }

  // --- Review Mode ---

  async function updateComfort(bookmarkId, comfort) {
    await api("/api/bookmarks/" + bookmarkId, {
      method: "PUT",
      body: { comfort: comfort }
    });
    var bm = userBookmarks.find(function (b) { return b.id === bookmarkId; });
    if (bm) {
      bm.comfort = comfort;
      bm.lastReviewedAt = new Date().toISOString();
    }
  }

  function getCardContent(bm) {
    var front = "";
    var back = "";
    if (bm.type === "word") {
      var entry = ENTRIES.find(function (e) { return e.id === bm.entryId; });
      if (!entry) return null;
      front = '<span class="font-display text-4xl">' + esc(entry.headword) + '</span>';
      if (entry.part_of_speech) {
        front += '<span class="badge mt-3">' + esc(entry.part_of_speech) + '</span>';
      }
      back = '';
      if (entry.definitions_english && entry.definitions_english.length > 0) {
        back += '<div class="mb-3"><span class="section-label">English</span>';
        entry.definitions_english.forEach(function (d) {
          back += '<div class="text-ink leading-relaxed">' + esc(d) + '</div>';
        });
        back += '</div>';
      }
      if (entry.definitions_spanish && entry.definitions_spanish.length > 0) {
        back += '<div><span class="section-label">Spanish</span>';
        entry.definitions_spanish.forEach(function (d) {
          back += '<div class="text-ink-light leading-relaxed">' + esc(d) + '</div>';
        });
        back += '</div>';
      }
    } else if (bm.type === "phrase") {
      var icaro = ICAROS.find(function (ic) { return String(ic.id) === bm.icaroId; });
      var phrase = icaro && icaro.phrases ? icaro.phrases[bm.phraseIdx] : null;
      if (!phrase) return null;
      front = '<span class="font-display text-3xl">' + esc(phrase.shipibo) + '</span>';
      front += '<span class="text-ink-muted text-sm mt-2">' + esc(icaro.title) + '</span>';
      back = '';
      if (phrase.parts && phrase.parts.length > 0) {
        back += '<div class="font-display text-xl mb-3">';
        phrase.parts.forEach(function (part) {
          var cls = part.type === "root" ? "morph-root" : suffixClass(part.color);
          back += '<span class="' + cls + '">' + esc(part.text) + '</span>';
        });
        back += '</div>';
      }
      if (phrase.root_word) {
        back += '<div class="mb-2"><span class="section-label" style="margin-bottom:0">Root</span> ';
        back += '<span class="font-display text-ink">' + esc(phrase.root_word) + '</span>';
        if (phrase.root_meaning) {
          back += ' <span class="text-ink-light text-sm">\u2014 ' + esc(phrase.root_meaning) + '</span>';
        }
        back += '</div>';
      }
      if (phrase.suffixes && phrase.suffixes.length > 0) {
        back += '<div class="mb-2"><span class="section-label" style="margin-bottom:0.25rem">Suffixes</span>';
        back += '<div class="space-y-1 mt-1">';
        phrase.suffixes.forEach(function (suf) {
          var cls = suffixClass(suf.color);
          back += '<div class="text-sm"><span class="font-semibold ' + cls + '">-' + esc(suf.form) + '</span> ' +
            '<span class="text-ink-light">' + esc(suf.meaning) + '</span></div>';
        });
        back += '</div></div>';
      }
      if (phrase.literal_translation) {
        back += '<div class="literal-translation">' + esc(phrase.literal_translation) + '</div>';
      }
    } else if (bm.type === "stanza") {
      var icaro = ICAROS.find(function (ic) { return String(ic.id) === bm.icaroId; });
      if (!icaro || !icaro.song || !icaro.song.sections || !icaro.song.sections[bm.stanzaIdx]) return null;
      var section = icaro.song.sections[bm.stanzaIdx];
      front = '<div class="space-y-1">';
      section.lines.forEach(function (line) {
        front += '<div class="font-display text-xl">' + esc(line.text) + '</div>';
      });
      front += '</div>';
      front += '<span class="text-ink-muted text-sm mt-3">' + esc(icaro.title) + ' \u2014 Stanza ' + (bm.stanzaIdx + 1) + '</span>';
      // Back: show phrase breakdowns for lines in this stanza
      back = '';
      var seenPhrases = {};
      section.lines.forEach(function (line) {
        var pi = line.phrase_idx;
        if (pi != null && !seenPhrases[pi] && icaro.phrases && icaro.phrases[pi]) {
          seenPhrases[pi] = true;
          var p = icaro.phrases[pi];
          back += '<div class="mb-3 pb-2 border-b border-earth-200">';
          back += '<div class="font-display text-lg">' + esc(p.shipibo) + '</div>';
          if (p.literal_translation) {
            back += '<div class="text-ink-light text-sm">' + esc(p.literal_translation) + '</div>';
          }
          back += '</div>';
        }
      });
      if (!back) back = '<p class="text-ink-muted">No phrase breakdowns available for this stanza.</p>';
    }
    return { front: front, back: back };
  }

  function renderReview(params) {
    document.title = "Review \u2014 Shipibo Dictionary";

    if (!currentUser) {
      app.innerHTML = '<div class="mb-8">' +
        '<a href="#/" class="back-link">' +
        '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
        'Back to dictionary</a></div>' +
        '<h1 class="font-display text-5xl text-ink mb-6 tracking-tight font-light">Review</h1>' +
        '<p class="text-ink-muted">Sign in to review your bookmarks.</p>';
      return;
    }

    if (userBookmarks.length === 0) {
      app.innerHTML = '<div class="mb-8">' +
        '<a href="#/" class="back-link">' +
        '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
        'Back to dictionary</a></div>' +
        '<h1 class="font-display text-5xl text-ink mb-6 tracking-tight font-light">Review</h1>' +
        '<p class="text-ink-muted">No bookmarks to review. Bookmark words, phrases, or stanzas first.</p>';
      return;
    }

    // Filters
    var filterType = params.get("type") || "all";
    var filterComfort = params.get("comfort") || "all";
    var filterIcaro = params.get("icaro") || "all";

    // Filter bookmarks
    var deck = userBookmarks.filter(function (bm) {
      if (filterType !== "all" && bm.type !== filterType) return false;
      if (filterComfort !== "all" && bm.comfort !== filterComfort) return false;
      if (filterIcaro !== "all" && bm.icaroId !== filterIcaro) return false;
      return true;
    });

    // Sort: prioritize new and unreviewed, then by last reviewed (oldest first)
    var comfortOrder = { "new": 0, "learning": 1, "familiar": 2, "mastered": 3 };
    deck.sort(function (a, b) {
      var ca = comfortOrder[a.comfort] || 0;
      var cb = comfortOrder[b.comfort] || 0;
      if (ca !== cb) return ca - cb;
      var ta = a.lastReviewedAt || "";
      var tb = b.lastReviewedAt || "";
      return ta.localeCompare(tb);
    });

    // Build filter bar
    var html = '<div class="mb-8">' +
      '<a href="#/bookmarks" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      'Back to bookmarks</a></div>';

    html += '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">Review</h1>';
    html += '<p class="text-ink-muted text-lg font-light mb-6">' + deck.length + ' card' + (deck.length !== 1 ? 's' : '') + ' to review</p>';

    // Filter controls
    html += '<div class="review-filters mb-8">';
    html += '<div class="review-filter-group">';
    html += '<span class="text-ink-muted text-xs uppercase tracking-wide">Type</span>';
    html += '<div class="review-filter-options">';
    ["all", "word", "phrase", "stanza"].forEach(function (t) {
      var active = filterType === t ? " review-filter-active" : "";
      html += '<a href="#/review?type=' + t + '&comfort=' + filterComfort + '&icaro=' + filterIcaro + '" class="review-filter' + active + '">' + (t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)) + 's</a>';
    });
    html += '</div></div>';

    html += '<div class="review-filter-group">';
    html += '<span class="text-ink-muted text-xs uppercase tracking-wide">Level</span>';
    html += '<div class="review-filter-options">';
    ["all", "new", "learning", "familiar", "mastered"].forEach(function (c) {
      var active = filterComfort === c ? " review-filter-active" : "";
      html += '<a href="#/review?type=' + filterType + '&comfort=' + c + '&icaro=' + filterIcaro + '" class="review-filter' + active + '">' + (c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)) + '</a>';
    });
    html += '</div></div>';
    html += '</div>';

    if (deck.length === 0) {
      html += '<p class="text-ink-muted">No cards match the current filters.</p>';
      app.innerHTML = html;
      return;
    }

    // Card area
    html += '<div class="review-card-area">';
    html += '<div class="review-card" id="review-card">';
    html += '<div class="review-card-inner" id="review-card-inner">';
    html += '<div class="review-card-front" id="review-card-front"></div>';
    html += '<div class="review-card-back" id="review-card-back"></div>';
    html += '</div></div>';

    // Progress
    html += '<div class="review-progress" id="review-progress"></div>';

    // Controls
    html += '<div class="review-controls">';
    html += '<button class="review-flip-btn" id="review-flip">Flip</button>';
    html += '</div>';

    // Comfort buttons (shown after flip)
    html += '<div class="review-comfort hidden" id="review-comfort">';
    html += '<span class="text-ink-muted text-xs uppercase tracking-wide mb-2">How well do you know this?</span>';
    html += '<div class="review-comfort-btns">';
    html += '<button class="review-comfort-btn review-comfort-new" data-comfort="new">New</button>';
    html += '<button class="review-comfort-btn review-comfort-learning" data-comfort="learning">Learning</button>';
    html += '<button class="review-comfort-btn review-comfort-familiar" data-comfort="familiar">Familiar</button>';
    html += '<button class="review-comfort-btn review-comfort-mastered" data-comfort="mastered">Mastered</button>';
    html += '</div></div>';

    html += '</div>';

    app.innerHTML = html;
    window.scrollTo(0, 0);

    // --- Review interactive logic ---
    var cardIdx = 0;
    var flipped = false;
    var cardEl = document.getElementById("review-card-inner");
    var frontEl = document.getElementById("review-card-front");
    var backEl = document.getElementById("review-card-back");
    var flipBtn = document.getElementById("review-flip");
    var comfortEl = document.getElementById("review-comfort");
    var progressEl = document.getElementById("review-progress");

    function showCard() {
      if (cardIdx >= deck.length) {
        frontEl.innerHTML = '<div class="review-done"><span class="font-display text-3xl text-ink">Done!</span>' +
          '<p class="text-ink-muted mt-2">You reviewed all ' + deck.length + ' card' + (deck.length !== 1 ? 's' : '') + '.</p></div>';
        backEl.innerHTML = '';
        flipBtn.style.display = 'none';
        comfortEl.classList.add('hidden');
        progressEl.textContent = deck.length + ' / ' + deck.length;
        return;
      }
      var bm = deck[cardIdx];
      var content = getCardContent(bm);
      if (!content) {
        cardIdx++;
        showCard();
        return;
      }
      frontEl.innerHTML = '<div class="review-card-content">' + content.front + '</div>';
      backEl.innerHTML = '<div class="review-card-content">' + content.back + '</div>';
      flipped = false;
      cardEl.classList.remove("review-card-flipped");
      flipBtn.style.display = '';
      flipBtn.textContent = 'Flip';
      comfortEl.classList.add('hidden');
      progressEl.textContent = (cardIdx + 1) + ' / ' + deck.length;
    }

    function flipCard() {
      if (cardIdx >= deck.length) return;
      flipped = !flipped;
      if (flipped) {
        cardEl.classList.add("review-card-flipped");
        flipBtn.textContent = 'Show front';
        comfortEl.classList.remove('hidden');
      } else {
        cardEl.classList.remove("review-card-flipped");
        flipBtn.textContent = 'Flip';
        comfortEl.classList.add('hidden');
      }
    }

    flipBtn.addEventListener("click", flipCard);

    document.getElementById("review-card").addEventListener("click", function () {
      if (cardIdx < deck.length) flipCard();
    });

    comfortEl.querySelectorAll(".review-comfort-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var comfort = btn.getAttribute("data-comfort");
        var bm = deck[cardIdx];
        await updateComfort(bm.id, comfort);
        cardIdx++;
        showCard();
      });
    });

    showCard();
  }

  function renderBookmarks() {
    document.title = "Bookmarks \u2014 Shipibo Dictionary";

    if (!currentUser) {
      app.innerHTML = '<div class="mb-8">' +
        '<a href="#/" class="back-link">' +
        '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
        'Back to dictionary</a></div>' +
        '<h1 class="font-display text-5xl text-ink mb-6 tracking-tight font-light">Bookmarks</h1>' +
        '<p class="text-ink-muted">Sign in to save bookmarks.</p>';
      return;
    }

    var html = '<div class="mb-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      'Back to dictionary</a></div>';

    html += '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">Bookmarks</h1>';
    html += '<p class="text-ink-muted text-lg font-light mb-6">Your saved words, phrases, and stanzas</p>';
    html += '<div class="mb-10"><a href="#/review" class="review-start-btn">Review Cards</a></div>';

    if (userBookmarks.length === 0) {
      html += '<p class="text-ink-muted">No bookmarks yet. Use the bookmark icon on entries, phrases, or stanzas to save them here.</p>';
      app.innerHTML = html;
      return;
    }

    // Group by type
    var words = userBookmarks.filter(function (b) { return b.type === "word"; });
    var phrases = userBookmarks.filter(function (b) { return b.type === "phrase"; });
    var stanzas = userBookmarks.filter(function (b) { return b.type === "stanza"; });

    if (words.length > 0) {
      html += '<div class="mb-10">';
      html += '<h2 class="section-label mb-4">Words (' + words.length + ')</h2>';
      html += '<div class="entries-container">';
      words.forEach(function (bm) {
        var entry = ENTRIES.find(function (e) { return e.id === bm.entryId; });
        if (entry) {
          html += '<a href="#/entry/' + entry.id + '" class="entry-link bookmark-item">' +
            '<span class="font-display text-xl text-ink">' + esc(entry.headword) + '</span>';
          if (entry.definitions_english && entry.definitions_english.length > 0) {
            html += '<span class="text-ink-light text-sm ml-3">' + esc(entry.definitions_english[0]) + '</span>';
          }
          html += '<span class="badge bookmark-comfort-badge">' + esc(bm.comfort) + '</span>';
          html += '</a>';
        }
      });
      html += '</div></div>';
    }

    if (phrases.length > 0) {
      html += '<div class="mb-10">';
      html += '<h2 class="section-label mb-4">Phrases (' + phrases.length + ')</h2>';
      html += '<div class="entries-container">';
      phrases.forEach(function (bm) {
        var icaro = ICAROS.find(function (ic) { return String(ic.id) === bm.icaroId; });
        var phrase = icaro && icaro.phrases ? icaro.phrases[bm.phraseIdx] : null;
        if (phrase && icaro) {
          html += '<a href="#/icaro/' + icaro.id + '" class="entry-link bookmark-item">' +
            '<span class="font-display text-lg text-ink">' + esc(phrase.shipibo) + '</span>';
          if (phrase.literal_translation) {
            html += '<span class="text-ink-light text-sm ml-3">' + esc(phrase.literal_translation) + '</span>';
          }
          html += '<span class="badge bookmark-comfort-badge">' + esc(bm.comfort) + '</span>';
          html += '</a>';
        }
      });
      html += '</div></div>';
    }

    if (stanzas.length > 0) {
      html += '<div class="mb-10">';
      html += '<h2 class="section-label mb-4">Stanzas (' + stanzas.length + ')</h2>';
      html += '<div class="entries-container">';
      stanzas.forEach(function (bm) {
        var icaro = ICAROS.find(function (ic) { return String(ic.id) === bm.icaroId; });
        if (icaro && icaro.song && icaro.song.sections && icaro.song.sections[bm.stanzaIdx]) {
          var section = icaro.song.sections[bm.stanzaIdx];
          var firstLine = section.lines[0] ? section.lines[0].text : "";
          html += '<a href="#/icaro/' + icaro.id + '" class="entry-link bookmark-item">' +
            '<span class="text-ink-muted text-xs">' + esc(icaro.title) + ' \u2014 Stanza ' + (bm.stanzaIdx + 1) + '</span>' +
            '<span class="font-display text-lg text-ink">' + esc(firstLine) + '\u2026</span>' +
            '<span class="badge bookmark-comfort-badge">' + esc(bm.comfort) + '</span>' +
            '</a>';
        }
      });
      html += '</div></div>';
    }

    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  // --- Contributions ---

  async function renderContributions() {
    document.title = "My Contributions \u2014 Shipibo Dictionary";

    if (!currentUser) {
      app.innerHTML = '<div class="mb-8">' +
        '<a href="#/" class="back-link">' +
        '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
        'Back to dictionary</a></div>' +
        '<h1 class="font-display text-5xl text-ink mb-6 tracking-tight font-light">Contribute</h1>' +
        '<p class="text-ink-muted">Sign in to contribute icaros.</p>';
      return;
    }

    app.innerHTML = '<p class="text-ink-muted">Loading...</p>';
    var data = await api("/api/contributions");
    var items = data && data.contributions ? data.contributions : [];

    var html = '<div class="mb-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      'Back to dictionary</a></div>';

    html += '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">My Contributions</h1>';
    html += '<p class="text-ink-muted text-lg font-light mb-6">Submit icaro texts for review</p>';
    html += '<div class="mb-8"><a href="#/contributions/new" class="review-start-btn">New Icaro</a></div>';

    if (items.length === 0) {
      html += '<p class="text-ink-muted">No contributions yet.</p>';
    } else {
      html += '<div class="entries-container">';
      items.forEach(function (item) {
        var statusClass = "feedback-status-" + item.status;
        html += '<div class="contrib-item">';
        html += '<div class="flex items-center gap-2 mb-1">';
        html += '<a href="#/contributions/' + item.id + '/edit" class="font-display text-xl text-ink accent-link">' + esc(item.title) + '</a>';
        html += '<span class="badge ' + statusClass + '">' + esc(item.status) + '</span>';
        html += '</div>';
        html += '<p class="text-ink-muted text-xs">' + esc(item.updatedAt) + '</p>';
        if (item.adminNotes) {
          html += '<p class="text-ink-light text-sm mt-1 italic">Admin: ' + esc(item.adminNotes) + '</p>';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  async function renderContributionEditor(editId) {
    document.title = (editId ? "Edit" : "New") + " Contribution \u2014 Shipibo Dictionary";

    if (!currentUser) {
      app.innerHTML = '<p class="text-ink-muted">Sign in to contribute.</p>';
      return;
    }

    var existing = null;
    if (editId) {
      var data = await api("/api/contributions");
      if (data && data.contributions) {
        existing = data.contributions.find(function (c) { return c.id === editId; });
      }
      if (!existing) {
        app.innerHTML = '<p class="text-ink-muted">Contribution not found.</p>';
        return;
      }
    }

    var html = '<div class="mb-8">' +
      '<a href="#/contributions" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      'Back to contributions</a></div>';

    html += '<h1 class="font-display text-5xl text-ink mb-6 tracking-tight font-light">' +
      (editId ? "Edit Contribution" : "New Icaro Contribution") + '</h1>';

    html += '<div class="contrib-editor">';
    html += '<div class="feedback-field mb-4">';
    html += '<label class="text-xs text-ink-muted uppercase tracking-wide mb-1">Title</label>';
    html += '<input type="text" class="feedback-textarea" id="contrib-title" style="padding:0.5rem" placeholder="Icaro title" value="' + (existing ? esc(existing.title) : '') + '">';
    html += '</div>';

    html += '<div class="feedback-field mb-4">';
    html += '<label class="text-xs text-ink-muted uppercase tracking-wide mb-1">Icaro Text</label>';
    html += '<textarea class="feedback-textarea" id="contrib-content" rows="12" placeholder="Enter the icaro text, one line per phrase...">' + (existing ? esc(existing.content) : '') + '</textarea>';
    html += '</div>';

    if (existing && existing.adminNotes) {
      html += '<div class="mb-4 p-3 border border-earth-200 rounded-lg">';
      html += '<span class="text-xs text-ink-muted uppercase tracking-wide">Admin Notes</span>';
      html += '<p class="text-ink-light text-sm mt-1">' + esc(existing.adminNotes) + '</p>';
      html += '</div>';
    }

    html += '<div class="flex gap-3">';
    html += '<button class="feedback-cancel-btn" id="contrib-save-draft">Save Draft</button>';
    html += '<button class="feedback-submit-btn" id="contrib-submit">Submit for Review</button>';
    if (existing && (existing.status === "draft" || existing.status === "rejected")) {
      html += '<button class="feedback-cancel-btn" id="contrib-delete" style="margin-left:auto;color:#991b1b">Delete</button>';
    }
    html += '</div>';
    html += '</div>';

    app.innerHTML = html;
    window.scrollTo(0, 0);

    // Wire buttons
    async function saveContrib(status) {
      var title = document.getElementById("contrib-title").value.trim();
      var content = document.getElementById("contrib-content").value.trim();
      if (!title) { document.getElementById("contrib-title").focus(); return; }
      if (!content) { document.getElementById("contrib-content").focus(); return; }

      if (existing) {
        await api("/api/contributions/" + existing.id, {
          method: "PUT",
          body: { title: title, content: content, status: status }
        });
      } else {
        await api("/api/contributions", {
          method: "POST",
          body: { title: title, content: content, status: status }
        });
      }
      location.hash = "#/contributions";
    }

    document.getElementById("contrib-save-draft").addEventListener("click", function () {
      saveContrib("draft");
    });
    document.getElementById("contrib-submit").addEventListener("click", function () {
      saveContrib("submitted");
    });

    var deleteBtn = document.getElementById("contrib-delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async function () {
        await api("/api/contributions/" + existing.id, { method: "DELETE" });
        location.hash = "#/contributions";
      });
    }
  }

  // --- Admin Views ---

  async function renderAdminContributions() {
    document.title = "Admin: Contributions \u2014 Shipibo Dictionary";

    if (!currentUser || currentUser.role !== "admin") {
      app.innerHTML = '<p class="text-ink-muted">Access denied.</p>';
      return;
    }

    app.innerHTML = '<p class="text-ink-muted">Loading...</p>';
    var data = await api("/api/contributions/admin/all");
    if (!data || !data.contributions) {
      app.innerHTML = '<p class="text-ink-muted">Failed to load.</p>';
      return;
    }

    var items = data.contributions;

    var html = '<div class="mb-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      'Back to dictionary</a></div>';

    html += '<div class="admin-tabs mb-6">' +
      '<a href="#/admin/feedback" class="admin-tab">Feedback</a>' +
      '<a href="#/admin/audio" class="admin-tab">Audio</a>' +
      '<a href="#/admin/contributions" class="admin-tab admin-tab-active">Contributions</a>' +
      '</div>';

    html += '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">Contributions</h1>';
    html += '<p class="text-ink-muted text-lg font-light mb-8">' + items.length + ' submission' + (items.length !== 1 ? 's' : '') + '</p>';

    if (items.length === 0) {
      html += '<p class="text-ink-muted">No contributions submitted yet.</p>';
      app.innerHTML = html;
      return;
    }

    items.forEach(function (item) {
      var statusClass = "feedback-status-" + item.status;
      html += '<div class="admin-feedback-item" data-contrib-id="' + item.id + '">';
      html += '<div class="flex items-center gap-2 mb-2">';
      html += '<span class="font-display text-lg text-ink">' + esc(item.title) + '</span>';
      html += '<span class="badge ' + statusClass + '">' + esc(item.status) + '</span>';
      html += '<span class="text-ink-muted text-xs ml-auto">' + esc(item.updatedAt) + '</span>';
      html += '</div>';
      html += '<pre class="contrib-preview">' + esc(item.content) + '</pre>';

      // Admin notes input
      html += '<div class="feedback-field mt-2 mb-2">';
      html += '<input type="text" class="feedback-textarea admin-notes-input" data-cid="' + item.id + '" style="padding:0.375rem;font-size:0.75rem" placeholder="Admin notes..." value="' + (item.adminNotes ? esc(item.adminNotes) : '') + '">';
      html += '</div>';

      // Status buttons
      html += '<div class="admin-feedback-actions">';
      ["draft", "submitted", "approved", "rejected"].forEach(function (s) {
        var active = item.status === s ? " admin-status-active" : "";
        html += '<button class="admin-status-btn' + active + '" data-cid="' + item.id + '" data-status="' + s + '">' +
          s.charAt(0).toUpperCase() + s.slice(1) + '</button>';
      });
      html += '</div>';
      html += '</div>';
    });

    app.innerHTML = html;
    window.scrollTo(0, 0);

    // Wire status buttons
    app.querySelectorAll(".admin-status-btn[data-cid]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var cid = btn.getAttribute("data-cid");
        var status = btn.getAttribute("data-status");
        var notesInput = app.querySelector('.admin-notes-input[data-cid="' + cid + '"]');
        var adminNotes = notesInput ? notesInput.value : "";
        btn.disabled = true;
        await api("/api/contributions/admin/" + cid, {
          method: "PUT",
          body: { status: status, adminNotes: adminNotes }
        });
        var itemEl = btn.closest(".admin-feedback-item");
        itemEl.querySelectorAll(".admin-status-btn").forEach(function (b) { b.classList.remove("admin-status-active"); });
        btn.classList.add("admin-status-active");
        var badges = itemEl.querySelectorAll(".badge");
        if (badges.length >= 1) {
          badges[0].textContent = status;
          badges[0].className = "badge feedback-status-" + status;
        }
        btn.disabled = false;
      });
    });
  }

  async function renderAdminFeedback() {
    document.title = "Admin: Feedback \u2014 Shipibo Dictionary";

    if (!currentUser || currentUser.role !== "admin") {
      app.innerHTML = '<p class="text-ink-muted">Access denied.</p>';
      return;
    }

    app.innerHTML = '<p class="text-ink-muted">Loading feedback...</p>';

    var data = await api("/api/feedback");
    if (!data || !data.feedback) {
      app.innerHTML = '<p class="text-ink-muted">Failed to load feedback.</p>';
      return;
    }

    var items = data.feedback;

    var html = '<div class="mb-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      'Back to dictionary</a></div>';

    html += '<div class="admin-tabs mb-6">' +
      '<a href="#/admin/feedback" class="admin-tab admin-tab-active">Feedback</a>' +
      '<a href="#/admin/audio" class="admin-tab">Audio</a>' +
      '<a href="#/admin/contributions" class="admin-tab">Contributions</a>' +
      '</div>';

    html += '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">Feedback Queue</h1>';
    html += '<p class="text-ink-muted text-lg font-light mb-8">' + items.length + ' item' + (items.length !== 1 ? 's' : '') + '</p>';

    if (items.length === 0) {
      html += '<p class="text-ink-muted">No feedback submitted yet.</p>';
      app.innerHTML = html;
      return;
    }

    items.forEach(function (item) {
      var statusClass = "feedback-status-" + item.status;
      html += '<div class="admin-feedback-item" data-feedback-id="' + item.id + '">';
      html += '<div class="flex items-center gap-2 mb-2">';
      html += '<span class="badge">' + esc(item.targetType) + '</span>';
      html += '<span class="badge">' + esc(item.category) + '</span>';
      html += '<span class="badge ' + statusClass + '">' + esc(item.status) + '</span>';
      html += '<span class="text-ink-muted text-xs ml-auto">' + esc(item.createdAt) + '</span>';
      html += '</div>';
      html += '<p class="text-ink leading-relaxed mb-2">' + esc(item.message) + '</p>';
      html += '<p class="text-ink-muted text-xs mb-3">Target: ' + esc(item.targetType) + ' #' + esc(item.targetId) + '</p>';

      // Status update buttons
      html += '<div class="admin-feedback-actions">';
      ["pending", "reviewed", "resolved", "dismissed"].forEach(function (s) {
        var active = item.status === s ? " admin-status-active" : "";
        html += '<button class="admin-status-btn' + active + '" data-fid="' + item.id + '" data-status="' + s + '">' +
          s.charAt(0).toUpperCase() + s.slice(1) + '</button>';
      });
      html += '</div>';
      html += '</div>';
    });

    app.innerHTML = html;
    window.scrollTo(0, 0);

    // Wire status buttons
    app.querySelectorAll(".admin-status-btn").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var fid = btn.getAttribute("data-fid");
        var status = btn.getAttribute("data-status");
        btn.disabled = true;
        await api("/api/feedback/" + fid, {
          method: "PUT",
          body: { status: status }
        });
        // Update UI
        var itemEl = btn.closest(".admin-feedback-item");
        itemEl.querySelectorAll(".admin-status-btn").forEach(function (b) { b.classList.remove("admin-status-active"); });
        btn.classList.add("admin-status-active");
        // Update the status badge
        var badges = itemEl.querySelectorAll(".badge");
        if (badges.length >= 3) {
          badges[2].textContent = status;
          badges[2].className = "badge feedback-status-" + status;
        }
        btn.disabled = false;
      });
    });
  }

  async function renderAdminAudio() {
    document.title = "Admin: Audio \u2014 Shipibo Dictionary";

    if (!currentUser || currentUser.role !== "admin") {
      app.innerHTML = '<p class="text-ink-muted">Access denied.</p>';
      return;
    }

    app.innerHTML = '<p class="text-ink-muted">Loading recordings...</p>';

    var data = await api("/api/audio/admin/all");
    if (!data || !data.recordings) {
      app.innerHTML = '<p class="text-ink-muted">Failed to load recordings.</p>';
      return;
    }

    var items = data.recordings;

    var html = '<div class="mb-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      'Back to dictionary</a></div>';

    html += '<div class="admin-tabs mb-6">' +
      '<a href="#/admin/feedback" class="admin-tab">Feedback</a>' +
      '<a href="#/admin/audio" class="admin-tab admin-tab-active">Audio</a>' +
      '<a href="#/admin/contributions" class="admin-tab">Contributions</a>' +
      '</div>';

    html += '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">Audio Moderation</h1>';
    html += '<p class="text-ink-muted text-lg font-light mb-8">' + items.length + ' recording' + (items.length !== 1 ? 's' : '') + '</p>';

    if (items.length === 0) {
      html += '<p class="text-ink-muted">No recordings uploaded yet.</p>';
      app.innerHTML = html;
      return;
    }

    items.forEach(function (rec) {
      var statusClass = "feedback-status-" + rec.status;
      var icaro = ICAROS.find(function (ic) { return String(ic.id) === rec.icaroId; });
      html += '<div class="admin-feedback-item" data-rec-id="' + rec.id + '">';
      html += '<div class="flex items-center gap-2 mb-2 flex-wrap">';
      html += '<span class="badge">' + esc(icaro ? icaro.title : "Icaro " + rec.icaroId) + '</span>';
      html += '<span class="badge ' + statusClass + '">' + esc(rec.status) + '</span>';
      html += '<span class="text-ink-muted text-xs ml-auto">' + esc(rec.createdAt) + '</span>';
      html += '</div>';
      html += '<div class="audio-info mb-2">';
      html += '<span class="audio-singer">' + esc(rec.singerName) + '</span>';
      if (rec.singerBio) {
        html += '<span class="audio-bio">' + esc(rec.singerBio) + '</span>';
      }
      html += '</div>';
      html += '<audio controls preload="none" class="audio-player mb-3">' +
        '<source src="' + API_URL + '/api/audio/' + rec.id + '/url" type="audio/mpeg">' +
        '</audio>';

      // Status buttons
      html += '<div class="admin-feedback-actions">';
      ["pending", "approved", "rejected"].forEach(function (s) {
        var active = rec.status === s ? " admin-status-active" : "";
        html += '<button class="admin-status-btn' + active + '" data-rid="' + rec.id + '" data-status="' + s + '">' +
          s.charAt(0).toUpperCase() + s.slice(1) + '</button>';
      });
      html += '</div>';
      html += '</div>';
    });

    app.innerHTML = html;
    window.scrollTo(0, 0);

    // Wire status buttons
    app.querySelectorAll(".admin-status-btn[data-rid]").forEach(function (btn) {
      btn.addEventListener("click", async function () {
        var rid = btn.getAttribute("data-rid");
        var status = btn.getAttribute("data-status");
        btn.disabled = true;
        var result = await api("/api/audio/" + rid, {
          method: "PUT",
          body: { status: status }
        });
        if (result && result.error) {
          btn.textContent = result.error;
          btn.disabled = false;
          return;
        }
        var itemEl = btn.closest(".admin-feedback-item");
        itemEl.querySelectorAll(".admin-status-btn").forEach(function (b) { b.classList.remove("admin-status-active"); });
        btn.classList.add("admin-status-active");
        var badges = itemEl.querySelectorAll(".badge");
        if (badges.length >= 2) {
          badges[1].textContent = status;
          badges[1].className = "badge feedback-status-" + status;
        }
        btn.disabled = false;
      });
    });
  }

  function renderAbout() {
    document.title = "About \u2014 Shipibo Dictionary";
    app.innerHTML = '<div class="mb-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      "Back to dictionary</a></div>" +
      '<h1 class="font-display text-5xl text-ink mb-6 tracking-tight font-light">About</h1>' +
      '<div class="space-y-4 text-ink-light leading-relaxed">' +
      "<p>This dictionary is a bilingual Shipibo\u2013English reference derived from a scanned Shipibo\u2013Spanish dictionary. " +
      "Shipibo (Shipibo-Conibo) is an indigenous language spoken by the Shipibo people of the Peruvian Amazon.</p>" +
      "<p>The original dictionary was digitized using OCR, parsed into structured entries, and translated from Spanish to English. " +
      "Currently it includes entries from Section A of the source dictionary.</p>" +
      "<p>This is a living project. More sections and features will be added over time.</p>" +
      "</div>";
  }

  // --- Init ---
  loadAll();

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js");
  }
})();
