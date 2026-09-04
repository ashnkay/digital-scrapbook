const STORAGE_KEY = "kayla-scrapbook-v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { albums: [] };
    const data = JSON.parse(raw);
    if (!data.albums) data.albums = [];
    return data;
  } catch {
    return { albums: [] };
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return "a_" + Math.random().toString(36).slice(2, 10);
}

function renderShelf() {
  const shelf = document.getElementById("shelf");
  const data = load();
  shelf.innerHTML = "";

  if (!data.albums.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No albums yet. Tap + Album.";
    shelf.appendChild(empty);
    return;
  }

  data.albums.forEach((album) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "album";
    btn.innerHTML =
      '<div class="album-spine"></div>' +
      "<h2></h2>" +
      "<p></p>";
    btn.querySelector("h2").textContent = album.title;
    btn.querySelector("p").textContent =
      (album.pages?.length || 0) + " page" + ((album.pages?.length || 0) === 1 ? "" : "s");
    btn.addEventListener("click", () => {
      alert("Album view next. Holding: " + album.title);
    });
    shelf.appendChild(btn);
  });
}

document.getElementById("new-album").addEventListener("click", () => {
  const title = prompt("Album name?", "My Life");
  if (!title) return;
  const data = load();
  data.albums.push({
    id: uid(),
    title: title.trim(),
    pages: [{ id: uid(), items: [] }],
  });
  save(data);
  renderShelf();
});

renderShelf();
