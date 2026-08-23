const CLIENT_ID =
  process.env.TWITCH_CLIENT_ID;

const CLIENT_SECRET =
  process.env.TWITCH_CLIENT_SECRET;


async function getAccessToken() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET"
    );
  }

  const body =
    new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials"
    });

  const response =
    await fetch(
      "https://id.twitch.tv/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Could not get Twitch token: ${response.status} ${text}`
    );
  }

  const data =
    await response.json();

  return data.access_token;
}


async function twitchRequest(
  endpoint,
  token
) {
  const response =
    await fetch(
      `https://api.twitch.tv/helix${endpoint}`,
      {
        headers: {
          "Client-Id": CLIENT_ID,
          "Authorization":
            `Bearer ${token}`
        }
      }
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `Twitch API error: ${response.status} ${text}`
    );
  }

  return response.json();
}


async function run() {
  console.log(
    "Starting Twitch API test..."
  );

  const token =
    await getAccessToken();

  console.log(
    "Twitch authentication successful."
  );

  const gameData =
    await twitchRequest(
      "/games?name=" +
      encodeURIComponent(
        "World of Warcraft"
      ),
      token
    );

  const game =
    gameData.data?.[0];

  if (!game) {
    throw new Error(
      "World of Warcraft category not found."
    );
  }

  console.log(
    `World of Warcraft ID: ${game.id}`
  );

  const params =
    new URLSearchParams();

  params.set(
    "game_id",
    game.id
  );

  params.set(
    "language",
    "el"
  );

  params.set(
    "first",
    "100"
  );

  const streamsData =
    await twitchRequest(
      `/streams?${params.toString()}`,
      token
    );

  const streams =
    streamsData.data || [];

  console.log("");
  console.log(
    `Greek WoW streams currently live: ${streams.length}`
  );
  console.log("");

  if (streams.length === 0) {
    console.log(
      "No Greek-language World of Warcraft streams are live right now."
    );

    return;
  }

  streams.forEach(
    (stream, index) => {
      console.log(
        `${index + 1}. ${stream.user_name}`
      );

      console.log(
        `   Viewers: ${stream.viewer_count}`
      );

      console.log(
        `   Title: ${stream.title}`
      );

      console.log(
        `   Language: ${stream.language}`
      );

      console.log("");
    }
  );
}


run().catch(error => {
  console.error("");
  console.error(
    "Twitch test failed:",
    error.message
  );

  process.exit(1);
});
