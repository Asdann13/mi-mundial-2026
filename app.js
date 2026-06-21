(function () {
  "use strict";

  const GROUPS = {
    A: ["México", "Sudáfrica", "Corea del Sur", "Chequia"],
    B: ["Canadá", "Bosnia y Herzegovina", "Catar", "Suiza"],
    C: ["Brasil", "Marruecos", "Haití", "Escocia"],
    D: ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
    E: ["Costa de Marfil", "Ecuador", "Alemania", "Curazao"],
    F: ["Países Bajos", "Japón", "Suecia", "Túnez"],
    G: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
    H: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"],
    I: ["Francia", "Senegal", "Irak", "Noruega"],
    J: ["Argentina", "Argelia", "Austria", "Jordania"],
    K: ["Portugal", "RD del Congo", "Uzbekistán", "Colombia"],
    L: ["Inglaterra", "Croacia", "Ghana", "Panamá"]
  };

  const FLAGS = {
    "México": "🇲🇽", "Sudáfrica": "🇿🇦", "Corea del Sur": "🇰🇷", "Chequia": "🇨🇿",
    "Canadá": "🇨🇦", "Bosnia y Herzegovina": "🇧🇦", "Catar": "🇶🇦", "Suiza": "🇨🇭",
    "Brasil": "🇧🇷", "Marruecos": "🇲🇦", "Haití": "🇭🇹", "Escocia": "🏴",
    "Estados Unidos": "🇺🇸", "Paraguay": "🇵🇾", "Australia": "🇦🇺", "Turquía": "🇹🇷",
    "Costa de Marfil": "🇨🇮", "Ecuador": "🇪🇨", "Alemania": "🇩🇪", "Curazao": "🇨🇼",
    "Países Bajos": "🇳🇱", "Japón": "🇯🇵", "Suecia": "🇸🇪", "Túnez": "🇹🇳",
    "Bélgica": "🇧🇪", "Egipto": "🇪🇬", "Irán": "🇮🇷", "Nueva Zelanda": "🇳🇿",
    "España": "🇪🇸", "Cabo Verde": "🇨🇻", "Arabia Saudita": "🇸🇦", "Uruguay": "🇺🇾",
    "Francia": "🇫🇷", "Senegal": "🇸🇳", "Irak": "🇮🇶", "Noruega": "🇳🇴",
    "Argentina": "🇦🇷", "Argelia": "🇩🇿", "Austria": "🇦🇹", "Jordania": "🇯🇴",
    "Portugal": "🇵🇹", "RD del Congo": "🇨🇩", "Uzbekistán": "🇺🇿", "Colombia": "🇨🇴",
    "Inglaterra": "🏴", "Croacia": "🇭🇷", "Ghana": "🇬🇭", "Panamá": "🇵🇦"
  };

  const MATCH_PATTERN = [
    [0, 1, 1], [2, 3, 1],
    [0, 2, 2], [3, 1, 2],
    [3, 0, 3], [1, 2, 3]
  ];

  const GROUP_MATCHES = Object.entries(GROUPS).flatMap(([group, teams]) =>
    MATCH_PATTERN.map(([home, away, day], index) => ({
      id: `${group}-${index + 1}`,
      group,
      day,
      home: teams[home],
      away: teams[away]
    }))
  );

  const THIRD_WINNER_COLUMNS = ["A", "B", "D", "E", "G", "I", "K", "L"];
  const THIRD_MAP = Object.fromEntries(
    (window.THIRD_PLACE_DATA || "").split("|").filter(Boolean).map(entry => entry.split(":"))
  );

  const R32_DEFS = [
    [73, "2A", "2B"], [74, "1E", "3E"], [75, "1F", "2C"], [76, "1C", "2F"],
    [77, "1I", "3I"], [78, "2E", "2I"], [79, "1A", "3A"], [80, "1L", "3L"],
    [81, "1D", "3D"], [82, "1G", "3G"], [83, "2K", "2L"], [84, "1H", "2J"],
    [85, "1B", "3B"], [86, "1J", "2H"], [87, "1K", "3K"], [88, "2D", "2G"]
  ];

  const LATER_ROUNDS = [
    { key: "r16", title: "Octavos", subtitle: "16 equipos", defs: [[89, "W74", "W77"], [90, "W73", "W75"], [91, "W76", "W78"], [92, "W79", "W80"], [93, "W83", "W84"], [94, "W81", "W82"], [95, "W86", "W88"], [96, "W85", "W87"]] },
    { key: "qf", title: "Cuartos", subtitle: "8 equipos", defs: [[97, "W89", "W90"], [98, "W93", "W94"], [99, "W91", "W92"], [100, "W95", "W96"]] },
    { key: "sf", title: "Semifinales", subtitle: "4 equipos", defs: [[101, "W97", "W98"], [102, "W99", "W100"]] },
    { key: "finals", title: "Finales", subtitle: "La definición", defs: [[103, "L101", "L102"], [104, "W101", "W102"]] }
  ];

  const STORAGE_STATE = "mi-mundial-2026-state-v1";
  const STORAGE_SCENARIOS = "mi-mundial-2026-scenarios-v1";

  const defaultState = () => ({ groupScores: {}, knockoutScores: {} });
  const clone = value => JSON.parse(JSON.stringify(value));

  let state = readJSON(STORAGE_STATE, defaultState());
  let scenarios = readJSON(STORAGE_SCENARIOS, {});
  let activeScenario = "";
  let activeGroupFilter = "Todos";
  let model;
  let toastTimer;
  let scoreRenderTimer;

  function readJSON(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_STATE, JSON.stringify(state));
  }

  function saveScenarios() {
    localStorage.setItem(STORAGE_SCENARIOS, JSON.stringify(scenarios));
  }

  function numberOrNull(value) {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 ? number : null;
  }

  function scoreFor(match) {
    const saved = state.groupScores[match.id] || {};
    const home = numberOrNull(saved.home);
    const away = numberOrNull(saved.away);
    return { home, away, complete: home !== null && away !== null };
  }

  function calculateTable(group) {
    const teams = GROUPS[group];
    const rows = teams.map((name, original) => ({
      name, original, played: 0, wins: 0, draws: 0, losses: 0,
      gf: 0, ga: 0, gd: 0, points: 0, h2hPoints: 0, h2hGd: 0, h2hGf: 0
    }));
    const byName = Object.fromEntries(rows.map(row => [row.name, row]));
    const completed = [];

    GROUP_MATCHES.filter(match => match.group === group).forEach(match => {
      const score = scoreFor(match);
      if (!score.complete) return;
      completed.push({
        homeTeam: match.home,
        awayTeam: match.away,
        homeGoals: score.home,
        awayGoals: score.away
      });
      const home = byName[match.home];
      const away = byName[match.away];
      home.played += 1; away.played += 1;
      home.gf += score.home; home.ga += score.away;
      away.gf += score.away; away.ga += score.home;
      if (score.home > score.away) {
        home.wins += 1; home.points += 3; away.losses += 1;
      } else if (score.home < score.away) {
        away.wins += 1; away.points += 3; home.losses += 1;
      } else {
        home.draws += 1; away.draws += 1; home.points += 1; away.points += 1;
      }
    });
    rows.forEach(row => { row.gd = row.gf - row.ga; });

    const primary = (a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf;
    rows.sort((a, b) => primary(a, b) || a.original - b.original);

    for (let start = 0; start < rows.length;) {
      let end = start + 1;
      while (end < rows.length && primary(rows[start], rows[end]) === 0) end += 1;
      const cluster = rows.slice(start, end);
      if (cluster.length > 1) {
        const names = new Set(cluster.map(row => row.name));
        cluster.forEach(row => { row.h2hPoints = 0; row.h2hGd = 0; row.h2hGf = 0; });
        completed.filter(match => names.has(match.homeTeam) && names.has(match.awayTeam)).forEach(match => {
          const home = cluster.find(row => row.name === match.homeTeam);
          const away = cluster.find(row => row.name === match.awayTeam);
          home.h2hGf += match.homeGoals; home.h2hGd += match.homeGoals - match.awayGoals;
          away.h2hGf += match.awayGoals; away.h2hGd += match.awayGoals - match.homeGoals;
          if (match.homeGoals > match.awayGoals) home.h2hPoints += 3;
          else if (match.homeGoals < match.awayGoals) away.h2hPoints += 3;
          else { home.h2hPoints += 1; away.h2hPoints += 1; }
        });
        cluster.sort((a, b) => b.h2hPoints - a.h2hPoints || b.h2hGd - a.h2hGd || b.h2hGf - a.h2hGf || a.original - b.original);
        rows.splice(start, cluster.length, ...cluster);
      }
      start = end;
    }

    rows.forEach((row, index) => { row.position = index + 1; row.remaining = 3 - row.played; });
    return { rows, completed: completed.length };
  }

  function makeModel() {
    const rankings = {};
    Object.keys(GROUPS).forEach(group => { rankings[group] = calculateTable(group); });
    const thirds = Object.keys(GROUPS).map((group, groupOrder) => ({
      ...rankings[group].rows[2], group, groupOrder
    })).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.groupOrder - b.groupOrder);
    thirds.forEach((row, index) => { row.thirdPosition = index + 1; });
    const completed = GROUP_MATCHES.filter(match => scoreFor(match).complete).length;
    return { rankings, thirds, completed, allComplete: completed === GROUP_MATCHES.length };
  }

  function statusFor(row, group) {
    const groupData = model.rankings[group];
    if (groupData.completed === 0) return { label: "Por jugar", tone: "" };
    const thirdIndex = model.thirds.findIndex(third => third.group === group);
    if (groupData.completed === 6) {
      if (row.position <= 2) return { label: "Clasificado", tone: "green" };
      if (row.position === 3 && model.allComplete && thirdIndex < 8) return { label: "Clasificado", tone: "green" };
      if (row.position === 3 && !model.allComplete && thirdIndex < 8) return { label: "En zona 3.º", tone: "amber" };
      if (model.allComplete || row.position === 4) return { label: "Eliminado", tone: "red" };
      return { label: "En espera", tone: "amber" };
    }

    const maxPoints = row.points + row.remaining * 3;
    const opponents = groupData.rows.filter(other => other.name !== row.name);
    const canReachCurrent = opponents.filter(other => other.points + other.remaining * 3 >= row.points).length;
    const alreadyAboveMaximum = opponents.filter(other => other.points > maxPoints).length;
    if (canReachCurrent <= 1) return { label: "Clasificado", tone: "green" };
    if (alreadyAboveMaximum >= 2 && row.position === 4) return { label: "Sin opción top 2", tone: "red" };
    if (row.position <= 2) return { label: "En zona", tone: "green" };
    if (row.position === 3 && thirdIndex < 8) return { label: "En zona 3.º", tone: "amber" };
    return { label: "En disputa", tone: "" };
  }

  function flag(name) {
    return `<span class="flag" aria-hidden="true">${FLAGS[name] || "⚽"}</span>`;
  }

  function teamHTML(name, away = false) {
    return `<span class="team ${away ? "team--away" : ""}">${away ? `<span class="team-name">${name}</span>${flag(name)}` : `${flag(name)}<span class="team-name">${name}</span>`}</span>`;
  }

  function renderProgress() {
    const percent = Math.round(model.completed / GROUP_MATCHES.length * 100);
    document.getElementById("progress-label").textContent = `${model.completed} de ${GROUP_MATCHES.length} partidos de grupos`;
    document.getElementById("progress-percent").textContent = `${percent}%`;
    document.getElementById("progress-bar").style.width = `${percent}%`;
    document.getElementById("thirds-badge").textContent = `${model.completed ? 8 : 0}/8`;
  }

  function renderGroupFilter() {
    const filters = ["Todos", ...Object.keys(GROUPS)];
    document.getElementById("group-filter").innerHTML = filters.map(filter =>
      `<button class="filter-chip ${activeGroupFilter === filter ? "is-active" : ""}" data-group-filter="${filter}">${filter === "Todos" ? "Todos" : `Grupo ${filter}`}</button>`
    ).join("");
  }

  function renderGroups() {
    const groups = activeGroupFilter === "Todos" ? Object.keys(GROUPS) : [activeGroupFilter];
    document.getElementById("groups-grid").innerHTML = groups.map(group => {
      const matches = GROUP_MATCHES.filter(match => match.group === group);
      const groupData = model.rankings[group];
      const matchRows = matches.map(match => {
        const score = state.groupScores[match.id] || {};
        return `<div class="match-row">
          ${teamHTML(match.home)}
          <span class="score-boxes">
            <input class="score-input group-score" type="number" inputmode="numeric" min="0" max="30" aria-label="Goles de ${match.home} contra ${match.away}" data-match="${match.id}" data-side="home" value="${score.home ?? ""}">
            <span class="score-sep">–</span>
            <input class="score-input group-score" type="number" inputmode="numeric" min="0" max="30" aria-label="Goles de ${match.away} contra ${match.home}" data-match="${match.id}" data-side="away" value="${score.away ?? ""}">
          </span>
          ${teamHTML(match.away, true)}
        </div>`;
      }).join("");

      const tableRows = groupData.rows.map(row => {
        const status = statusFor(row, group);
        const rowClass = row.position <= 2 ? "qualifying" : row.position === 3 && model.thirds.findIndex(third => third.group === group) < 8 ? "third-zone" : "";
        return `<div class="standing-row ${rowClass}" title="${status.label}">
          <span class="standing-team"><span class="position">${row.position}</span><span class="status-dot ${status.tone}"></span>${flag(row.name)}<span class="team-name">${row.name}</span></span>
          <span>${row.played}</span><span>${row.gf}</span><span>${row.ga}</span><span>${row.gd > 0 ? "+" : ""}${row.gd}</span><strong>${row.points}</strong>
        </div>`;
      }).join("");

      return `<article class="group-card">
        <div class="group-card__header"><h3>Grupo ${group}</h3><span>${groupData.completed}/6 jugados</span></div>
        <div class="matches">${matchRows}</div>
        <div class="standings">
          <div class="standing-head"><span>SELECCIÓN</span><span>PJ</span><span>GF</span><span>GC</span><span>DG</span><span>PTS</span></div>
          ${tableRows}
        </div>
      </article>`;
    }).join("");
  }

  function renderThirds() {
    const head = `<div class="third-head"><span>#</span><span>SELECCIÓN</span><span>GRUPO</span><span>PJ</span><span>GF</span><span>GC</span><span>DG</span><span>PTS</span><span>ESTADO</span></div>`;
    const rows = model.thirds.map((row, index) => {
      const inZone = index < 8;
      let label = inZone ? (model.allComplete ? "Clasificado" : "En zona") : (model.allComplete ? "Eliminado" : "Fuera por ahora");
      if (!model.completed) label = "Por jugar";
      return `<div class="third-row ${inZone && model.completed ? "is-qualifying" : ""}">
        <span><strong>${index + 1}</strong></span>
        <span class="third-team">${flag(row.name)}${row.name}</span>
        <span>Grupo ${row.group}</span><span>${row.played}</span><span>${row.gf}</span><span>${row.ga}</span>
        <span>${row.gd > 0 ? "+" : ""}${row.gd}</span><strong>${row.points}</strong>
        <span class="third-status ${inZone && model.completed ? "in" : ""}">${label}</span>
      </div>`;
    }).join("");
    document.getElementById("thirds-table").innerHTML = head + rows;
  }

  function directTeam(code) {
    const position = Number(code[0]);
    const group = code[1];
    return model.rankings[group].rows[position - 1].name;
  }

  function makeParticipant(name, placeholder) {
    return { name, placeholder: Boolean(placeholder) };
  }

  function bracketOutcome(number, home, away) {
    if (home.placeholder || away.placeholder) return { winner: null, loser: null, homeScore: null, awayScore: null };
    const record = state.knockoutScores[number];
    const signature = `${home.name}|${away.name}`;
    if (!record || record.signature !== signature) {
      if (record) delete state.knockoutScores[number];
      return { winner: null, loser: null, homeScore: null, awayScore: null };
    }
    const homeScore = numberOrNull(record.home);
    const awayScore = numberOrNull(record.away);
    if (homeScore === null || awayScore === null) return { winner: null, loser: null, homeScore, awayScore };
    let winnerSide = null;
    if (homeScore > awayScore) winnerSide = "home";
    else if (awayScore > homeScore) winnerSide = "away";
    else if (record.winner === "home" || record.winner === "away") winnerSide = record.winner;
    if (!winnerSide) return { winner: null, loser: null, homeScore, awayScore, needsPenalties: true };
    return {
      winner: winnerSide === "home" ? home : away,
      loser: winnerSide === "home" ? away : home,
      winnerSide, homeScore, awayScore
    };
  }

  function buildBracket() {
    const hasProjection = model.completed > 0;
    const qualifyingThirds = model.thirds.slice(0, 8);
    const thirdKey = qualifyingThirds.map(row => row.group).sort().join("");
    const assignment = THIRD_MAP[thirdKey] || "";
    const thirdByWinner = {};
    THIRD_WINNER_COLUMNS.forEach((winnerGroup, index) => { thirdByWinner[winnerGroup] = assignment[index]; });
    const thirdTeamByGroup = Object.fromEntries(qualifyingThirds.map(row => [row.group, row.name]));

    const matches = new Map();
    const r32 = R32_DEFS.map(([number, homeCode, awayCode]) => {
      let home;
      let away;
      if (!hasProjection) {
        home = makeParticipant(homeCode.startsWith("2") ? `Segundo del grupo ${homeCode[1]}` : `Primero del grupo ${homeCode[1]}`, true);
        away = makeParticipant(awayCode.startsWith("2") ? `Segundo del grupo ${awayCode[1]}` : `Mejor tercero asignado`, true);
      } else {
        home = makeParticipant(directTeam(homeCode));
        if (awayCode.startsWith("2")) away = makeParticipant(directTeam(awayCode));
        else {
          const winnerGroup = awayCode[1];
          const thirdGroup = thirdByWinner[winnerGroup];
          away = thirdGroup ? makeParticipant(thirdTeamByGroup[thirdGroup]) : makeParticipant("Mejor tercero asignado", true);
        }
      }
      const outcome = bracketOutcome(number, home, away);
      const match = { number, home, away, ...outcome };
      matches.set(number, match);
      return match;
    });

    function fromSource(source) {
      const kind = source[0];
      const number = Number(source.slice(1));
      const previous = matches.get(number);
      const participant = kind === "W" ? previous?.winner : previous?.loser;
      return participant || makeParticipant(`${kind === "W" ? "Ganador" : "Perdedor"} M${number}`, true);
    }

    const rounds = [{ key: "r32", title: "Dieciseisavos", subtitle: "32 equipos", matches: r32 }];
    LATER_ROUNDS.forEach(round => {
      const roundMatches = round.defs.map(([number, homeSource, awaySource]) => {
        const home = fromSource(homeSource);
        const away = fromSource(awaySource);
        const outcome = bracketOutcome(number, home, away);
        const match = { number, home, away, ...outcome };
        matches.set(number, match);
        return match;
      });
      rounds.push({ ...round, matches: roundMatches });
    });
    return { rounds, champion: matches.get(104)?.winner || null, hasProjection };
  }

  function knockoutTeamRow(match, participant, side) {
    const isWinner = match.winnerSide === side;
    const score = side === "home" ? match.homeScore : match.awayScore;
    const record = state.knockoutScores[match.number] || {};
    const rawScore = record[side] ?? (score ?? "");
    const content = participant.placeholder
      ? `<span class="knockout-team__name team-placeholder">${participant.name}</span>`
      : `<span class="knockout-team__name">${flag(participant.name)}<span class="team-name">${participant.name}</span></span>`;
    return `<div class="knockout-team ${isWinner ? "is-winner" : ""}">
      ${content}
      <input class="score-input knockout-score" type="number" inputmode="numeric" min="0" max="30" aria-label="Goles de ${participant.name} en el partido ${match.number}" data-ko-match="${match.number}" data-ko-side="${side}" value="${rawScore}" ${participant.placeholder ? "disabled" : ""}>
    </div>`;
  }

  function knockoutCard(match) {
    const special = match.number === 103 ? " · Tercer puesto" : match.number === 104 ? " · Final" : "";
    const penalties = match.needsPenalties ? `<div class="penalty-choice"><p>¿Quién pasa por penales?</p><button data-penalty-match="${match.number}" data-penalty-side="home">${match.home.name}</button><button data-penalty-match="${match.number}" data-penalty-side="away">${match.away.name}</button></div>` : "";
    return `<article class="knockout-match">
      <div class="knockout-match__number">PARTIDO ${match.number}${special}</div>
      ${knockoutTeamRow(match, match.home, "home")}
      ${knockoutTeamRow(match, match.away, "away")}
      ${penalties}
    </article>`;
  }

  function renderBracket() {
    const bracket = buildBracket();
    const pill = document.getElementById("projection-pill");
    pill.className = `projection-pill ${model.allComplete ? "final" : bracket.hasProjection ? "live" : ""}`;
    pill.textContent = model.allComplete ? "Cruces definidos" : bracket.hasProjection ? "Proyección en vivo" : "Esperando resultados";

    document.getElementById("bracket-board").innerHTML = bracket.rounds.map(round => `<section class="round-column">
      <div class="round-title"><h3>${round.title}</h3><span>${round.subtitle}</span></div>
      <div class="round-matches">${round.matches.map(knockoutCard).join("")}</div>
    </section>`).join("");

    const info = document.getElementById("bracket-info");
    if (model.allComplete) info.querySelector("p").innerHTML = "Los cruces usan la combinación oficial de los ocho mejores terceros. Ya puedes completar las eliminatorias y escoger al ganador por penales cuando haya empate.";
    else if (bracket.hasProjection) info.querySelector("p").innerHTML = "Estos cruces son una <strong>proyección</strong> con la tabla actual. Si cambian los clasificados, se reajustan automáticamente y se limpian los marcadores eliminatorios que ya no correspondan.";
    else info.querySelector("p").textContent = "Completa algunos marcadores para ver la proyección de los cruces. Al terminar los 72 partidos, la asignación de los mejores terceros queda definida con la tabla oficial de FIFA.";

    const championCard = document.getElementById("champion-card");
    if (bracket.champion) {
      championCard.hidden = false;
      championCard.innerHTML = `<div class="trophy">🏆</div><p>CAMPEÓN DE TU MUNDIAL 2026</p><h2>${FLAGS[bracket.champion.name] || ""} ${bracket.champion.name}</h2>`;
    } else {
      championCard.hidden = true;
      championCard.innerHTML = "";
    }
  }

  function renderScenarioOptions() {
    const select = document.getElementById("scenario-select");
    select.innerHTML = "";
    const current = document.createElement("option");
    current.value = "";
    current.textContent = "Partida actual";
    select.appendChild(current);
    Object.keys(scenarios).sort((a, b) => a.localeCompare(b, "es")).forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });
    select.value = activeScenario;
    document.getElementById("delete-scenario").disabled = !activeScenario;
  }

  function renderAll() {
    model = makeModel();
    renderProgress();
    renderGroupFilter();
    renderGroups();
    renderThirds();
    renderBracket();
    renderScenarioOptions();
    saveState();
  }

  function toast(message) {
    const element = document.getElementById("toast");
    element.textContent = message;
    element.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("is-visible"), 2600);
  }

  function scheduleScoreRender() {
    clearTimeout(scoreRenderTimer);
    scoreRenderTimer = setTimeout(renderAll, 320);
  }

  function updateGroupScore(input, renderNow = true) {
    const { match, side } = input.dataset;
    const value = input.value.trim();
    state.groupScores[match] ||= {};
    if (value === "") delete state.groupScores[match][side];
    else {
      const score = Math.min(30, Math.max(0, Math.trunc(Number(value))));
      if (Number.isFinite(score)) state.groupScores[match][side] = String(score);
      else delete state.groupScores[match][side];
    }
    activeScenario = "";
    if (renderNow) renderAll();
    else { saveState(); scheduleScoreRender(); }
  }

  function updateKnockoutScore(input, renderNow = true) {
    const number = Number(input.dataset.koMatch);
    const side = input.dataset.koSide;
    const bracket = buildBracket();
    const match = bracket.rounds.flatMap(round => round.matches).find(item => item.number === number);
    if (!match || match.home.placeholder || match.away.placeholder) return;
    const value = input.value.trim();
    state.knockoutScores[number] ||= { signature: `${match.home.name}|${match.away.name}` };
    state.knockoutScores[number].signature = `${match.home.name}|${match.away.name}`;
    if (value === "") delete state.knockoutScores[number][side];
    else state.knockoutScores[number][side] = String(Math.min(30, Math.max(0, Math.trunc(Number(value)))));
    delete state.knockoutScores[number].winner;
    activeScenario = "";
    if (renderNow) renderAll();
    else { saveState(); scheduleScoreRender(); }
  }

  document.addEventListener("input", event => {
    if (event.target.matches(".group-score")) updateGroupScore(event.target, false);
    if (event.target.matches(".knockout-score")) updateKnockoutScore(event.target, false);
  });

  document.addEventListener("change", event => {
    if (event.target.matches(".group-score")) updateGroupScore(event.target, true);
    if (event.target.matches(".knockout-score")) updateKnockoutScore(event.target, true);
  });

  document.addEventListener("click", event => {
    const tab = event.target.closest("[data-view]");
    if (tab) {
      document.querySelectorAll(".tab").forEach(item => item.classList.toggle("is-active", item === tab));
      document.querySelectorAll(".view").forEach(view => view.classList.toggle("is-active", view.id === `${tab.dataset.view}-view`));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const filter = event.target.closest("[data-group-filter]");
    if (filter) {
      activeGroupFilter = filter.dataset.groupFilter;
      renderGroupFilter();
      renderGroups();
    }
    const penalty = event.target.closest("[data-penalty-match]");
    if (penalty) {
      const number = Number(penalty.dataset.penaltyMatch);
      if (state.knockoutScores[number]) {
        state.knockoutScores[number].winner = penalty.dataset.penaltySide;
        activeScenario = "";
        renderAll();
      }
    }
  });

  const menu = document.getElementById("actions-menu");
  const moreButton = document.getElementById("more-actions");
  moreButton.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
    moreButton.setAttribute("aria-expanded", String(!menu.hidden));
  });
  document.addEventListener("click", event => {
    if (!menu.hidden && !menu.contains(event.target) && event.target !== moreButton) {
      menu.hidden = true;
      moreButton.setAttribute("aria-expanded", "false");
    }
  });

  const dialog = document.getElementById("scenario-dialog");
  document.getElementById("save-scenario").addEventListener("click", () => {
    document.getElementById("scenario-name").value = activeScenario || "";
    dialog.showModal();
    setTimeout(() => document.getElementById("scenario-name").focus(), 20);
  });

  document.getElementById("scenario-form").addEventListener("submit", event => {
    const submitter = event.submitter;
    if (!submitter || submitter.value === "cancel") return;
    event.preventDefault();
    const name = document.getElementById("scenario-name").value.trim();
    if (!name) return;
    scenarios[name] = clone(state);
    activeScenario = name;
    saveScenarios();
    dialog.close();
    renderScenarioOptions();
    toast(`Escenario “${name}” guardado`);
  });

  document.getElementById("scenario-select").addEventListener("change", event => {
    const name = event.target.value;
    activeScenario = name;
    state = name && scenarios[name] ? clone(scenarios[name]) : readJSON(STORAGE_STATE, defaultState());
    renderAll();
    if (name) toast(`Escenario “${name}” cargado`);
  });

  document.getElementById("delete-scenario").addEventListener("click", () => {
    if (!activeScenario) return;
    const name = activeScenario;
    if (!window.confirm(`¿Eliminar el escenario “${name}”?`)) return;
    delete scenarios[name];
    activeScenario = "";
    saveScenarios();
    renderScenarioOptions();
    menu.hidden = true;
    toast("Escenario eliminado");
  });

  document.getElementById("reset-all").addEventListener("click", () => {
    if (!window.confirm("¿Borrar todos los marcadores de la partida actual? Los escenarios guardados no se borrarán.")) return;
    state = defaultState();
    activeScenario = "";
    menu.hidden = true;
    renderAll();
    toast("Marcadores borrados");
  });

  document.getElementById("export-data").addEventListener("click", () => {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), state, scenarios }, null, 2);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    link.download = "mi-mundial-2026-respaldo.json";
    link.click();
    URL.revokeObjectURL(link.href);
    menu.hidden = true;
    toast("Respaldo exportado");
  });

  document.getElementById("import-file").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.state || !data.scenarios) throw new Error("Formato inválido");
      state = data.state;
      scenarios = data.scenarios;
      activeScenario = "";
      saveScenarios();
      renderAll();
      toast("Respaldo importado");
    } catch (_) {
      toast("No se pudo importar ese archivo");
    }
    event.target.value = "";
    menu.hidden = true;
  });

  renderAll();
})();
