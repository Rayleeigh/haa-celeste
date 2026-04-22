(() => {
  const indexPath = "homelab-docs/index.json";
  const landingPath = "homelab-docs/landing.md";
  const profilePath = "data/profile.json";
  const landingHash = "#overview/landing";

  const state = {
    indexData: null,
    docRecords: [],
    searchReady: false,
    currentHash: window.location.hash || landingHash,
    previousHash: "",
    searchQuery: "",
  };

  const elements = {
    sidebar: document.getElementById("docs-sidebar"),
    sidebarToggle: document.getElementById("docs-sidebar-toggle"),
    sidebarOverlay: document.getElementById("docs-sidebar-overlay"),
    currentLabel: document.getElementById("doc-current-label"),
    pathLabel: document.getElementById("doc-path-label"),
    readingPath: document.getElementById("doc-reading-path"),
    readingRailPath: document.getElementById("doc-reading-rail-path"),
    readingRailSummary: document.getElementById("doc-reading-rail-summary"),
    contentTitle: document.getElementById("doc-content-title"),
    contentSummary: document.getElementById("doc-content-summary"),
    content: document.getElementById("doc-content"),
    menu: document.getElementById("doc-menu"),
    searchReady: document.getElementById("doc-search-ready"),
    indexCount: document.getElementById("doc-index-count"),
    searchInput: document.getElementById("docs-search-input"),
    searchResults: document.getElementById("docs-search-results"),
    searchStatus: document.getElementById("docs-search-status"),
    breadcrumb: document.getElementById("doc-breadcrumb"),
    backSearch: document.getElementById("docs-back-search"),
    backMain: document.getElementById("docs-back-main"),
    railQuery: document.getElementById("docs-reading-rail-query"),
    railSearch: document.getElementById("docs-reading-rail-search"),
    railResults: document.getElementById("docs-reading-rail-results"),
  };

  const normalizeText = (value) =>
    (value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const tokenize = (value) =>
    normalizeText(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1);

  const escapeHtml = (value) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const stripMarkdown = (value) =>
    value
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^>\s?/gm, "")
      .replace(/[*_~>-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const buildSummary = (markdown) => {
    const lines = markdown
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith(">") && !line.startsWith("```"));
    return stripMarkdown(lines.slice(0, 3).join(" ")).slice(0, 180) || "Documentation entry.";
  };

  const setBrandLogo = (url) => {
    const brandLogo = document.getElementById("brand-logo");
    const brandInitials = document.getElementById("brand-initials");
    if (!brandLogo || !brandInitials || !url) return;

    brandLogo.src = url;
    brandLogo.alt = "Brand logo";
    brandLogo.classList.remove("is-hidden");
    brandInitials.classList.add("is-hidden");
    brandLogo.onerror = () => {
      brandLogo.classList.add("is-hidden");
      brandInitials.classList.remove("is-hidden");
    };
  };

  const setSidebarOpen = (isOpen) => {
    if (!elements.sidebar || !elements.sidebarToggle || !elements.sidebarOverlay) return;
    elements.sidebar.classList.toggle("is-open", isOpen);
    elements.sidebarOverlay.classList.toggle("is-visible", isOpen);
    elements.sidebarToggle.classList.toggle("is-active", isOpen);
    elements.sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("docs-sidebar-open", isOpen);
  };

  const closeSidebar = () => setSidebarOpen(false);

  const setSearchQuery = (value) => {
    const query = value || "";
    state.searchQuery = query;
    if (elements.searchInput && elements.searchInput.value !== query) {
      elements.searchInput.value = query;
    }
    if (elements.railQuery && elements.railQuery.value !== query) {
      elements.railQuery.value = query;
    }
  };

  const setViewMode = (mode) => {
    document.body.classList.toggle("docs-home-mode", mode === "home");
    document.body.classList.toggle("docs-reading-mode", mode === "reading");
    if (mode === "home" && window.innerWidth > 1180) {
      closeSidebar();
    }
  };

  const setSearchReady = (value, count = 0) => {
    state.searchReady = value;
    if (elements.searchReady) {
      elements.searchReady.textContent = value ? `Indexed ${count} docs` : "Indexing docs...";
    }
    if (elements.indexCount) {
      elements.indexCount.textContent = `${count} ${count === 1 ? "doc" : "docs"}`;
    }
    if (elements.searchStatus && !elements.searchInput?.value.trim()) {
      elements.searchStatus.textContent = value
        ? "Search titles, headings, slugs, and content."
        : "Indexing documentation...";
    }
  };

  const setCurrentDocState = (record) => {
    if (!record) return;
    const fullTitle = `${record.categoryTitle} / ${record.title}`;
    const fullPath = `${record.categorySlug} / ${record.slug}`;
    if (elements.currentLabel) elements.currentLabel.textContent = fullTitle;
    if (elements.pathLabel) elements.pathLabel.textContent = fullPath;
    if (elements.readingPath) elements.readingPath.textContent = fullPath;
    if (elements.readingRailPath) elements.readingRailPath.textContent = fullPath;
    if (elements.breadcrumb) elements.breadcrumb.textContent = fullPath;
    if (elements.contentTitle) elements.contentTitle.textContent = fullTitle;
    if (elements.contentSummary) elements.contentSummary.textContent = record.summary;
    if (elements.readingRailSummary) elements.readingRailSummary.textContent = record.summary;
    document.title = `${record.title} | Homelab`;
  };

  const setHomeState = () => {
    if (elements.currentLabel) elements.currentLabel.textContent = "Overview / Home";
    if (elements.pathLabel) elements.pathLabel.textContent = "overview / landing";
    if (elements.readingPath) elements.readingPath.textContent = "overview / landing";
    if (elements.readingRailPath) elements.readingRailPath.textContent = "overview / landing";
    if (elements.breadcrumb) elements.breadcrumb.textContent = "overview / landing";
    if (elements.contentTitle) elements.contentTitle.textContent = "Homelab Search";
    if (elements.contentSummary) {
      elements.contentSummary.textContent = "Find a document first, then shift into reading mode.";
    }
    if (elements.readingRailSummary) {
      elements.readingRailSummary.textContent = "Find a document first, then shift into reading mode.";
    }
    document.title = "Homelab | Search";
    setViewMode("home");
  };

  const addCopyButtons = (target) => {
    const blocks = target.querySelectorAll("pre > code");
    blocks.forEach((codeBlock) => {
      const pre = codeBlock.parentElement;
      if (!pre || pre.classList.contains("has-copy")) return;

      pre.classList.add("has-copy");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "code-copy";
      button.textContent = "Copy";
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(codeBlock.innerText);
          button.textContent = "Copied";
        } catch {
          button.textContent = "Failed";
        }
        setTimeout(() => {
          button.textContent = "Copy";
        }, 1400);
      });
      pre.appendChild(button);
    });
  };

  const renderMarkdown = (markdown) => {
    if (!elements.content) return;

    if (window.markedFootnote) {
      window.marked.use(window.markedFootnote());
    }

    window.marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false,
      highlight(code, lang) {
        if (window.hljs) {
          if (lang && window.hljs.getLanguage(lang)) {
            return window.hljs.highlight(code, { language: lang }).value;
          }
          return window.hljs.highlightAuto(code).value;
        }
        return code;
      },
    });

    const rawHtml = window.marked.parse(markdown);
    const safeHtml = window.DOMPurify
      ? window.DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ["details", "summary", "input"],
          ADD_ATTR: ["class", "open", "type", "checked", "disabled"],
        })
      : rawHtml;

    elements.content.innerHTML = safeHtml;

    if (window.renderMathInElement) {
      window.renderMathInElement(elements.content, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
      });
    }

    addCopyButtons(elements.content);

    elements.content.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (href && !href.startsWith("#") && !href.startsWith("mailto:")) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    });
  };

  const setDocError = (message) => {
    if (elements.content) elements.content.innerHTML = `<p class="loading">${message}</p>`;
    if (elements.contentSummary) elements.contentSummary.textContent = message;
  };

  const resolveDocPath = (indexData, hash) => {
    const cleaned = (hash || "").replace(/^#/, "");
    if (!cleaned) {
      return {
        path: landingPath,
        hash: landingHash,
        categorySlug: "overview",
        slug: "landing",
      };
    }

    const [categorySlug, docSlug] = cleaned.split("/");
    if (!categorySlug || !docSlug) {
      const firstCategory = indexData.categories[0];
      const firstDoc = firstCategory?.docs?.[0];
      if (!firstCategory || !firstDoc) return null;
      return {
        path: `homelab-docs/${firstCategory.slug}/${firstDoc.slug}.md`,
        hash: `#${firstCategory.slug}/${firstDoc.slug}`,
        categorySlug: firstCategory.slug,
        slug: firstDoc.slug,
      };
    }

    if (categorySlug === "overview" && docSlug === "landing") {
      return {
        path: landingPath,
        hash: landingHash,
        categorySlug: "overview",
        slug: "landing",
      };
    }

    const category = indexData.categories.find((item) => item.slug === categorySlug);
    const doc = category?.docs?.find((item) => item.slug === docSlug);
    if (!category || !doc) return null;

    return {
      path: `homelab-docs/${category.slug}/${doc.slug}.md`,
      hash: `#${category.slug}/${doc.slug}`,
      categorySlug,
      slug: docSlug,
    };
  };

  const buildMenu = (indexData) => {
    if (!elements.menu) return;
    elements.menu.innerHTML = "";

    indexData.categories.forEach((category, index) => {
      const section = document.createElement("details");
      section.className = "doc-menu-section doc-menu-collapsible";
      section.dataset.category = category.slug;
      section.open = index === 0;

      const summary = document.createElement("summary");
      summary.className = "doc-menu-title";
      summary.textContent = category.title;

      const list = document.createElement("ul");
      list.className = "doc-menu-list";

      category.docs.forEach((doc) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${category.slug}/${doc.slug}`;
        link.className = "doc-menu-link";
        link.textContent = doc.title;
        link.addEventListener("click", () => {
          if (window.innerWidth <= 1080) closeSidebar();
        });
        item.appendChild(link);
        list.appendChild(item);
      });

      section.appendChild(summary);
      section.appendChild(list);
      elements.menu.appendChild(section);
    });
  };

  const setActiveLink = (hash) => {
    const links = document.querySelectorAll(".doc-menu-link");
    links.forEach((link) => {
      const isActive = link.getAttribute("href") === hash;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.scrollIntoView({ block: "nearest" });
    });

    const sections = document.querySelectorAll(".doc-menu-section[data-category]");
    sections.forEach((section) => {
      if (hash.startsWith(`#${section.dataset.category}/`)) {
        section.open = true;
      }
    });
  };

  const loadMarkdown = (record) =>
    fetch(record.path, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load markdown");
        return res.text();
      })
      .then((markdown) => {
        setCurrentDocState(record);
        setViewMode("reading");
        renderMarkdown(markdown);
      })
      .catch(() => setDocError("Unable to load documentation."));

  const extractHeadings = (markdown) =>
    markdown
      .split("\n")
      .filter((line) => /^#{1,6}\s+/.test(line.trim()))
      .map((line) => line.replace(/^#{1,6}\s+/, "").trim());

  const buildDocRecords = async (indexData) => {
    const requests = [];

    indexData.categories.forEach((category) => {
      category.docs.forEach((doc) => {
        const path =
          category.slug === "overview" && doc.slug === "landing"
            ? landingPath
            : `homelab-docs/${category.slug}/${doc.slug}.md`;

        requests.push(
          fetch(path, { cache: "no-store" })
            .then((res) => (res.ok ? res.text() : ""))
            .then((markdown) => {
              const headings = extractHeadings(markdown);
              const plain = stripMarkdown(markdown);
              return {
                path,
                hash: `#${category.slug}/${doc.slug}`,
                title: doc.title,
                slug: doc.slug,
                categoryTitle: category.title,
                categorySlug: category.slug,
                markdown,
                summary: buildSummary(markdown),
                headings,
                plain,
                normalized: {
                  title: normalizeText(doc.title),
                  slug: normalizeText(doc.slug),
                  category: normalizeText(category.title),
                  headings: normalizeText(headings.join(" ")),
                  content: normalizeText(plain),
                  path: normalizeText(`${category.slug}/${doc.slug}`),
                },
              };
            })
        );
      });
    });

    return Promise.all(requests);
  };

  const subsequenceScore = (query, target) => {
    if (!query || !target) return 0;
    let qi = 0;
    let gaps = 0;

    for (let i = 0; i < target.length && qi < query.length; i += 1) {
      if (target[i] === query[qi]) {
        qi += 1;
      } else if (qi > 0) {
        gaps += 1;
      }
    }

    if (qi !== query.length) return 0;
    return Math.max(8, 32 - gaps);
  };

  const wordBoundaryHit = (haystack, token) => new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(haystack);

  const findBestSnippet = (record, query, tokens) => {
    const rawLines = record.markdown.split("\n").map((line) => stripMarkdown(line.trim())).filter(Boolean);
    const candidates = [...record.headings, ...rawLines];
    const normalizedQuery = normalizeText(query);

    let best = candidates.find((line) => normalizeText(line).includes(normalizedQuery));
    if (!best) {
      best = candidates.find((line) => tokens.every((token) => normalizeText(line).includes(token)))
        || candidates.find((line) => tokens.some((token) => normalizeText(line).includes(token)))
        || record.summary;
    }

    const compact = stripMarkdown(best);
    if (compact.length <= 160) return compact;
    const firstToken = tokens[0];
    const normalizedLine = normalizeText(compact);
    const matchIndex = firstToken ? normalizedLine.indexOf(firstToken) : -1;
    if (matchIndex < 0) return `${compact.slice(0, 157)}...`;
    const start = Math.max(0, matchIndex - 40);
    const end = Math.min(compact.length, start + 160);
    return `${start > 0 ? "..." : ""}${compact.slice(start, end)}${end < compact.length ? "..." : ""}`;
  };

  const scoreRecord = (record, query) => {
    const normalizedQuery = normalizeText(query).trim();
    const tokens = Array.from(new Set(tokenize(query)));
    if (!normalizedQuery || !tokens.length) return null;

    const { title, slug, category, headings, content, path } = record.normalized;
    let score = 0;
    let coveredTokens = 0;

    if (title === normalizedQuery) score += 1600;
    if (path === normalizedQuery) score += 1300;
    if (slug === normalizedQuery) score += 1200;
    if (headings === normalizedQuery) score += 1150;
    if (category === normalizedQuery) score += 900;

    if (title.includes(normalizedQuery)) score += 820 - Math.min(title.indexOf(normalizedQuery), 60);
    if (headings.includes(normalizedQuery)) score += 700 - Math.min(headings.indexOf(normalizedQuery), 80);
    if (path.includes(normalizedQuery)) score += 620 - Math.min(path.indexOf(normalizedQuery), 80);
    if (content.includes(normalizedQuery)) score += 320 - Math.min(Math.floor(content.indexOf(normalizedQuery) / 10), 120);

    tokens.forEach((token) => {
      let tokenHit = false;

      if (wordBoundaryHit(title, token)) {
        score += 220;
        tokenHit = true;
      } else if (title.includes(token)) {
        score += 130;
        tokenHit = true;
      } else {
        const fuzzy = subsequenceScore(token, title);
        if (fuzzy) {
          score += fuzzy;
          tokenHit = true;
        }
      }

      if (wordBoundaryHit(headings, token)) {
        score += 170;
        tokenHit = true;
      } else if (headings.includes(token)) {
        score += 110;
        tokenHit = true;
      }

      if (wordBoundaryHit(path, token) || wordBoundaryHit(slug, token)) {
        score += 120;
        tokenHit = true;
      } else if (slug.startsWith(token) || path.includes(token)) {
        score += 72;
        tokenHit = true;
      }

      if (wordBoundaryHit(category, token)) {
        score += 90;
        tokenHit = true;
      }

      if (wordBoundaryHit(content, token)) {
        score += 42;
        tokenHit = true;
      } else if (content.includes(token)) {
        score += 20;
        tokenHit = true;
      }

      if (tokenHit) coveredTokens += 1;
    });

    const coverage = coveredTokens / tokens.length;
    if (coverage < 0.6 && score < 700) return null;

    score += Math.round(coverage * 220);
    if (tokens.length > 1 && title.includes(tokens.join(" "))) score += 180;
    if (tokens.length > 1 && headings.includes(tokens.join(" "))) score += 140;

    return {
      record,
      score,
      snippet: findBestSnippet(record, query, tokens),
    };
  };

  const renderSearchResults = (query) => {
    if (!elements.searchResults || !elements.searchStatus) return;
    const trimmed = query.trim();

    if (!trimmed) {
      const featured = state.docRecords
        .filter((record) => record.hash !== landingHash)
        .slice(0, 6);
      elements.searchStatus.textContent = state.searchReady
        ? "Search titles, headings, slugs, and content."
        : "Indexing documentation...";
      elements.searchResults.innerHTML = featured
        .map((record) => `
          <a class="docs-search-result" href="${record.hash}" data-hash="${record.hash}">
            <div class="docs-search-result-top">
              <span class="docs-search-result-section">${escapeHtml(record.categoryTitle)}</span>
              <span class="docs-search-result-path">${escapeHtml(`${record.categorySlug} / ${record.slug}`)}</span>
            </div>
            <strong class="docs-search-result-title">${escapeHtml(record.title)}</strong>
            <p class="docs-search-result-snippet">${escapeHtml(record.summary)}</p>
          </a>
        `)
        .join("") || `<p class="loading">Preparing search index...</p>`;
    } else if (!state.searchReady) {
      elements.searchStatus.textContent = "Search index is still being prepared.";
      elements.searchResults.innerHTML = `<p class="loading">Preparing search index...</p>`;
    } else {
      const results = state.docRecords
        .filter((record) => record.hash !== landingHash)
        .map((record) => scoreRecord(record, trimmed))
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      if (!results.length) {
        elements.searchStatus.textContent = "No precise matches found.";
        elements.searchResults.innerHTML = `
          <div class="docs-search-empty">
            <p>No strong matches for <strong>${escapeHtml(trimmed)}</strong>.</p>
            <p>Try a document title, heading, service name, slug, or config keyword.</p>
          </div>
        `;
      } else {
        elements.searchStatus.textContent = `${results.length} result${results.length === 1 ? "" : "s"} ranked by exact phrase, headings, path, and content relevance.`;
        elements.searchResults.innerHTML = results
          .map(({ record, snippet }) => `
            <a class="docs-search-result" href="${record.hash}" data-hash="${record.hash}">
              <div class="docs-search-result-top">
                <span class="docs-search-result-section">${escapeHtml(record.categoryTitle)}</span>
                <span class="docs-search-result-path">${escapeHtml(`${record.categorySlug} / ${record.slug}`)}</span>
              </div>
              <strong class="docs-search-result-title">${escapeHtml(record.title)}</strong>
              <p class="docs-search-result-snippet">${escapeHtml(snippet)}</p>
            </a>
          `)
          .join("");
      }
    }

    elements.searchResults.querySelectorAll("[data-hash]").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 1080) closeSidebar();
      });
    });
  };

  const renderRailResults = (query) => {
    const container = elements.railResults;
    if (!container) return;
    const trimmed = query.trim();

    if (!trimmed) {
      container.hidden = true;
      container.innerHTML = "";
      return;
    }

    container.hidden = false;

    if (!state.searchReady) {
      container.innerHTML = `<p class="loading">Preparing search index...</p>`;
      return;
    }

    const results = state.docRecords
      .filter((record) => record.hash !== landingHash)
      .map((record) => scoreRecord(record, trimmed))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    if (!results.length) {
      container.innerHTML = `
        <div class="docs-search-empty">
          <p>No strong matches for <strong>${escapeHtml(trimmed)}</strong>.</p>
        </div>
      `;
    } else {
      container.innerHTML = results
        .map(({ record, snippet }) => `
          <a class="docs-search-result" href="${record.hash}" data-hash="${record.hash}">
            <div class="docs-search-result-top">
              <span class="docs-search-result-section">${escapeHtml(record.categoryTitle)}</span>
              <span class="docs-search-result-path">${escapeHtml(`${record.categorySlug} / ${record.slug}`)}</span>
            </div>
            <strong class="docs-search-result-title">${escapeHtml(record.title)}</strong>
            <p class="docs-search-result-snippet">${escapeHtml(snippet)}</p>
          </a>
        `)
        .join("");
    }
  };

  const goToSearch = (query = "", { focus = true, select = true } = {}) => {
    const nextQuery = typeof query === "string" ? query : "";
    setSearchQuery(nextQuery);
    renderSearchResults(nextQuery);
    closeSidebar();

    if (window.location.hash !== landingHash) {
      window.location.hash = landingHash;
      setTimeout(() => {
        if (focus) elements.searchInput?.focus();
        if (focus && select) elements.searchInput?.select();
      }, 40);
      return;
    }

    setViewMode("home");
    if (focus) elements.searchInput?.focus();
    if (focus && select) elements.searchInput?.select();
  };

  const focusSearch = () => {
    goToSearch(state.searchQuery, { focus: true, select: true });
  };

  const goBack = () => {
    closeSidebar();
    if (state.previousHash && state.previousHash !== state.currentHash) {
      window.location.hash = state.previousHash;
      return;
    }
    goToSearch(state.searchQuery, { focus: false, select: false });
  };

  const searchLibraryFromRail = () => {
    const query = elements.railQuery?.value?.trim() || "";
    renderRailResults(query);
  };

  const bindChrome = () => {
    elements.sidebarToggle?.addEventListener("click", () => {
      const next = !elements.sidebar?.classList.contains("is-open");
      setSidebarOpen(next);
    });

    elements.sidebarOverlay?.addEventListener("click", closeSidebar);

    elements.searchInput?.addEventListener("input", (event) => {
      setSearchQuery(event.target.value);
      renderSearchResults(event.target.value);
    });

    elements.railQuery?.addEventListener("input", (event) => {
      setSearchQuery(event.target.value);
      renderRailResults(event.target.value);
    });

    elements.railQuery?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchLibraryFromRail();
      }
    });

    elements.backSearch?.addEventListener("click", goBack);
    elements.backMain?.addEventListener("click", () => {
      window.location.href = "index.html";
    });
    elements.railSearch?.addEventListener("click", searchLibraryFromRail);

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        focusSearch();
      }

      if (event.key === "Escape") {
        closeSidebar();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1080) closeSidebar();
    });
  };

  const loadIndex = () =>
    fetch(indexPath, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load index");
        return res.json();
      })
      .then(async (indexData) => {
        if (!indexData?.categories?.length) throw new Error("No documentation found");

        state.indexData = indexData;
        buildMenu(indexData);
        state.docRecords = await buildDocRecords(indexData);
        setSearchReady(true, state.docRecords.length);
        renderSearchResults(elements.searchInput?.value || "");

        const syncRoute = () => {
          const nextHash = window.location.hash || landingHash;
          if (nextHash !== state.currentHash) {
            state.previousHash = state.currentHash;
            state.currentHash = nextHash;
          }

          const resolved = resolveDocPath(indexData, window.location.hash);
          if (!resolved) {
            setDocError("Documentation not found.");
            return;
          }

          if (window.location.hash !== resolved.hash) {
            window.location.hash = resolved.hash;
            return;
          }

          setActiveLink(resolved.hash);

          if (resolved.hash === landingHash) {
            setHomeState();
            renderSearchResults(state.searchQuery);
            return;
          }

          const record = state.docRecords.find((entry) => entry.hash === resolved.hash);
          if (!record) {
            setDocError("Documentation not found.");
            return;
          }

          loadMarkdown(record);
        };

        syncRoute();
        window.addEventListener("hashchange", syncRoute);
      })
      .catch(() => {
        if (elements.menu) {
          elements.menu.innerHTML = `<p class="loading">Unable to load documentation menu.</p>`;
        }
        setDocError("Unable to load documentation.");
        setSearchReady(false, 0);
      });

  const loadProfile = () =>
    fetch(profilePath, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((profile) => setBrandLogo(profile.brand_logo_url || ""));

  bindChrome();
  loadProfile();
  loadIndex();
})();
