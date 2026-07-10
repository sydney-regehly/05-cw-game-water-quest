const board = document.querySelector("#board");
const scoreEl = document.querySelector("#score");
const bankScoreEl = document.querySelector("#bankScore");
const matchesEl = document.querySelector("#matches");
const penaltiesEl = document.querySelector("#penalties");
const roundMessage = document.querySelector("#roundMessage");
const crackStatus = document.querySelector("#crackStatus");
const tankFill = document.querySelector("#tankFill");
const impactPreview = document.querySelector("#impactPreview");
const resetButton = document.querySelector("#resetButton");
const winDialog = document.querySelector("#winDialog");
const finalGallons = document.querySelector("#finalGallons");
const impactSummary = document.querySelector("#impactSummary");
const playAgainButton = document.querySelector("#playAgainButton");
const closeDialogButton = document.querySelector("#closeDialogButton");
const confettiLayer = document.querySelector("#confettiLayer");

const CRACKED_TILE_PENALTY = 10;
const TOTAL_PAIRS = 8;
const SHOWER_GALLONS = 15.8;
const FAMILY_BASIC_DAY_GALLONS = 66;

const WATER_TILES = [
  { id: "drop", name: "Drop", gallons: 1, color: "#19b7d8", icon: "drop" },
  { id: "cup", name: "Cup", gallons: 2, color: "#087f9b", icon: "cup" },
  { id: "canteen", name: "Bottle", gallons: 5, color: "#2e8b57", icon: "bottle" },
  { id: "faucet", name: "Tap", gallons: 8, color: "#6b7c93", icon: "faucet" },
  { id: "bucket", name: "Bucket", gallons: 12, color: "#b85c38", icon: "bucket" },
  { id: "jug", name: "Jug", gallons: 18, color: "#d9a900", icon: "jug" },
  { id: "well", name: "Well", gallons: 25, color: "#111111", icon: "well" },
  { id: "tank", name: "Tank", gallons: 35, color: "#ffc907", icon: "tank" }
];

let tiles = [];
let selectedTiles = [];
let score = 0;
let matchedPairs = 0;
let crackedMatches = 0;
let inputLocked = false;

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createTiles() {
  const paired = WATER_TILES.flatMap((tile) => [
    { ...tile, uid: `${tile.id}-a`, cracked: false, matched: false },
    { ...tile, uid: `${tile.id}-b`, cracked: false, matched: false }
  ]);

  const shuffled = shuffle(paired);
  const crackedIndex = Math.floor(Math.random() * shuffled.length);
  shuffled[crackedIndex].cracked = true;
  return shuffled;
}

function iconSvg(tile) {
  const c = tile.color;
  const stroke = tile.id === "tank" ? "#111111" : c;

  const icons = {
    drop: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M40 8C30 23 19 37 19 51a21 21 0 0 0 42 0C61 37 50 23 40 8Z" fill="${c}" stroke="#111" stroke-width="4"/><circle cx="32" cy="48" r="5" fill="#fff" opacity=".75"/></svg>`,
    cup: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M23 17h34l-5 46H28L23 17Z" fill="#fff" stroke="#111" stroke-width="4"/><path d="M28 39h24l-3 20H31l-3-20Z" fill="${c}"/><path d="M56 29h9a8 8 0 0 1 0 16h-7" fill="none" stroke="#111" stroke-width="4"/></svg>`,
    bottle: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M32 9h16v14l7 9v35a5 5 0 0 1-5 5H30a5 5 0 0 1-5-5V32l7-9V9Z" fill="#fff" stroke="#111" stroke-width="4"/><path d="M29 42h22v22H29z" fill="${c}"/><path d="M32 9h16" stroke="#111" stroke-width="7" stroke-linecap="round"/></svg>`,
    faucet: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M16 30h30a12 12 0 0 1 12 12v5" fill="none" stroke="${stroke}" stroke-width="9" stroke-linecap="round"/><path d="M23 21h23" stroke="#111" stroke-width="7" stroke-linecap="round"/><path d="M58 49c-6 8-8 12-8 16a8 8 0 0 0 16 0c0-4-2-8-8-16Z" fill="#19b7d8" stroke="#111" stroke-width="3"/></svg>`,
    bucket: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M23 30h34l-5 38H28l-5-38Z" fill="${c}" stroke="#111" stroke-width="4"/><path d="M24 31c1-13 31-13 32 0" fill="none" stroke="#111" stroke-width="4"/><path d="M29 42h22" stroke="#fff" stroke-width="4" opacity=".65"/></svg>`,
    jug: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M27 14h24v13l8 8v28a7 7 0 0 1-7 7H28a7 7 0 0 1-7-7V35l6-8V14Z" fill="${c}" stroke="#111" stroke-width="4"/><path d="M51 36h5a10 10 0 0 1 0 20h-5" fill="none" stroke="#111" stroke-width="4"/><path d="M31 14h16" stroke="#111" stroke-width="7" stroke-linecap="round"/><path d="M30 42h14v20H30z" fill="#fff" opacity=".7"/></svg>`,
    well: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M20 35h40v32H20z" fill="#fff" stroke="#111" stroke-width="4"/><path d="M16 35h48L56 19H24l-8 16Z" fill="${c}" stroke="#111" stroke-width="4"/><path d="M29 49h22v18H29z" fill="#19b7d8"/><path d="M20 47h40M20 58h40" stroke="#111" stroke-width="3"/></svg>`,
    tank: `<svg viewBox="0 0 80 80" aria-hidden="true"><path d="M18 20h44v46H18z" fill="${c}" stroke="#111" stroke-width="4"/><path d="M18 29h44M18 45h44M18 61h44" stroke="#111" stroke-width="3"/><path d="M28 13h24v7H28z" fill="#111"/><path d="M30 37h20v18H30z" fill="#19b7d8"/></svg>`
  };

  return icons[tile.icon];
}

function crackSvg() {
  return `<span class="crack-mark" aria-label="Cracked tile"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M29 3 16 22h10L18 45l16-27H23L29 3Z" fill="#c9362c" stroke="#111" stroke-width="3" stroke-linejoin="round"/></svg></span>`;
}

function renderBoard() {
  board.innerHTML = "";

  tiles.forEach((tile) => {
    const button = document.createElement("button");
    button.className = "tile";
    button.type = "button";
    button.dataset.uid = tile.uid;
    button.dataset.tileId = tile.id;
    button.setAttribute("aria-label", `${tile.name}, ${tile.gallons} gallons`);
    button.innerHTML = `
      ${tile.cracked ? crackSvg() : ""}
      <span class="tile-icon">${iconSvg(tile)}</span>
      <span class="tile-name">
        <span>${tile.name}</span>
        <span class="tile-gallons">${tile.gallons}g</span>
      </span>
    `;
    button.addEventListener("click", () => chooseTile(tile.uid));
    board.appendChild(button);
  });
}