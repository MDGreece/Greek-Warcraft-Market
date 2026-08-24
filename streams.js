function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function getTwitchParent() {
  return window.location.hostname;
}


function formatViewerCount(value) {
  const number =
    Number(value || 0);

  return number.toLocaleString();
}


function playStream(stream) {
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

  const title =
    document.getElementById(
      "activeStreamTitle"
    );

  const viewers =
    document.getElementById(
      "activeViewerCount"
    );

  const twitchLink =
    document.getElementById(
      "activeTwitchLink"
    );

  const parent =
    getTwitchParent();


  player.innerHTML = `
    <iframe
      src="https://player.twitch.tv/?channel=${encodeURIComponent(stream.userLogin)}&parent=${encodeURIComponent(parent)}&autoplay=true"
      width="100%"
      height="560"
      allowfullscreen
      frameborder="0"
    ></iframe>
  `;


  streamer.textContent =
    stream.userName;


  title.textContent =
    stream.title;


  viewers.textContent =
    `👁 ${formatViewerCount(stream.viewerCount)} viewers`;


  twitchLink.href =
    stream.twitchUrl;


  playerSection.hidden =
    false;


  document
    .querySelectorAll(
      ".stream-card"
    )
    .forEach(card => {
      card.classList.remove(
        "stream-card-active"
      );
    });


  const activeCard =
    document.querySelector(
      `[data-stream-login="${CSS.escape(stream.userLogin)}"]`
    );

  if (activeCard) {
    activeCard.classList.add(
      "stream-card-active"
    );
  }


  playerSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


function createStreamCard(stream) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "stream-card";

  card.dataset.streamLogin =
    stream.userLogin;


  card.innerHTML = `

    <div class="stream-thumbnail-wrapper">

      <img
        class="stream-thumbnail"
        src="${escapeHtml(stream.thumbnailUrl)}"
        alt="${escapeHtml(stream.userName)} live stream"
        loading="lazy"
      >

      <span class="stream-live-badge">
        LIVE
      </span>

      <span class="stream-viewers">
        👁 ${formatViewerCount(stream.viewerCount)}
      </span>

    </div>


    <div class="stream-card-body">

      <div class="stream-card-top">

        <h3>
          ${escapeHtml(stream.userName)}
        </h3>

        <span class="stream-language">
          GR
        </span>

      </div>


      <p class="stream-card-title">
        ${escapeHtml(stream.title)}
      </p>


      <div class="stream-card-footer">

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
      playStream(stream);
    }
  );


  return card;
}


function renderStreams(data) {
  const streams =
    Array.isArray(data.streams)
      ? data.streams
      : [];


  const grid =
    document.getElementById(
      "streamsGrid"
    );


  const count =
    document.getElementById(
      "liveStreamCount"
    );


  const updatedAt =
    document.getElementById(
      "streamsUpdatedAt"
    );


  count.textContent =
    streams.length;


  if (data.updatedAt) {
    const date =
      new Date(
        data.updatedAt
      );

    updatedAt.textContent =
      `Updated ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
  }


  grid.innerHTML = "";


  if (streams.length === 0) {

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

    grid.appendChild(
      createStreamCard(
        stream
      )
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
      data
    );

  } catch (error) {

    console.error(
      "Could not load Twitch streams:",
      error
    );


    grid.innerHTML = `
      <div class="streams-empty">

        <h2>
          Could not load Twitch streams.
        </h2>

      </div>
    `;

  }
}


document.addEventListener(
  "DOMContentLoaded",
  loadStreams
);
