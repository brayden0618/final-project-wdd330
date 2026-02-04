// User Preferences from URL
// -----------------------------
const PREFERENCES = {
  players: new URLSearchParams(window.location.search).get("players"),
  duration: new URLSearchParams(window.location.search).get("duration"),
  complexity: new URLSearchParams(window.location.search).get("complexity"),
  theme: new URLSearchParams(window.location.search).get("theme"),
  style: new URLSearchParams(window.location.search).get("style")
};

// Store preferences in localStorage
localStorage.setItem("preferences", JSON.stringify(PREFERENCES));

// -----------------------------
// DOM Elements
// -----------------------------
const summaryEl = document.getElementById("summary");
const boardEl = document.getElementById("board-games");
const cardEl = document.getElementById("card-games");

// -----------------------------
// Display user preferences
// -----------------------------
summaryEl.innerHTML = `
  <h2>Your Preferences</h2>
  <ul>
    ${Object.entries(PREFERENCES).map(([k,v]) => `<li><strong>${k}:</strong> ${v}</li>`).join("")}
  </ul>
`;

// -----------------------------
// Favorites
// -----------------------------
let FAVORITES = JSON.parse(localStorage.getItem("favorites")) || [];

function toggleFavorite(gameId, gameType) {
  const key = `${gameType}-${gameId}`;
  if (FAVORITES.includes(key)) {
    FAVORITES = FAVORITES.filter(f => f !== key);
  } else {
    FAVORITES.push(key);
  }
  localStorage.setItem("favorites", JSON.stringify(FAVORITES));
}

// -----------------------------
// Board Games (local JSON)
// -----------------------------
let BOARD_GAMES_DATA = {};

async function loadBoardGames() {
  try {
    const boardRes = await fetch("data/board-games.json");
    BOARD_GAMES_DATA = await boardRes.json();
    console.log("Board games loaded:", BOARD_GAMES_DATA);
  } catch (err) {
    console.error("Error loading board games:", err);
  }
}

async function displayBoardGames() {
  if (!PREFERENCES.theme) {
    boardEl.innerHTML = "<p>Please select a theme to see board games.</p>";
    return;
  }

  const selected = BOARD_GAMES_DATA[PREFERENCES.theme];
  console.log("Selected board games:", selected);

  if (!selected || selected.length === 0) {
    boardEl.innerHTML = "<p>No board games match your preferences.</p>";
    return;
  }

  boardEl.innerHTML = "";
  for (const item of selected.slice(0, 5)) {
    const section = document.createElement("div");
    section.classList.add("board-game");

    const key = `board-${item.id}`;
    const isFav = FAVORITES.includes(key);

    section.innerHTML = `
      <h3 class="game-title">
        ${item.name}
        <span class="game-preview">
          <img src="${item.image}" alt="${item.name}">
        </span>
      </h3>
      <p><strong>Players:</strong> ${item.minPlayers}-${item.maxPlayers}</p>
      <p><strong>Play Time:</strong> ${item.playTime} minutes</p>
      <p>${item.description.substring(0, 300)}...</p>
    `;

    const favBtn = document.createElement("button");
    favBtn.classList.add("fav-btn");
    if (isFav) favBtn.classList.add("favorited");
    favBtn.innerHTML = "★";
    favBtn.addEventListener("click", () => {
      toggleFavorite(item.id, "board");
      favBtn.classList.toggle("favorited");
    });

    section.appendChild(favBtn);
    boardEl.appendChild(section);
  }
}

// -----------------------------
// TCGAPIs - Card Games
// -----------------------------
const TCG_API_KEY = "c8a07dbb07ed1f340340fae68da53ffd7cce91333ece424b862efc28b5cc3e73"; 

async function fetchTCGAPICards(gameSlug, query) {
  try {
    const res = await fetch(
      `https://api.tcgapis.com/v1/cards/${gameSlug}?q=name:${encodeURIComponent(query)}`,
      {
        headers: {
          "x-api-key": TCG_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    if (!res.ok) throw new Error("TCGAPIs request failed");

    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.error("TCGAPIs fetch error:", err);
    return [];
  }
}

async function displayCardGames() {
  if (!PREFERENCES.theme) {
    cardEl.innerHTML = "<p>Please select a theme to see card games.</p>";
    return;
  }

  cardEl.innerHTML = "<p>Loading card games...</p>";

  // Map theme to TCGAPIs game slug
  const gameSlug = {
    fantasy: "mtg",
    family: "pokemon",
    adventure: "yugioh",
    sci_fi: "pokemon"
  }[PREFERENCES.theme];

  const cards = await fetchTCGAPICards(gameSlug, PREFERENCES.theme);

  if (cards.length === 0) {
    cardEl.innerHTML = "<p>No card games found.</p>";
    return;
  }

  cardEl.innerHTML = `<h2>${PREFERENCES.theme} Cards</h2><div class="card-container"></div>`;
  const container = cardEl.querySelector(".card-container");

  cards.slice(0, 6).forEach(c => {
    const cardDiv = document.createElement("div");
    cardDiv.classList.add("tcg-card");

    const imgSrc = c.images?.small || "";
    const largeImg = c.images?.large || "";
    const cardName = c.name || "Unknown";

    // Favorite button
    const favBtn = document.createElement("button");
    favBtn.classList.add("fav-btn");
    const key = `card-${c.id}`;
    if (FAVORITES.includes(key)) favBtn.classList.add("favorited");
    favBtn.innerHTML = "★";

    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(c.id, "card");
      favBtn.classList.toggle("favorited");
    });

    cardDiv.innerHTML = `
      <img src="${imgSrc}" alt="${cardName}">
      <p>${cardName}</p>
      <span class="card-preview">
        <img src="${largeImg}" alt="${cardName}">
      </span>
    `;

    cardDiv.appendChild(favBtn);
    container.appendChild(cardDiv);
  });
}

// -----------------------------
// Initialize Page
// -----------------------------
(async function () {
  await loadBoardGames();

  if (PREFERENCES.style === "board-game") {
    await displayBoardGames();
  } else if (PREFERENCES.style === "card-game") {
    await displayCardGames();
  } else {
    // hybrid
    await displayBoardGames();
    await displayCardGames();
  }
})();