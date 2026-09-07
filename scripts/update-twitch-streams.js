const fs = require("fs");

const CLIENT_ID =
  process.env.TWITCH_CLIENT_ID;

const CLIENT_SECRET =
  process.env.TWITCH_CLIENT_SECRET;

const OUTPUT_FILE =
  "data/twitch-streams.json";

/*
 * Official Twitch language code for Greek.
 */
const LANGUAGE = "el";

/*
 * Tags that we also consider Greek.
 *
 * Matching is case-insensitive and accents
 * are normalized, so these will match:
 *
 * Greek
 * greek
 * GREEK
 * Ελληνικά
 * Ελληνικα
 * ΕΛΛΗΝΙΚΑ
 */
const GREEK_TAGS = [
  "greek",
  "ελληνικα"
];


/*
 * Normalize text for tag comparison.
 *
 * Examples:
 *
 * "Greek"     -> "greek"
 * "GREEK"     -> "greek"
 * "Ελληνικά"  -> "ελληνικα"
 * "Ελληνικα"  -> "ελληνικα"
 */
function normalizeTag(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}


/*
 * Decide whether a Twitch stream should
 * be considered Greek.
 *
 * A stream is Greek if:
 *
 * 1. Twitch reports language = "el"
 *
 * OR
 *
 * 2. It has a Greek-related tag.
 */
function isGreekStream(stream) {
  /*
   * First check Twitch's official
   * broadcast-language field.
   */
  if (
    String(stream.language || "")
      .toLowerCase() === LANGUAGE
  ) {
    return true;
  }


  /*
   * Then check Twitch tags.
   */
  const tags =
    Array.isArray(stream.tags)
      ? stream.tags
      : [];


  return tags.some(tag => {
    const normalized =
      normalizeTag(tag);

    return GREEK_TAGS.includes(
      normalized
    );
  });
}


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


/*
 * Fetch ALL live World of Warcraft streams.
 *
 * Previously we requested:
 *
 * language=el
 *
 * directly from Twitch.
 *
 * That meant Twitch completely excluded
 * streams whose broadcast language metadata
 * was not "el", even if they had a Greek tag.
 *
 * We now fetch WoW streams first and perform
 * the Greek detection ourselves.
 */
async function getAllWoWStreams(
  token,
  gameId
) {
  const allStreams = [];

  let cursor = "";
  let page = 1;


  while (true) {
    const params =
      new URLSearchParams();

    params.set(
      "game_id",
      gameId
    );

    params.set(
      "first",
      "100"
    );


    if (cursor) {
      params.set(
        "after",
        cursor
      );
    }


    console.log(
      `Fetching WoW streams page ${page}...`
    );


    const data =
      await twitchRequest(
        `/streams?${params.toString()}`,
        token
      );


    const streams =
      data.data || [];


    allStreams.push(
      ...streams
    );


    console.log(
      `Page ${page}: ${streams.length} streams`
    );


    /*
     * Twitch provides a cursor when another
     * page of results exists.
     */
    cursor =
      data.pagination?.cursor || "";


    if (!cursor || streams.length === 0) {
      break;
    }


    page += 1;
  }


  console.log(
    `Found ${allStreams.length} total live WoW streams`
  );


  return allStreams;
}


/*
 * Find Greek WoW streams using both:
 *
 * Twitch broadcast language
 *
 * AND
 *
 * Twitch stream tags.
 */
async function getGreekWoWStreams(
  token,
  gameId
) {
  const allStreams =
    await getAllWoWStreams(
      token,
      gameId
    );


  const greekStreams =
    allStreams.filter(
      stream =>
        isGreekStream(stream)
    );


  console.log(
    `Found ${greekStreams.length} Greek WoW streams`
  );


  /*
   * Helpful GitHub Actions debugging.
   *
   * This lets us see exactly WHY each
   * detected stream was accepted.
   */
  for (const stream of greekStreams) {
    console.log(
      `${stream.user_name}: ` +
      `language=${stream.language || "-"}, ` +
      `tags=${JSON.stringify(stream.tags || [])}`
    );
  }


  return greekStreams;
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
   * Twitch normally returns streams ordered
   * by viewer count, but sort again so our
   * JSON remains deterministic.
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

      tags:
        Array.isArray(stream.tags)
          ? stream.tags
          : [],

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

        /*
         * We now use both Twitch language
         * and Greek tags.
         */
        language:
          LANGUAGE,

        detection:
          "language-or-greek-tag",

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
