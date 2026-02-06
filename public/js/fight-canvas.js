(() => {
  window.startFight = function startFight(data) {
    const canvas = document.getElementById("fight");
    const ctx = canvas.getContext("2d");

    // UI controls (si présents)
    const btnPlay = document.getElementById("btnPlay");
    const btnPause = document.getElementById("btnPause");
    const btnStep = document.getElementById("btnStep");
    const btnReset = document.getElementById("btnReset");
    const speedSelect = document.getElementById("speed");
    const hud = document.getElementById("hud");

    const boardW = data.board.width;
    const boardH = data.board.height;

    const TEAM_COLOR = { A: "#2d7ff9", B: "#f24b4b" };

    // ============================================================
    // 1) PLATEAU EN PERSPECTIVE : définis 4 coins à l'écran
    // TL = top-left (fond-gauche), TR = top-right (fond-droit)
    // BR = bottom-right (devant-droit), BL = bottom-left (devant-gauche)
    // ============================================================
    const BOARD_CORNERS = {
      TL: { x: 260, y: 250 },
      TR: { x: 650, y: 250 },
      BR: { x: 820, y: 430 },
      BL: { x: 80,  y: 430 },
    };

    // Helper lerp
    const lerp = (a, b, t) => a + (b - a) * t;

    // Interpolation bilinéaire dans un quad :
    // u in [0..1] sur X, v in [0..1] sur Y (v=0 fond, v=1 devant)
    function quadPoint(u, v) {
      const { TL, TR, BR, BL } = BOARD_CORNERS;

      // point sur l'arête du haut et du bas
      const topX = lerp(TL.x, TR.x, u);
      const topY = lerp(TL.y, TR.y, u);
      const botX = lerp(BL.x, BR.x, u);
      const botY = lerp(BL.y, BR.y, u);

      return {
        x: lerp(topX, botX, v),
        y: lerp(topY, botY, v),
      };
    }

    // Récupère les 4 coins d'une cellule (x,y) dans la grille
    function cellQuad(x, y) {
      const u0 = x / boardW;
      const u1 = (x + 1) / boardW;
      const v0 = y / boardH;
      const v1 = (y + 1) / boardH;

      const p00 = quadPoint(u0, v0); // top-left cell
      const p10 = quadPoint(u1, v0); // top-right cell
      const p11 = quadPoint(u1, v1); // bottom-right cell
      const p01 = quadPoint(u0, v1); // bottom-left cell

      return { p00, p10, p11, p01 };
    }

    // Centre d'une cellule pour placer une unité
    function cellCenter(x, y) {
      const { p00, p10, p11, p01 } = cellQuad(x, y);
      return {
        cx: (p00.x + p10.x + p11.x + p01.x) / 4,
        cy: (p00.y + p10.y + p11.y + p01.y) / 4,
      };
    }

    // Approx taille de cellule (utile pour scale unit)
    function cellSizeApprox(x, y) {
      const { p00, p10, p01 } = cellQuad(x, y);
      const w = Math.hypot(p10.x - p00.x, p10.y - p00.y);      
      const h = Math.hypot(p01.x - p00.x, p01.y - p00.y);
      return { w, h };
    }

    function drawBoardBackdrop() {
        // Charger une image pour le fond
        const background = new Image();
        background.src = '../images/arene-background.png';  // Assurez-vous d'avoir un fond dans /public/images

        // Dessiner l'image de fond une fois qu'elle est chargée
        background.onload = function () {
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        };
    }

    function drawCell(x, y) {
      const { p00, p10, p11, p01 } = cellQuad(x, y);

      ctx.beginPath();
      ctx.moveTo(p00.x, p00.y);
      ctx.lineTo(p10.x, p10.y);
      ctx.lineTo(p11.x, p11.y);
      ctx.lineTo(p01.x, p01.y);
      ctx.closePath();

      ctx.strokeStyle = "rgb(255, 0, 0)";
      ctx.stroke();
    }

    // ============================================================
    // STATE
    // ============================================================
    const initialUnits = (data.units ?? []).map(u => ({ ...u }));
    const units = new Map();

    function buildInitialState() {
      units.clear();
      for (const u of initialUnits) {
        units.set(u.id, {
          id: u.id,
          name: u.name,
          team: u.team,
          x: u.x,
          y: u.y,
          hp: u.hp,
          alive: u.hp > 0,
          flash: 0,
          deadFading: false,
          _from: null,
          _to: null,
        });
      }
    }

    function getUnitById(id) {
      if (!units.has(id)) {
        units.set(id, {
          id,
          name: `#${id}`,
          team: "A",
          x: 0,
          y: 0,
          hp: 100,
          alive: true,
          flash: 0,
          deadFading: false,
          _from: null,
          _to: null,
        });
      }
      return units.get(id);
    }

    // ============================================================
    // DRAW UNITS (taille dépend de la taille de la case => profondeur)
    // ============================================================
    function drawUnit(u) {
      if (!u.alive && !u.deadFading) return;

      const { cx, cy } = cellCenter(u.x, u.y);
      const { w, h } = cellSizeApprox(u.x, u.y);

      // size dépend de la profondeur (case plus petite au fond)
      const s = Math.max(0.6, Math.min(1.25, (w / 120)));
      const size = 26 * s;

      // body (carré)
      ctx.beginPath();
      ctx.rect(cx - size / 2, cy - size, size, size);

      const baseColor = TEAM_COLOR[u.team] ?? "#aaa";
      ctx.fillStyle = (!u.alive && u.deadFading) ? "rgba(170,170,170,0.6)" : baseColor;
      ctx.fill();

      // flash outline
      if (u.flash > 0) {
        ctx.globalAlpha = Math.min(1, u.flash);
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
      }

      // name
      ctx.font = `${Math.round(12 * s)}px Arial`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(u.name, cx, cy - size - 10 * s);

      // hp
      ctx.font = `${Math.round(11 * s)}px Arial`;
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillText(`HP ${u.hp}`, cx, cy + 22 * s);
    }

    // ============================================================
    // TIMELINE
    // ============================================================
    const timeline = [];
    for (const round of (data.rounds ?? [])) {
      for (const a of Object.values(round.actions ?? {})) {
        timeline.push({ ...a, round: round.round });
      }
    }

    // ============================================================
    // FX
    // ============================================================
    const popTexts = []; // {x,y,text,life}

    function addPopText(unitId, text, isHeal = false) {
      const u = getUnitById(unitId);
      const { cx, cy } = cellCenter(u.x, u.y);
      const { w } = cellSizeApprox(u.x, u.y);
      const s = Math.max(0.6, Math.min(1.25, (w / 120)));

      popTexts.push({
        x: cx,
        y: cy - 26 * s,
        text: text,
        life: 1.0,
        isHeal: isHeal,  // Utilise un indicateur pour les soins
      });
    }

    function updateFx(speedFactor) {
      for (const u of units.values()) {
        u.flash = Math.max(0, u.flash - 0.06 * speedFactor);
      }
      for (let i = popTexts.length - 1; i >= 0; i--) {
        popTexts[i].life -= 0.02 * speedFactor;
        popTexts[i].y -= 0.7 * speedFactor;
        if (popTexts[i].life <= 0) popTexts.splice(i, 1);
      }
    }

    // ============================================================
    // PLAYER
    // ============================================================
    let current = null;
    let actionIndex = 0;

    let playing = true;
    let speed = 1;
    let lastNow = 0;
    let actionElapsed = 0;

    function setHud() {
      const done = actionIndex >= timeline.length && !current;
      const label = done
        ? `Terminé — winner: ${data.winner}`
        : current
          ? `Round ${current.round} — ${current.type} (${actionIndex}/${timeline.length})`
          : `Prêt — (${actionIndex}/${timeline.length})`;
      if (hud) hud.textContent = label;
    }

    function actionDuration(a) {
      if (!a) return 0;
      if (a.type === "move") return 450;
      if (a.type === "attack") return 420;
      return 300;
    }

    function beginAction(a) {
      current = a;
      actionElapsed = 0;

      if (a.type === "move") {
        const u = getUnitById(a.unit_id);
        u._from = { ...a.from };
        u._to = { ...a.to };
      }

      if (a.type === "attack") {
        const attacker = getUnitById(a.attacker_id);
        const target = getUnitById(a.target_id);

        attacker.flash = 1.0;
        target.flash = 1.0;

        if (a.attacker_position) {
          attacker.x = a.attacker_position.x;
          attacker.y = a.attacker_position.y;
        }
        if (a.target_position) {
          target.x = a.target_position.x;
          target.y = a.target_position.y;
        }

        addPopText(target.id, a.damage);  // Pop-up pour les dégâts

        target.hp = a.target_hp;
        if (a.dead) {
          target.alive = false;
          target.deadFading = true;
          setTimeout(() => { target.deadFading = false; }, 600);
        }
      }

      if (a.type === "heal") {
        const healer = getUnitById(a.healer_id);
        const target = getUnitById(a.target_id);

        healer.flash = 1.0;  // Flash pour le soigneur aussi
        target.flash = 1.0;  // Flash pour la cible

        // Mettre à jour les points de vie
        target.hp = a.target_hp;
        
        // Affichage du soin en pop-up
        addPopText(target.id, `+${a.healing}`, true);
      }
    }

    function finishAction() {
      if (current?.type === "move") {
        const u = getUnitById(current.unit_id);
        if (u._to) {
          u.x = u._to.x;
          u.y = u._to.y;
        }
        u._from = null;
        u._to = null;
      }
      current = null;
      actionElapsed = 0;
    }

    function stepOneActionInstant() {
      if (current) {
        finishAction();
        setHud();
        return;
      }
      if (actionIndex >= timeline.length) return;

      const a = timeline[actionIndex++];
      beginAction(a);

      if (a.type === "move") {
        const u = getUnitById(a.unit_id);
        u.x = a.to.x;
        u.y = a.to.y;
      }

      finishAction();
      setHud();
    }

    function resetFight() {
      buildInitialState();
      popTexts.length = 0;
      current = null;
      actionIndex = 0;
      actionElapsed = 0;
      setHud();
    }

    // init
    buildInitialState();
    setHud();

    // controls
    if (btnPlay) btnPlay.addEventListener("click", () => { playing = true; });
    if (btnPause) btnPause.addEventListener("click", () => { playing = false; });
    if (btnStep) btnStep.addEventListener("click", () => { playing = false; stepOneActionInstant(); });
    if (btnReset) btnReset.addEventListener("click", () => { resetFight(); });
    if (speedSelect) {
      speedSelect.addEventListener("change", () => {
        speed = parseFloat(speedSelect.value || "1");
      });
      speed = parseFloat(speedSelect.value || "1");
    }

    // ============================================================
    // UPDATE / RENDER
    // ============================================================
    function update(dtMs) {
      updateFx(playing ? speed : 0.35);

      if (!playing) return;

      const dt = dtMs * speed;

      if (!current) {
        if (actionIndex >= timeline.length) return;
        beginAction(timeline[actionIndex++]);
        setHud();
      }

      actionElapsed += dt;
      const dur = actionDuration(current);
      const p = Math.min(1, actionElapsed / dur);

      if (current.type === "move") {
        const u = getUnitById(current.unit_id);
        if (u._from && u._to) {
          u.x = u._from.x + (u._to.x - u._from.x) * p;
          u.y = u._from.y + (u._to.y - u._from.y) * p;
        }
      }

      if (p >= 1) {
        finishAction();
        setHud();
      }
    }

    function render() {
      drawBoardBackdrop();

      // draw board cells (du fond vers le devant = y croissant)
      for (let y = 0; y < boardH; y++) {
        for (let x = 0; x < boardW; x++) {
          drawCell(x, y);
        }
      }

      // unités : tri profondeur (y)
      const list = Array.from(units.values())
        .filter(u => u.alive || u.deadFading)
        .sort((a, b) => (a.y - b.y) || (a.x - b.x));

      for (const u of list) drawUnit(u);

      // pop texts : afficher les soins et les dégâts
      ctx.font = "16px Arial";
      ctx.textAlign = "center";
      for (const p of popTexts) {
        ctx.globalAlpha = Math.max(0, p.life);

        // Si c'est un soin, colorier en vert, sinon rouge pour les dégâts
        ctx.fillStyle = p.isHeal ? "rgba(0,255,0,0.9)" : "#fff";

        ctx.fillText(p.text, p.x, p.y);
        ctx.globalAlpha = 1;
      }

      // footer
      ctx.font = "12px Arial";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      const footer = playing ? `▶ x${speed}` : "⏸ pause";
      ctx.fillText(footer, 12, canvas.height - 14);
    }


    function loop(now) {
      if (!lastNow) lastNow = now;
      const dt = now - lastNow;
      lastNow = now;

      update(dt);
      render();
      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  };
})();
