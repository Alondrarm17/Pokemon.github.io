// Cache (memory + localStorage)
const memCache = new Map();
const CACHE_PREFIX = "pokeCache:";

const queryEl = document.getElementById("query");
const btnFind = document.getElementById("btnFind");
const btnAdd = document.getElementById("btnAdd");

const pokeNameEl = document.getElementById("pokeName");
const pokeImgEl = document.getElementById("pokeImg");
const pokeAudioEl = document.getElementById("pokeAudio");
const audioMsgEl = document.getElementById("audioMsg");

const moveSelects = [
  document.getElementById("move1"),
  document.getElementById("move2"),
  document.getElementById("move3"),
  document.getElementById("move4"),
];

const teamListEl = document.getElementById("teamList");

let currentPokemon = null;
let team = JSON.parse(localStorage.getItem("team")) || [];

function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function niceName(str) {
  return (str || "").replaceAll("-", " ");
}

function fillSelect(select, options) {
  select.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = niceName(opt);
    select.appendChild(o);
  }
}

function setAudio(url) {
  if (!url) {
    pokeAudioEl.removeAttribute("src");
    pokeAudioEl.load();
    audioMsgEl.textContent = "No audio available for this Pokémon.";
    return;
  }
  pokeAudioEl.src = url;
  pokeAudioEl.load();
  audioMsgEl.textContent = "";
}

function getCached(key) {
  if (memCache.has(key)) return memCache.get(key);

  const raw = localStorage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    memCache.set(key, data);
    return data;
  } catch {
    return null;
  }
}

function setCached(key, data) {
  memCache.set(key, data);
  localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
}

async function fetchPokemon(query) {
  const cleaned = query.trim().toLowerCase();
  if (!cleaned) throw new Error("Please enter a Pokemon name or ID.");

  const cached = getCached(cleaned);
  if (cached) return cached;

  const url = `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(cleaned)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Pokemon not found. Try 1–151 or a valid name.");

  const data = await res.json();
  setCached(cleaned, data);
  return data;
}

function updateUI(poke) {
  currentPokemon = poke;

  // Name ONLY (no number)
  pokeNameEl.textContent = cap(poke.name);

  // Image
  const img =
    poke?.sprites?.other?.["official-artwork"]?.front_default ||
    poke?.sprites?.front_default ||
    "";
  pokeImgEl.src = img;
  pokeImgEl.alt = poke.name;

  // Audio (cries)
  const cry = poke?.cries?.latest || poke?.cries?.legacy || "";
  setAudio(cry);

  // Moves
  const moves = poke.moves.map((m) => m.move.name);
  const safeMoves = moves.length ? moves : ["(no moves found)"];
  moveSelects.forEach((sel) => fillSelect(sel, safeMoves));
}

function renderTeam() {
  teamListEl.innerHTML = "";

  if (team.length === 0) {
    teamListEl.innerHTML = `<div class="muted">No Pokémon added yet.</div>`;
    return;
  }

  team.forEach((member) => {
    const entry = document.createElement("div");
    entry.className = "teamEntry";

    entry.innerHTML = `
      <img src="${member.img}" alt="${member.name}" />
      <div>
        <h4>${member.name}</h4>
        <ul>
          <li><strong>Type:</strong> ${member.types.join(", ")}</li>
          <li><strong>Ability:</strong> ${member.abilities.join(", ")}</li>
          <li><strong>Moves:</strong> ${member.moves.map(niceName).join(", ")}</li>
        </ul>
      </div>
    `;

    teamListEl.appendChild(entry);
  });
}

// Events
btnFind.addEventListener("click", async () => {
  try {
    const data = await fetchPokemon(queryEl.value);
    updateUI(data);
  } catch (err) {
    alert(err.message);
  }
});

queryEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnFind.click();
});

btnAdd.addEventListener("click", () => {
  if (!currentPokemon) {
    alert("Find a Pokémon first.");
    return;
  }

  // Optional: limit to 6
  if (team.length >= 6) {
    alert("Team is full (6).");
    return;
  }

  const img =
    currentPokemon?.sprites?.other?.["official-artwork"]?.front_default ||
    currentPokemon?.sprites?.front_default ||
    "";

  const chosenMoves = moveSelects.map((sel) => sel.value);

  const types = (currentPokemon.types || []).map((t) => cap(t.type.name));
  const abilities = (currentPokemon.abilities || []).map((a) => cap(a.ability.name));

  const member = {
    id: currentPokemon.id, // kept internally if you want it later
    name: cap(currentPokemon.name),
    img: img,
    types: types.length ? types : ["Unknown"],
    abilities: abilities.length ? abilities : ["Unknown"],
    moves: chosenMoves,
  };

  team.push(member);
  localStorage.setItem("team", JSON.stringify(team));
  renderTeam();
});

// Initial render
renderTeam();
