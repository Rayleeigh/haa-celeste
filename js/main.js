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

  const initialsFrom = (name) => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.map((part) => part[0]).join("").slice(0, 2).toUpperCase();
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
  ])
    .then(([user, repos]) => {
      const displayName = user.name || user.login || username;
      const handle = `@${user.login || username}`;
      const bio = user.bio || "Building modern web apps and sharing what I learn.";
      const company = user.company || "Independent";
      const location = user.location || "Remote";
      const website = normalizeUrl(user.blog || "");

      setText("brand-name", displayName);
      setText("brand-initials", initialsFrom(displayName) || username.slice(0, 2).toUpperCase());
      setText("hero-title", `Hi, I'm ${displayName}.`);
      setText("hero-bio", bio);
      setText("hero-handle", handle);
      setText("profile-name", displayName);
      setText("profile-role", user.company ? company : `GitHub ${handle}`);
      setText("profile-note", bio);
      setText("profile-location", location);
      setText("profile-company", company);

      if (user.avatar_url) {
        const avatar = $("avatar-img");
        if (avatar) avatar.src = user.avatar_url;
        if (avatar) avatar.alt = `${displayName} avatar`;
      }

      setText("stat-repos", user.public_repos ?? "0");
      setText("stat-followers", user.followers ?? "0");
      setText("stat-following", user.following ?? "0");

      setLink("github-link", user.html_url);
      setLink("github-link-2", user.html_url);
      setLink("github-link-3", user.html_url);
      setLink("all-repos-link", `${user.html_url}?tab=repositories`);

      const metaWebsite = $("profile-website");
      if (metaWebsite) {
        if (website) {
          metaWebsite.textContent = website.replace(/^https?:\/\//, "");
        } else {
          metaWebsite.textContent = "Not listed";
        }
      }

      setLink("website-link", website, "Website");
      setLink("email-link", user.email ? `mailto:${user.email}` : "", "Email me");

      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute("content", `${displayName} on GitHub: ${bio}`);
      document.title = `${displayName} | GitHub Profile`;

      const languageTags = $("language-tags");
      if (languageTags && Array.isArray(repos)) {
        const languages = repos
          .filter((repo) => !repo.fork && repo.language)
          .map((repo) => repo.language)
          .reduce((acc, lang) => {
            acc[lang] = (acc[lang] || 0) + 1;
            return acc;
          }, {});

        const topLanguages = Object.entries(languages)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([lang]) => lang);

        languageTags.innerHTML = "";
        if (topLanguages.length) {
          topLanguages.forEach((lang) => {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = lang;
            languageTags.appendChild(tag);
          });
        } else {
          const tag = document.createElement("span");
          tag.className = "tag";
          tag.textContent = "Open source";
          languageTags.appendChild(tag);
        }
      }

      const repoList = $("repo-list");
      if (repoList) {
        repoList.innerHTML = "";
        const cleanRepos = Array.isArray(repos)
          ? repos.filter((repo) => !repo.fork).slice(0, 6)
          : [];

        if (!cleanRepos.length) {
          repoList.innerHTML = `
            <div class="column is-12">
              <article class="project-card">
                <p class="loading">No public repositories available yet.</p>
              </article>
            </div>
          `;
          return;
        }

        cleanRepos.forEach((repo, index) => {
          const column = document.createElement("div");
          column.className = "column is-4";
          const language = repo.language ? `<span class="mono">${repo.language}</span>` : "";
          const stars = `<span class="mono">★ ${repo.stargazers_count}</span>`;
          const description = repo.description || "No description provided yet.";

          column.innerHTML = `
            <article class="project-card reveal" style="animation-delay: ${0.05 + index * 0.05}s">
              <h3>${repo.name}</h3>
              <p>${description}</p>
              <div class="project-meta">
                ${language}
                ${stars}
              </div>
              <a href="${repo.html_url}">View repo</a>
            </article>
          `;
          repoList.appendChild(column);
        });
      }
    })
    .catch(() => {
      const repoList = $("repo-list");
      if (repoList) {
        repoList.innerHTML = `
          <div class="column is-12">
            <article class="project-card">
              <p class="loading">Unable to load GitHub data right now.</p>
            </article>
          </div>
        `;
      }
    });
})();
