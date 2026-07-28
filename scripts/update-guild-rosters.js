async function getGuildMembers(token, guildId) {
  const query = `
    query GuildMembers(
      $guildId: Int!,
      $page: Int!,
      $limit: Int!
    ) {
      guildData {
        guild(id: $guildId) {
          members(
            page: $page,
            limit: $limit
          ) {
            data {
              id
              name
              server {
                slug
              }
            }
            has_more_pages
          }
        }
      }
    }
  `;

  const guildMembers = new Set();

  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const data = await queryWarcraftLogs(
      token,
      query,
      {
        guildId,
        page,
        limit: MEMBERS_PER_PAGE
      }
    );

    const members =
      data.guildData?.guild?.members;

    if (!members) {
      throw new Error(
        `No guild-member data returned for guild ID ${guildId}`
      );
    }

    for (const character of members.data || []) {
      if (!character?.name) {
        continue;
      }

      guildMembers.add(
        makePlayerKey(
          character.name,
          character.server?.slug || ""
        )
      );
    }

    hasMorePages =
      members.has_more_pages === true;

    page += 1;

    if (page > 50) {
      throw new Error(
        `Guild-member pagination exceeded 50 pages for guild ${guildId}`
      );
    }
  }

  return guildMembers;
}
