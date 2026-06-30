fetch("./data/news.json")
  .then(response => response.json())
  .then(posts => {
    const container = document.getElementById("newsContainer");

    container.innerHTML = "";

    posts.forEach(post => {
      const card = document.createElement("article");
      card.className = "news-card";

      card.innerHTML = `
        <div class="news-type">${post.type}</div>

        <h2>${post.title}</h2>

        <div class="news-date">${post.date}</div>

        <p>${post.body}</p>

        ${
          post.link
            ? `<a class="news-link" href="${post.link}">View Guild →</a>`
            : ""
        }
      `;

      container.appendChild(card);
    });
  })
  .catch(error => {
    console.error("News could not be loaded:", error);

    document.getElementById("newsContainer").innerHTML = `
      <p>News could not be loaded.</p>
    `;
  });
