const SHOWER_GALLONS = 18;
const FAMILY_BASIC_DAY_GALLONS = 150;
const CRACKED_TILE_PENALTY = 8;

const WATER_TILES = [
  { id: 1, name: "Drop", icon: "💧", gallons: 8 },
  { id: 2, name: "Cup", icon: "🥤", gallons: 10 },
  { id: 3, name: "Bottle", icon: "🧴", gallons: 12 },
  { id: 4, name: "Drip", icon: "💦", gallons: 14 },
  { id: 5, name: "Rain", icon: "🌧️", gallons: 16 },
  { id: 6, name: "Tap", icon: "🚰", gallons: 18 },
  { id: 7, name: "Bucket", icon: "🪣", gallons: 20 },
  { id: 8, name: "Spring", icon: "🌿", gallons: 22 },
  { id: 9, name: "Well", icon: "⛲", gallons: 24 },
  { id: 10, name: "River", icon: "🌊", gallons: 26 },
  { id: 11, name: "Gallon", icon: "🫙", gallons: 30 },
  { id: 12, name: "Tank", icon: "🛢️", gallons: 35 }
];

const TOTAL_PAIRS = WATER_TILES.length;
const GOAL_GALLONS = WATER_TILES.reduce((total, tile) => total + tile.gallons * 2, 0);
const LAYOUT_TILE_WIDTH = 16;
const LAYOUT_TILE_HEIGHT = 20;

const MAHJONG_LAYOUT = [
  { x: "4%", y: "5%", layer: 0 },
  { x: "18%", y: "5%", layer: 1 },
  { x: "32%", y: "5%", layer: 0 },
  { x: "46%", y: "5%", layer: 1 },
  { x: "60%", y: "5%", layer: 0 },
  { x: "74%", y: "5%", layer: 1 },
  { x: "10%", y: "26%", layer: 1 },
  { x: "24%", y: "26%", layer: 0 },
  { x: "38%", y: "26%", layer: 1 },
  { x: "52%", y: "26%", layer: 0 },
  { x: "66%", y: "26%", layer: 1 },
  { x: "80%", y: "26%", layer: 0 },
  { x: "4%", y: "47%", layer: 0 },
  { x: "18%", y: "47%", layer: 1 },
  { x: "32%", y: "47%", layer: 0 },
  { x: "46%", y: "47%", layer: 1 },
  { x: "60%", y: "47%", layer: 0 },
  { x: "74%", y: "47%", layer: 1 },
  { x: "10%", y: "68%", layer: 1 },
  { x: "24%", y: "68%", layer: 0 },
  { x: "38%", y: "68%", layer: 1 },
  { x: "52%", y: "68%", layer: 0 },
  { x: "66%", y: "68%", layer: 1 },
  { x: "80%", y: "68%", layer: 0 }
];

const scoreEl = document.getElementById("score");
const matchesEl = document.getElementById("matches");
const penaltiesEl = document.getElementById("penalties");
const timerEl = document.getElementById("timer");
const bankScoreEl = document.getElementById("bankScore");
const roundMessage = document.getElementById("roundMessage");
const crackStatus = document.getElementById("crackStatus");
const impactPreview = document.getElementById("impactPreview");
const tankFill = document.getElementById("tankFill");
const finalGallons = document.getElementById("finalGallons");
const impactSummary = document.getElementById("impactSummary");
const winDialog = document.getElementById("winDialog");
const resetButton = document.getElementById("resetButton");
const playAgainButton = document.getElementById("playAgainButton");
const closeDialogButton = document.getElementById("closeDialogButton");
const board = document.getElementById("board");
const confettiLayer = document.getElementById("confettiLayer");

let tiles = [];
let selectedTiles = [];
let score = 0;
let matchedPairs = 0;
let crackedMatches = 0;
let inputLocked = false;
let elapsedSeconds = 0;
let timerIntervalId = null;

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function createTiles() {
  const pairedTiles = WATER_TILES.flatMap((tile) => [
    { ...tile, uid: `${tile.id}-a`, matched: false, cracked: false },
    { ...tile, uid: `${tile.id}-b`, matched: false, cracked: false }
  ]);

  let newTiles = [];

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const shuffledTiles = shuffleArray(pairedTiles).map((tile) => ({
      ...tile,
      cracked: false
    }));
    const crackedIndex = Math.floor(Math.random() * shuffledTiles.length);
    shuffledTiles[crackedIndex].cracked = true;

    newTiles = shuffledTiles.map((tile, index) => ({
      ...tile,
      layout: MAHJONG_LAYOUT[index],
      revealed: false
    }));

    updateTileAvailability(newTiles);

    if (canMakeMatch(newTiles)) {
      return newTiles;
    }
  }

  updateTileAvailability(newTiles);
  return newTiles;
}

function parsePercent(value) {
  return Number.parseFloat(value.replace("%", ""));
}

function getTileBounds(tile) {
  const x = parsePercent(tile.layout.x);
  const y = parsePercent(tile.layout.y);

  return {
    left: x,
    right: x + LAYOUT_TILE_WIDTH,
    top: y,
    bottom: y + LAYOUT_TILE_HEIGHT
  };
}

function rectanglesOverlap(first, second) {
  return (
    first.left < second.right &&
    first.right > second.left &&
    first.top < second.bottom &&
    first.bottom > second.top
  );
}

function isCoveredByHigherTile(tile, tileList = tiles) {
  if (tile.matched) return false;

  const tileBounds = getTileBounds(tile);
  return tileList.some((otherTile) => {
    if (otherTile.uid === tile.uid || otherTile.matched) return false;
    if (otherTile.layout.layer <= tile.layout.layer) return false;
    return rectanglesOverlap(tileBounds, getTileBounds(otherTile));
  });
}

function updateTileAvailability(tileList = tiles) {
  tileList.forEach((tile) => {
    tile.revealed = !tile.matched && !isCoveredByHigherTile(tile, tileList);
  });
}

function isSurfaceTile(tile) {
  return tile.revealed && !tile.matched;
}

function chooseTile(uid) {
  if (inputLocked) return;

  const tile = tiles.find((item) => item.uid === uid);
  if (!tile || tile.matched || selectedTiles.some((selected) => selected.uid === uid)) {
    return;
  }

  if (!isSurfaceTile(tile)) {
    flashBlockedTile(uid);
    roundMessage.textContent = "That tile is still covered. Clear the tile above it first.";
    return;
  }

  selectedTiles.push(tile);
  syncTileClasses();

  if (selectedTiles.length === 2) {
    inputLocked = true;
    setTimeout(resolveSelection, 320);
  }
}

function resolveSelection() {
  const [first, second] = selectedTiles;

  if (first.id === second.id) {
    first.matched = true;
    second.matched = true;
    matchedPairs += 1;

    const baseScore = first.gallons * 2;
    const crackedUsed = first.cracked || second.cracked;
    const penalty = crackedUsed ? CRACKED_TILE_PENALTY : 0;
    score = Math.max(0, score + baseScore - penalty);

    if (crackedUsed) {
      crackedMatches += 1;
      roundMessage.textContent = `${first.name} cleared, but the cracked tile spilled ${penalty} gallons.`;
      crackStatus.textContent = "Cracked tile used";
    } else {
      roundMessage.textContent = `${first.name} pair collected ${baseScore} gallons.`;
    }
  } else {
    flashMismatch(first.uid, second.uid);
    roundMessage.textContent = "Those water symbols do not match.";
  }

  selectedTiles = [];
  updateTileAvailability();
  syncTileClasses();
  updateStats();
  inputLocked = false;

  if (matchedPairs === TOTAL_PAIRS) {
    setTimeout(showWin, 360);
  } else if (!canMakeMatch()) {
    setTimeout(reshuffleRemainingTiles, 320);
  }
}

function canMakeMatch(tileList = tiles) {
  const playableTiles = tileList.filter((tile) => isSurfaceTile(tile));

  for (let index = 0; index < playableTiles.length; index += 1) {
    for (let nextIndex = index + 1; nextIndex < playableTiles.length; nextIndex += 1) {
      if (playableTiles[index].id === playableTiles[nextIndex].id) {
        return true;
      }
    }
  }

  return false;
}

function reshuffleRemainingTiles() {
  const remainingTiles = tiles.filter((tile) => !tile.matched);
  const values = remainingTiles.map((tile) => ({
    id: tile.id,
    name: tile.name,
    icon: tile.icon,
    gallons: tile.gallons,
    cracked: tile.cracked
  }));

  const pairValue = values.find((value, index) => {
    return values.some((otherValue, otherIndex) => {
      return otherIndex !== index && otherValue.id === value.id;
    });
  });

  if (!pairValue) {
    updateTileAvailability();
    syncTileClasses();
    return;
  }

  const pairedValues = values.filter((value) => value.id === pairValue.id).slice(0, 2);
  const restValues = values.filter((value) => value.id !== pairValue.id || pairedValues.includes(value) === false);
  const shuffledRest = shuffleArray(restValues);
  const candidateTiles = tiles.map((tile) => ({ ...tile }));
  updateTileAvailability(candidateTiles);

  const playableSlots = candidateTiles.filter((tile) => !tile.matched && tile.revealed);

  if (playableSlots.length < 2) {
    updateTileAvailability();
    syncTileClasses();
    return;
  }

  playableSlots.slice(0, 2).forEach((tile, index) => {
    Object.assign(tile, pairedValues[index]);
  });

  candidateTiles
    .filter((tile) => !tile.matched && !playableSlots.slice(0, 2).some((slot) => slot.uid === tile.uid))
    .forEach((tile) => {
      const value = shuffledRest.shift();
      if (value) Object.assign(tile, value);
    });

  updateTileAvailability(candidateTiles);
  tiles = candidateTiles;
  selectedTiles = [];
  renderBoard();
  roundMessage.textContent = "No available pairs were left, so the remaining tiles were shuffled.";
}

function flashMismatch(firstUid, secondUid) {
  [firstUid, secondUid].forEach((uid) => {
    const tileEl = board.querySelector(`[data-uid="${uid}"]`);
    if (!tileEl) return;
    tileEl.classList.add("mismatch");
    setTimeout(() => tileEl.classList.remove("mismatch"), 300);
  });
}

function flashBlockedTile(uid) {
  const tileEl = board.querySelector(`[data-uid="${uid}"]`);
  if (!tileEl) return;
  tileEl.classList.add("blocked");
  setTimeout(() => tileEl.classList.remove("blocked"), 320);
}

function syncTileClasses() {
  tiles.forEach((tile) => {
    const tileEl = board.querySelector(`[data-uid="${tile.uid}"]`);
    if (!tileEl) return;
    tileEl.classList.toggle("selected", selectedTiles.some((selected) => selected.uid === tile.uid));
    tileEl.classList.toggle("matched", tile.matched);
    tileEl.classList.toggle("revealed", isSurfaceTile(tile));
    tileEl.classList.toggle("covered", !tile.matched && !isSurfaceTile(tile));
    tileEl.classList.toggle("cracked-tile", tile.cracked);
    tileEl.setAttribute("aria-disabled", String(!tile.matched && !isSurfaceTile(tile)));
    tileEl.disabled = tile.matched;
  });
}

function updateStats() {
  scoreEl.textContent = score;
  bankScoreEl.textContent = score;
  matchesEl.textContent = `${matchedPairs}/${TOTAL_PAIRS}`;
  penaltiesEl.textContent = crackedMatches;
  tankFill.style.height = `${Math.min(100, Math.round((score / GOAL_GALLONS) * 100))}%`;

  const showerCount = score / SHOWER_GALLONS;
  const familyDays = score / FAMILY_BASIC_DAY_GALLONS;
  impactPreview.textContent = `${score} gallons is about ${formatNumber(showerCount)} average showers or ${formatNumber(familyDays)} family basic-water days.`;
}

function formatTime(value) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function updateTimerDisplay() {
  if (timerEl) {
    timerEl.textContent = formatTime(elapsedSeconds);
  }
}

function startTimer() {
  stopTimer();
  elapsedSeconds = 0;
  updateTimerDisplay();
  timerIntervalId = window.setInterval(() => {
    elapsedSeconds += 1;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (timerIntervalId !== null) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

function formatNumber(value) {
  if (value < 1 && value > 0) return value.toFixed(2);
  if (value < 10) return value.toFixed(1);
  return Math.round(value).toString();
}

function renderBoard() {
  board.innerHTML = "";
  const fragment = document.createDocumentFragment();

  tiles.forEach((tile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tile layer-${tile.layout.layer}`;
    button.dataset.uid = tile.uid;
    button.dataset.tileId = tile.id;
    button.style.setProperty("--x", tile.layout.x);
    button.style.setProperty("--y", tile.layout.y);
    button.style.setProperty("--z", tile.layout.layer * 50 + tiles.indexOf(tile));
    button.setAttribute("aria-label", `${tile.name}, ${tile.gallons} gallons`);
    button.innerHTML = `
      ${tile.cracked ? `
        <span class="crack-lines" aria-hidden="true"></span>
        <span class="crack-mark" aria-label="Cracked tile">CRACKED</span>
      ` : ""}
      <span class="tile-icon" aria-hidden="true">${tile.icon}</span>
      <span class="tile-name">
        <span>${tile.name}</span>
        <span class="tile-gallons">${tile.gallons} gal</span>
      </span>
    `;
    button.addEventListener("click", () => chooseTile(tile.uid));
    fragment.appendChild(button);
  });

  board.appendChild(fragment);
  syncTileClasses();
}

function launchConfetti() {
  const colors = ["#ffc907", "#19b7d8", "#ffffff", "#111111", "#2e8b57", "#c9362c"];
  confettiLayer.innerHTML = "";

  for (let i = 0; i < 110; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--drift", `${Math.random() * 220 - 110}px`);
    piece.style.animationDelay = `${Math.random() * 420}ms`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    confettiLayer.appendChild(piece);
  }

  setTimeout(() => {
    confettiLayer.innerHTML = "";
  }, 1900);
}

function showWin() {
  stopTimer();
  finalGallons.textContent = score;
  const showers = formatNumber(score / SHOWER_GALLONS);
  const familyDays = formatNumber(score / FAMILY_BASIC_DAY_GALLONS);
  impactSummary.textContent = `${score} gallons is roughly ${showers} average showers, or ${familyDays} days of basic water for a five-person family using a 50-liter-per-person daily benchmark.`;
  launchConfetti();

  if (typeof winDialog.showModal === "function") {
    winDialog.showModal();
  } else {
    alert(`You collected ${score} gallons.`);
  }
}

function resetGame() {
  tiles = createTiles();
  selectedTiles = [];
  score = 0;
  matchedPairs = 0;
  crackedMatches = 0;
  inputLocked = false;
  roundMessage.textContent = "Match water pairs to fill the campus tank.";
  crackStatus.textContent = `Cracked tile: red badge, -${CRACKED_TILE_PENALTY} gal`;
  renderBoard();
  updateStats();
  startTimer();

  if (winDialog.open) {
    winDialog.close();
  }
}

resetButton.addEventListener("click", resetGame);
playAgainButton.addEventListener("click", resetGame);
closeDialogButton.addEventListener("click", () => winDialog.close());

resetGame();
