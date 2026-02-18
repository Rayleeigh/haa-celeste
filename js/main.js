(() => {
  const username = "Rayleeigh";
  const userUrl = `https://api.github.com/users/${username}`;
  const repoUrl = `https://api.github.com/users/${username}/repos?sort=updated&per_page=6`;
  const localUserUrl = "data/profile.json";
  const localRepoUrl = "data/repos.json";

  const $ = (id) => document.getElementById(id);
  const setText = (id, value, fallback = "") => {
    const el = $(id);
    if (!el) return;
    el.textContent = value || fallback;
  };

  const setLink = (id, href, label) => {
    const el = $(id);
    if (!el) return;
    if (href) {
      el.href = href;
      if (label) el.textContent = label;
      el.classList.remove("is-hidden");
    } else {
      el.classList.add("is-hidden");
    }
  };

  const normalizeUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `https://${url}`;
  };

  const fetchJson = (url, options = {}) =>
    fetch(url, { cache: "no-store", ...options }).then((res) => {
      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }
      return res.json();
    });

  const fetchWithFallback = (primaryUrl, fallbackUrl) =>
    fetchJson(primaryUrl, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    }).catch(() => fetchJson(fallbackUrl));

  Promise.all([
    fetchWithFallback(userUrl, localUserUrl),
    fetchWithFallback(repoUrl, localRepoUrl),
    fetchJson(localUserUrl).catch(() => ({})),
  ])
    .then(([user, repos, localProfile]) => {
      const displayName = user.name || user.login || username;
      const handle = `@${user.login || username}`;
      const bio = user.bio || "Building modern web apps and sharing what I learn.";
      const company = user.company || "Independent";
      const location = user.location || "Remote";
      const website = normalizeUrl(user.blog || "");

      // HQ Panel
      setText("profile-name", displayName);
      setText("profile-role", user.company ? company : `GitHub ${handle}`);

      if (user.avatar_url) {
        const avatar = $("avatar-img");
        if (avatar) {
          avatar.src = user.avatar_url;
          avatar.alt = `${displayName} avatar`;
        }
      }

      setText("stat-repos", user.public_repos ?? "0");
      setText("stat-followers", user.followers ?? "0");
      setText("stat-following", user.following ?? "0");

      // HUD brand name
      setText("brand-name", displayName);

      // Hidden data elements (used by panel sync)
      setText("profile-location", location);
      setText("profile-company", company);

      const metaWebsite = $("profile-website");
      if (metaWebsite) {
        metaWebsite.textContent = website ? website.replace(/^https?:\/\//, "") : "Not listed";
      }

      // Links
      setLink("github-link", user.html_url);
      setLink("github-link-2", user.html_url);
      setLink("github-link-3", user.html_url);
      setLink("all-repos-link", `${user.html_url}?tab=repositories`);
      setLink("website-link", website, "Website");
      setLink("email-link", user.email ? `mailto:${user.email}` : "", "Email me");

      // Meta
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", `${displayName} on GitHub: ${bio}`);
      document.title = `${displayName} | GitHub Profile`;

      // Store repos as data attributes for panel sync
      const repoList = $("repo-list");
      if (repoList && Array.isArray(repos)) {
        repoList.innerHTML = "";
        const cleanRepos = repos.filter((repo) => !repo.fork).slice(0, 6);

        cleanRepos.forEach((repo) => {
          const div = document.createElement("div");
          div.setAttribute("data-repo", "true");
          div.setAttribute("data-name", repo.name || "");
          div.setAttribute("data-desc", repo.description || "No description provided yet.");
          div.setAttribute("data-lang", repo.language || "");
          div.setAttribute("data-stars", repo.stargazers_count || "0");
          div.setAttribute("data-url", repo.html_url || "#");
          repoList.appendChild(div);
        });
      }

      // Sync panel data if globe is ready
      if (typeof window.syncPanelData === "function") {
        window.syncPanelData();
      }
    })
    .catch(() => {
      // API failed — leave defaults in place
    });
})();
