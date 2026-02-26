// Simple caching (memory + localStorage) to reduce API calls
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

// ---------- helpers ----------
function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function fillSelect(select, options) {
  select.innerHTML = "";
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    select.appendChild(o);
  }
}

function renderTeam() {
  teamListEl.innerHTML = "";
  team.forEach((member) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${member.name}</strong> (ID: ${member.id})<br>
      Moves: ${member.moves.join(", ")}
    `;
    teamListEl.appendChild(li);
  });
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

  // Name + ID
  pokeNameEl.textContent = `${cap(poke.name)} (#${poke.id})`;

  // Image (official artwork preferred)
  const img =
    poke?.sprites?.other?.["official-artwork"]?.front_default ||
    poke?.sprites?.front_default ||
    "";
  pokeImgEl.src = img;
  pokeImgEl.alt = poke.name;

  // Audio (PokeAPI "cries" if available)
  const cry = poke?.cries?.latest || poke?.cries?.legacy || "";
  setAudio(cry);

  // Moves -> 4 dropdowns
  const moves = poke.moves.map((m) => m.move.name);
  const safeMoves = moves.length ? moves : ["(no moves found)"];

  moveSelects.forEach((sel) => fillSelect(sel, safeMoves));
}

// ---------- events ----------
btnFind.addEventListener("click", async () => {
  try {
    const data = await fetchPokemon(queryEl.value);
    updateUI(data);
  } catch (err) {
    alert(err.message);
  }
});

// optional: press Enter in input
queryEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnFind.click();
});

btnAdd.addEventListener("click", () => {
  if (!currentPokemon) {
    alert("Find a Pokemon first.");
    return;
  }

  const chosenMoves = moveSelects.map((sel) => sel.value);

  const member = {
    id: currentPokemon.id,
    name: cap(currentPokemon.name),
    moves: chosenMoves,
  };

  // optional: limit to 6
  if (team.length >= 6) {
    alert("Team is full (6). Remove one in code if you want more.");
    return;
  }

  team.push(member);
  localStorage.setItem("team", JSON.stringify(team));
  renderTeam();
});

// initial render
renderTeam();
