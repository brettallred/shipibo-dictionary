(function () {
  "use strict";

  let ENTRIES = [];
  const app = document.getElementById("app");

  // --- Data ---

  async function loadEntries() {
    const res = await fetch("data/entries.json");
    ENTRIES = await res.json();
    route();
  }

  // --- Router ---

  function route() {
    const hash = location.hash || "#/";
    const [path, qs] = hash.slice(1).split("?");
    const params = new URLSearchParams(qs || "");

    if (path === "/about") {
      renderAbout();
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

    // Page reference
    if (entry.page_number) {
      html += '<div class="mt-10 pt-4 border-t border-earth-200">' +
        '<p class="text-xs text-ink-muted font-light">Source: page ' + entry.page_number + "</p></div>";
    }

    app.innerHTML = html;
    window.scrollTo(0, 0);
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
  loadEntries();

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
})();
