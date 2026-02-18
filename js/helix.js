(() => {
  const helix = document.getElementById("dna-helix");
  if (!helix) return;

  const RUNGS = 30;

  for (let i = 0; i < RUNGS; i++) {
    const rung = document.createElement("div");
    rung.className = "dna-rung";
    rung.style.setProperty("--i", i);
    helix.appendChild(rung);
  }

  let time = 0;

  const tick = () => {
    time += 0.15;
    const scroll = window.scrollY * 0.12;
    helix.style.setProperty("--offset", time + scroll);
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
})();
