const fs = require("fs");

const CLIENT_ID =
  process.env.TWITCH_CLIENT_ID;

const CLIENT_SECRET =
  process.env.TWITCH_CLIENT_SECRET;

const OUTPUT_FILE =
  "data/twitch-streams.json";

/*
 * Twitch language code for Greek.
 */
const LANGUAGE = "el";

/*
 * World of Warcraft.
 *
 * We look this up automatically instead
 * of hard-coding the game ID.
 */


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
    throw new Error(
      `Could not get Twitch token: ${response.status}`
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
      `Twitch API error ${response.status}: ${text}`
    );
  }

  return response.json();
}


async function getWorldOfWarcraftId(
  token
) {
  const data =
    await twitchRequest(
      "/games?name=" +
      encodeURIComponent(
        "World of Warcraft"
      ),
      token
    );

  const game =
    data.data?.[0];

  if (!game) {
    throw new Error(
      "World of Warcraft category not found"
    );
  }

  console.log(
    `World of Warcraft game ID: ${game.id}`
  );

  return game.id;
}


async function getGreekWoWStreams(
  token,
  gameId
) {
  const params =
    new URLSearchParams();

  params.set(
    "game_id",
    gameId
  );

  params.set(
    "language",
    LANGUAGE
  );

  params.set(
    "first",
    "100"
  );

  const data =
    await twitchRequest(
      `/streams?${params.toString()}`,
      token
    );

  return data.data || [];
}


async function run() {
  console.log(
    "Updating Greek WoW Twitch streams..."
  );

  const token =
    await getAccessToken();

  const gameId =
    await getWorldOfWarcraftId(
      token
    );

  const streams =
    await getGreekWoWStreams(
      token,
      gameId
    );

  /*
   * Twitch already normally returns streams
   * ordered by viewer count, but sorting again
   * keeps our JSON deterministic.
   */
  streams.sort(
    (a, b) =>
      Number(b.viewer_count || 0) -
      Number(a.viewer_count || 0)
  );

  const output =
    streams.map(stream => ({
      id:
        stream.id,

      userId:
        stream.user_id,

      userLogin:
        stream.user_login,

      userName:
        stream.user_name,

      gameId:
        stream.game_id,

      gameName:
        stream.game_name,

      title:
        stream.title,

      viewerCount:
        stream.viewer_count,

      startedAt:
        stream.started_at,

      language:
        stream.language,

      thumbnailUrl:
        String(
          stream.thumbnail_url || ""
        )
          .replace(
            "{width}",
            "640"
          )
          .replace(
            "{height}",
            "360"
          ),

      twitchUrl:
        `https://www.twitch.tv/${stream.user_login}`
    }));

  fs.mkdirSync(
    "data",
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(
      {
        updatedAt:
          new Date().toISOString(),

        game:
          "World of Warcraft",

        language:
          LANGUAGE,

        streams:
          output
      },
      null,
      2
    ) + "\n"
  );

  console.log(
    `Saved ${output.length} live streams to ${OUTPUT_FILE}`
  );
}


run().catch(error => {
  console.error(
    "Twitch updater failed:",
    error
  );

  process.exit(1);
});
