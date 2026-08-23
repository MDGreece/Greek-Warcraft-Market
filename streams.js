function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function getTwitchParent() {
  /*
   * Twitch requires the actual host/domain
   * embedding the player.
   *
   * On GitHub Pages this will automatically
   * become mdgreece.github.io.
   */
  return window.location.hostname;
}


function playStream(
  login,
  displayName,
  title
) {
  const playerSection =
    document.getElementById(
      "streamPlayerSection"
    );

  const player =
    document.getElementById(
      "streamPlayer"
    );

  const streamer =
    document.getElementById(
      "activeStreamer"
    );

  const streamTitle =
    document.getElementById(
      "activeStreamTitle"
    );

  const parent =
    getTwitchParent();

  player.innerHTML = `
    <iframe
      src="https://player.twitch.tv/?channel=${encodeURIComponent(login)}&parent=${encodeURIComponent(parent)}&autoplay=true"
      width="100%"
      height="520"
      allowfullscreen
      frameborder="0"
    ></iframe>
  `;

  streamer.textContent =
    displayName;

  streamTitle.textContent =
    title;

  playerSection.hidden =
    false;

  playerSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function renderStreams(streams) {
  const grid =
    document.getElementById(
      "streamsGrid"
    );

  grid.innerHTML = "";

  if (
    !Array.isArray(streams) ||
    streams.length === 0
  ) {
    grid.innerHTML = `
      <div class="streams-empty">
        <h2>
          No Greek WoW streams are live right now.
        </h2>

        <p>
          Check again later.
        </p>
      </div>
    `;

    return;
  }

  streams.forEach(stream => {

    const card =
      document.createElement(
        "article"
      );

    card.className =
      "stream-card";

    card.innerHTML = `
      <div class="stream-thumbnail-wrapper">

        <img
          class="stream-thumbnail"
          src="${escapeHtml(stream.thumbnailUrl)}"
          alt="${escapeHtml(stream.userName)}"
          loading="lazy"
        >

        <span class="stream-live-badge">
          🔴 LIVE
        </span>

        <span class="stream-viewers">
          👁 ${Number(stream.viewerCount || 0).toLocaleString()}
        </span>

      </div>


      <div class="stream-card-content">

        <h2>
          ${escapeHtml(stream.userName)}
        </h2>

        <p class="stream-title">
          ${escapeHtml(stream.title)}
        </p>

        <div class="stream-actions">

          <button
            type="button"
            class="stream-watch-btn"
          >
            ▶ Watch Live
          </button>

          <a
            href="${escapeHtml(stream.twitchUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            class="stream-twitch-btn"
          >
            Twitch
          </a>

        </div>

      </div>
    `;

    const watchButton =
      card.querySelector(
        ".stream-watch-btn"
      );

    watchButton.addEventListener(
      "click",
      () => {
        playStream(
          stream.userLogin,
          stream.userName,
          stream.title
        );
      }
    );

    grid.appendChild(
      card
    );
  });
}


async function loadStreams() {
  const grid =
    document.getElementById(
      "streamsGrid"
    );

  try {

    const response =
      await fetch(
        `./data/twitch-streams.json?v=${Date.now()}`
      );

    if (!response.ok) {
      throw new Error(
        `Could not load streams: ${response.status}`
      );
    }

    const data =
      await response.json();

    renderStreams(
      data.streams || []
    );

  } catch (error) {

    console.error(
      "Could not load Twitch streams:",
      error
    );

    grid.innerHTML = `
      <div class="streams-empty">
        Could not load live streams.
      </div>
    `;

  }
}


document.addEventListener(
  "DOMContentLoaded",
  loadStreams
);
