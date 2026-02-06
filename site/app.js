(function () {
  "use strict";

  let ENTRIES = [];
  let ICAROS = [];
  let ICARO_WORDS = [];
  let ICARO_SUFFIXES = [];
  const app = document.getElementById("app");

  // --- Data ---

  async function loadEntries() {
    const res = await fetch("data/entries.json");
    ENTRIES = await res.json();
  }

  async function loadIcaros() {
    const res = await fetch("data/icaros.json");
    ICAROS = await res.json();
  }

  async function loadAll() {
    await Promise.all([loadEntries(), loadIcaros()]);
    buildIcaroDictionary();
    route();
  }

  function buildIcaroDictionary() {
    var wordMap = {};
    var suffixMap = {};

    ICAROS.forEach(function (icaro) {
      var source = { id: icaro.id, title: icaro.title };

      if (icaro.vocabulary) {
        icaro.vocabulary.forEach(function (v) {
          var key = v.shipibo.toLowerCase();
          if (wordMap[key]) {
            var exists = wordMap[key].icaros.some(function (s) { return s.id === icaro.id; });
            if (!exists) wordMap[key].icaros.push(source);
          } else {
            wordMap[key] = {
              shipibo: v.shipibo,
              pos: v.pos || "",
              meaning: v.meaning,
              icaros: [source]
            };
          }
        });
      }

      if (icaro.suffix_reference) {
        icaro.suffix_reference.forEach(function (suf) {
          var key = suf.form.replace(/^-+/, "").toLowerCase();
          if (suffixMap[key]) {
            var exists = suffixMap[key].icaros.some(function (s) { return s.id === icaro.id; });
            if (!exists) suffixMap[key].icaros.push(source);
          } else {
            suffixMap[key] = {
              form: suf.form.replace(/^-+/, ""),
              meaning: suf.meaning,
              icaros: [source]
            };
          }
        });
      }
    });

    ICARO_WORDS = Object.keys(wordMap).sort().map(function (k) { return wordMap[k]; });
    ICARO_SUFFIXES = Object.keys(suffixMap).sort().map(function (k) { return suffixMap[k]; });
  }

  // --- Router ---

  function route() {
    const hash = location.hash || "#/";
    const [path, qs] = hash.slice(1).split("?");
    const params = new URLSearchParams(qs || "");

    if (path === "/about") {
      renderAbout();
    } else if (path === "/icaros") {
      renderIcaroIndex();
    } else if (path.match(/^\/icaro\/\d+\/learn$/)) {
      var id = parseInt(path.split("/")[2], 10);
      location.hash = "#/icaro/" + id;
    } else if (path.match(/^\/icaro\/\d+$/)) {
      var id = parseInt(path.split("/")[2], 10);
      renderIcaro(id);
    } else if (path === "/icaro-dictionary") {
      renderIcaroDictionary(params.get("tab") || "words", params.get("q") || "");
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

  function renderIcaroIndex() {
    document.title = "Icaros \u2014 Shipibo Dictionary";

    var html = '<div class="mb-8">' +
      '<a href="#/" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      "Back to dictionary</a></div>";

    html += '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">Icaros</h1>';
    html += '<p class="text-ink-muted text-lg font-light mb-8">Learn traditional Shipibo healing songs</p>';

    html += '<a href="#/icaro-dictionary" class="icaro-dict-banner">' +
      '<span class="font-display text-lg text-ink">Icaro Dictionary</span>' +
      '<span class="text-ink-muted text-sm">' + ICARO_WORDS.length + ' words, ' + ICARO_SUFFIXES.length + ' suffixes</span>' +
      '</a>';

    html += '<div class="entries-container">';
    ICAROS.forEach(function (icaro) {
      var phraseCount = icaro.phrases ? icaro.phrases.length : 0;
      html += '<a href="#/icaro/' + icaro.id + '" class="icaro-card">' +
        '<div class="flex items-baseline gap-3">' +
        '<span class="font-display text-2xl text-ink">' + esc(icaro.title) + '</span>' +
        '<span class="badge">' + phraseCount + ' phrases</span>' +
        '</div>' +
        '<p class="text-ink-light text-sm mt-1.5 leading-relaxed">';
      if (icaro.song && icaro.song.sections && icaro.song.sections.length > 0) {
        var firstLine = icaro.song.sections[0].lines[0];
        html += esc(firstLine ? firstLine.text : "");
        if (icaro.song.sections[0].lines.length > 1) {
          html += ' / ' + esc(icaro.song.sections[0].lines[1].text);
        }
        html += ' \u2026';
      }
      html += '</p></a>';
    });
    html += '</div>';

    app.innerHTML = html;
    window.scrollTo(0, 0);
  }

  // --- Icaro Dictionary ---

  function searchIcaroWords(q) {
    var lower = q.toLowerCase();
    return ICARO_WORDS.filter(function (w) {
      return w.shipibo.toLowerCase().includes(lower) || w.meaning.toLowerCase().includes(lower);
    });
  }

  function searchIcaroSuffixes(q) {
    var lower = q.toLowerCase();
    return ICARO_SUFFIXES.filter(function (s) {
      return s.form.toLowerCase().includes(lower) || s.meaning.toLowerCase().includes(lower);
    });
  }

  function icaroSourceTagsHTML(icaros) {
    return icaros.map(function (src) {
      return '<a href="#/icaro/' + src.id + '" class="icaro-source-tag">' + esc(src.title) + '</a>';
    }).join("");
  }

  function icaroWordCardHTML(word) {
    var dictEntry = findDictEntry(word.shipibo);
    var html = '<div class="icaro-dict-entry">';
    html += '<div class="flex items-baseline gap-2.5">';
    if (dictEntry) {
      html += '<a href="#/entry/' + dictEntry.id + '" class="font-display text-xl accent-link">' + esc(word.shipibo) + '</a>';
    } else {
      html += '<span class="font-display text-xl text-ink">' + esc(word.shipibo) + '</span>';
    }
    if (word.pos) {
      html += ' <span class="badge">' + esc(word.pos) + '</span>';
    }
    html += '</div>';
    html += '<p class="text-ink-light text-sm mt-1 leading-relaxed">' + esc(word.meaning) + '</p>';
    html += '<div class="flex flex-wrap gap-1 mt-2">' + icaroSourceTagsHTML(word.icaros) + '</div>';
    html += '</div>';
    return html;
  }

  function icaroSuffixCardHTML(suffix) {
    var html = '<div class="icaro-dict-entry">';
    html += '<span class="font-display text-xl text-ink">-' + esc(suffix.form) + '</span>';
    html += '<p class="text-ink-light text-sm mt-1 leading-relaxed">' + esc(suffix.meaning) + '</p>';
    html += '<div class="flex flex-wrap gap-1 mt-2">' + icaroSourceTagsHTML(suffix.icaros) + '</div>';
    html += '</div>';
    return html;
  }

  function renderIcaroDictionary(tab, searchQuery) {
    document.title = "Icaro Dictionary \u2014 Shipibo Dictionary";

    var searchIcon = '<svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-muted pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>';

    var html = '<div class="mb-8">' +
      '<a href="#/icaros" class="back-link">' +
      '<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>' +
      "All icaros</a></div>";

    html += '<h1 class="font-display text-5xl text-ink mb-2 tracking-tight font-light">Icaro Dictionary</h1>';
    html += '<p class="text-ink-muted text-lg font-light mb-8">Vocabulary and suffixes from all icaros</p>';

    // Search input
    html += '<div class="relative mb-6">' +
      searchIcon +
      '<input type="search" id="icaro-dict-search" value="' + esc(searchQuery) + '" placeholder="Search words and suffixes\u2026" class="search-input" autocomplete="off">' +
      '</div>';

    // Tabs
    html += '<div class="flex gap-1 mb-6">';
    html += '<a href="#/icaro-dictionary?tab=words' + (searchQuery ? '&q=' + encodeURIComponent(searchQuery) : '') + '" class="icaro-dict-tab' + (tab === "words" ? " active" : "") + '">Words</a>';
    html += '<a href="#/icaro-dictionary?tab=suffixes' + (searchQuery ? '&q=' + encodeURIComponent(searchQuery) : '') + '" class="icaro-dict-tab' + (tab === "suffixes" ? " active" : "") + '">Suffixes</a>';
    html += '</div>';

    // Content
    if (tab === "suffixes") {
      var suffixes = searchQuery ? searchIcaroSuffixes(searchQuery) : ICARO_SUFFIXES;
      html += '<p class="text-sm text-ink-muted mb-4 font-light">' + suffixes.length + (suffixes.length === 1 ? " suffix" : " suffixes") + '</p>';
      html += '<div class="entries-container">';
      if (suffixes.length > 0) {
        suffixes.forEach(function (s) { html += icaroSuffixCardHTML(s); });
      } else {
        html += '<div class="py-12 text-center text-ink-muted"><p>No suffixes found.</p></div>';
      }
      html += '</div>';
    } else {
      var words = searchQuery ? searchIcaroWords(searchQuery) : ICARO_WORDS;
      html += '<p class="text-sm text-ink-muted mb-4 font-light">' + words.length + (words.length === 1 ? " word" : " words") + '</p>';
      html += '<div class="entries-container">';
      if (words.length > 0) {
        words.forEach(function (w) { html += icaroWordCardHTML(w); });
      } else {
        html += '<div class="py-12 text-center text-ink-muted"><p>No words found.</p></div>';
      }
      html += '</div>';
    }

    app.innerHTML = html;

    // Wire up search
    var input = document.getElementById("icaro-dict-search");
    var timeout = null;
    input.addEventListener("input", function () {
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        var q = input.value.trim();
        location.hash = "#/icaro-dictionary?tab=" + tab + (q ? "&q=" + encodeURIComponent(q) : "");
      }, 250);
    });
    if (searchQuery) {
      var len = input.value.length;
      input.focus();
      input.setSelectionRange(len, len);
    }
    window.scrollTo(0, 0);
  }

  function phraseCardHTML(phrase, phraseIdx) {
    var html = '<div class="panel-card" data-phrase-idx="' + phraseIdx + '">';
    html += '<div class="panel-card-close" data-dismiss="' + phraseIdx + '">\u00d7</div>';

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

    html += '<h1 class="font-display text-5xl text-ink mb-6 tracking-tight font-light">' + esc(icaro.title) + '</h1>';
    html += '<p class="text-ink-muted text-sm mb-8 icaro-hint">Tap a line to explore its meaning</p>';

    // Two-column layout: song + panel
    html += '<div class="icaro-layout">';

    // Song column
    html += '<div class="icaro-song-col">';
    if (icaro.song && icaro.song.sections) {
      icaro.song.sections.forEach(function (section, si) {
        html += '<div class="song-section">';
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
        cardsHTML += phraseCardHTML(phrases[pi], pi);
      });

      // Desktop panel
      panelCards.innerHTML = cardsHTML;
      panelEmpty.style.display = orderedIndices.length === 0 ? "" : "none";

      // Mobile drawer
      drawerCards.innerHTML = cardsHTML;
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
    navigator.serviceWorker.register("service-worker.js");
  }
})();
