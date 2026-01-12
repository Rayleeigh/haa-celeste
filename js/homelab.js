(() => {
  const indexPath = "homelab-docs/index.json";
  const landingPath = "homelab-docs/landing.md";
  const profilePath = "data/profile.json";

  const setBrandLogo = (url) => {
    const brandLogo = document.getElementById("brand-logo");
    const brandInitials = document.getElementById("brand-initials");
    if (!brandLogo || !brandInitials) return;
    if (!url) return;

    brandLogo.src = url;
    brandLogo.alt = "Brand logo";
    brandLogo.classList.remove("is-hidden");
    brandInitials.classList.add("is-hidden");
    brandLogo.onerror = () => {
      brandLogo.classList.add("is-hidden");
      brandInitials.classList.remove("is-hidden");
    };
  };

  const renderMarkdown = (markdown) => {
    const target = document.getElementById("doc-content");
    if (!target) return;

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
    target.innerHTML = safeHtml;

    if (window.renderMathInElement) {
      window.renderMathInElement(target, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\\\(", right: "\\\\)", display: false },
          { left: "\\\\[", right: "\\\\]", display: true },
        ],
      });
    }

    addCopyButtons(target);
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
          setTimeout(() => {
            button.textContent = "Copy";
          }, 1500);
        } catch {
          button.textContent = "Failed";
          setTimeout(() => {
            button.textContent = "Copy";
          }, 1500);
        }
      });
      pre.appendChild(button);
    });
  };

  const setDocError = (message) => {
    const target = document.getElementById("doc-content");
    if (target) {
      target.innerHTML = `<p class="loading">${message}</p>`;
    }
  };

  const loadMarkdown = (path) =>
    fetch(path, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load markdown");
        }
        return res.text();
      })
      .then(renderMarkdown)
      .catch(() => setDocError("Unable to load documentation."));

  const buildMenu = (indexData) => {
    const menu = document.getElementById("doc-menu");
    if (!menu) return;
    menu.innerHTML = "";

    indexData.categories.forEach((category) => {
      const isOverview = category.slug === "overview";
      const section = document.createElement(isOverview ? "div" : "details");
      section.className = `doc-menu-section${isOverview ? "" : " doc-menu-collapsible"}`;
      section.dataset.category = category.slug;
      const summary = document.createElement(isOverview ? "p" : "summary");
      summary.className = "doc-menu-title";
      summary.textContent = category.title;

      const list = document.createElement("ul");
      list.className = "doc-menu-list";

      category.docs.forEach((doc) => {
        const item = document.createElement("li");
        const link = document.createElement("a");
        link.href = `#${category.slug}/${doc.slug}`;
        link.textContent = doc.title;
        link.className = "doc-menu-link";
        item.appendChild(link);
        list.appendChild(item);
      });

      section.appendChild(summary);
      section.appendChild(list);
      menu.appendChild(section);
    });
  };

  const resolveDocPath = (indexData, hash) => {
    const cleaned = (hash || "").replace(/^#/, "");
    if (!cleaned) {
      return {
        path: landingPath,
        hash: "#overview/landing",
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
      };
    }

    if (categorySlug === "overview" && docSlug === "landing") {
      return {
        path: landingPath,
        hash: "#overview/landing",
      };
    }

    const category = indexData.categories.find((item) => item.slug === categorySlug);
    const doc = category?.docs?.find((item) => item.slug === docSlug);
    if (!category || !doc) return null;
    return {
      path: `homelab-docs/${category.slug}/${doc.slug}.md`,
      hash: `#${category.slug}/${doc.slug}`,
    };
  };

  const setActiveLink = (hash) => {
    const links = document.querySelectorAll(".doc-menu-link");
    links.forEach((link) => {
      if (link.getAttribute("href") === hash) {
        link.classList.add("is-active");
      } else {
        link.classList.remove("is-active");
      }
    });

    const sections = document.querySelectorAll(".doc-menu-section[data-category]");
    sections.forEach((section) => {
      const category = section.dataset.category;
      if (hash.startsWith(`#${category}/`)) {
        if (section.tagName.toLowerCase() === "details") {
          section.open = true;
        }
      }
    });
  };

  const loadIndex = () =>
    fetch(indexPath, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load index");
        }
        return res.json();
      })
      .then((indexData) => {
        if (!indexData?.categories?.length) {
          throw new Error("No documentation found");
        }
        buildMenu(indexData);
        const resolved = resolveDocPath(indexData, window.location.hash);
        if (!resolved) {
          setDocError("Documentation not found.");
          return;
        }
        if (window.location.hash !== resolved.hash) {
          window.location.hash = resolved.hash;
        }
        setActiveLink(resolved.hash);
        loadMarkdown(resolved.path);

        window.addEventListener("hashchange", () => {
          const next = resolveDocPath(indexData, window.location.hash);
          if (!next) {
            setDocError("Documentation not found.");
            return;
          }
          setActiveLink(next.hash);
          loadMarkdown(next.path);
        });
      })
      .catch(() => {
        const menu = document.getElementById("doc-menu");
        if (menu) {
          menu.innerHTML = "<p class=\"loading\">Unable to load documentation menu.</p>";
        }
        setDocError("Unable to load documentation.");
      });

  const loadProfile = () =>
    fetch(profilePath, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : {}))
      .then((profile) => setBrandLogo(profile.brand_logo_url || ""));

  loadProfile();
  loadIndex();
})();
