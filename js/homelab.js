(() => {
  const indexPath = "homelab-docs/index.json";
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
    const md = window.markdownit({
      html: false,
      linkify: true,
      typographer: true,
    });
    target.innerHTML = md.render(markdown);
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
      const section = document.createElement("div");
      section.className = "doc-menu-section";
      section.innerHTML = `<p class="doc-menu-title">${category.title}</p>`;

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

      section.appendChild(list);
      menu.appendChild(section);
    });
  };

  const resolveDocPath = (indexData, hash) => {
    const cleaned = (hash || "").replace(/^#/, "");
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
