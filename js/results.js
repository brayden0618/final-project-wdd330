console.log("results.js loaded");

/* Read survey parameters */
const params = new URLSearchParams(window.location.search);

const preferences = {
    players: params.get("players"),
    duration: params.get("duration"),
    complexity: params.get("complexity"),
    theme: params.get("theme"),
    style: params.get("style")
};

console.log("Preferences:", preferences);

/* DOM elements */
const summaryEl = document.getElementById("summary");
const resultsEl = document.getElementById("recommendations");

if (!summaryEl || !resultsEl) {
    console.error("Missing #summary or #recommendations element");
}

/* Save preferences to localStorage */
localStorage.setItem("preferences", JSON.stringify(preferences));

/* Display preferences summary */
summaryEl.innerHTML = `
  <h2>Your Preferences</h2>
  <ul>
    ${Object.entries(preferences)
        .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
        .join("")}
  </ul>
`;

/* BOARD GAME LOGIC */

/* Choose a board game based on answers */
function chooseBoardGame(prefs) {
    if (prefs.complexity === "hard") return "Gloomhaven";
    if (prefs.duration === "long") return "Terraforming Mars";
    if (prefs.theme === "family") return "Ticket to Ride";
    if (prefs.players === "1-2") return "Jaipur";
    if (prefs.theme === "fantasy") return "Catan";
    return "Catan";
}

/* Fetch BoardGameGeek data */
async function fetchBoardGameFromBGG(gameName) {
    try {
        console.log("Searching BGG for:", gameName);

        // SEARCH endpoint
        const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(
            gameName
        )}&type=boardgame`;

        const searchResponse = await fetch(searchUrl);
        const searchText = await searchResponse.text();

        const searchXML = new DOMParser().parseFromString(
            searchText,
            "application/xml"
        );

        const item = searchXML.querySelector("item");
        if (!item) throw new Error("Game not found on BGG");

        const gameId = item.getAttribute("id");

        // THING endpoint
        const detailsUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${gameId}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsText = await detailsResponse.text();

        const detailsXML = new DOMParser().parseFromString(
            detailsText,
            "application/xml"
        );

        return {
            name: detailsXML
                .querySelector('name[type="primary"]')
                .getAttribute("value"),
            image:
                detailsXML.querySelector("image")?.textContent ||
                "images/placeholder.png",
            description:
                detailsXML.querySelector("description")?.textContent ||
                "No description available.",
            minPlayers:
                detailsXML.querySelector("minplayers")?.getAttribute("value"),
            maxPlayers:
                detailsXML.querySelector("maxplayers")?.getAttribute("value"),
            playTime:
                detailsXML.querySelector("playingtime")?.getAttribute("value")
        };
    } catch (error) {
        console.error("BGG API error:", error);
        return null;
    }
}

/* CARD GAME LOGIC */

async function fetchCardGameData() {
    try {
        resultsEl.innerHTML =
            "<p>Drawing cards to recommend a card game...</p>";

        const response = await fetch(
            "https://deckofcardsapi.com/api/deck/new/draw/?count=5"
        );

        const data = await response.json();

        return data.cards.map((card) => ({
            image: card.image,
            value: card.value,
            suit: card.suit
        }));
    } catch (error) {
        console.error("Card API error:", error);
        return [];
    }
}

/* LOAD RESULTS BASED ON STYLE */

if (preferences.style === "board-game" || preferences.style === "hybrid") {
    const gameName = chooseBoardGame(preferences);

    resultsEl.innerHTML =
        "<p>Finding the perfect board game for you...</p>";

    fetchBoardGameFromBGG(gameName).then((game) => {
        if (!game) {
            resultsEl.innerHTML =
                "<p>Sorry, we couldn’t load a board game recommendation.</p>";
            return;
        }

        resultsEl.innerHTML = `
      <h2>Recommended Board Game</h2>

      <h3 class="game-title">
        ${game.name}
        <span class="game-preview">
          <img src="${game.image}" alt="${game.name}" width="200">
        </span>
      </h3>

      <p><strong>Players:</strong> ${game.minPlayers}–${game.maxPlayers}</p>
      <p><strong>Play Time:</strong> ${game.playTime} minutes</p>
      <p>${game.description.substring(0, 400)}...</p>
    `;
    });
}

/* CARD GAME RESULT */
else if (preferences.style === "card-game") {
    fetchCardGameData().then((cards) => {
        if (cards.length === 0) {
            resultsEl.innerHTML =
                "<p>Sorry, we couldn’t load a card game recommendation.</p>";
            return;
        }

        resultsEl.innerHTML = `
      <h2>Recommended Card Game</h2>
      <p>Based on your preferences, here’s a sample hand you might enjoy:</p>
      <div class="card-container">
        ${cards
                .map(
                    (card) =>
                        `<img src="${card.image}" alt="${card.value} of ${card.suit}" width="90">`
                )
                .join("")}
      </div>
      <p>This style of game emphasizes luck, quick rounds, and replayability.</p>
    `;
    });
}