const STORAGE_KEY = "kayla-scrapbook-v1";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { albums: [] };
    const data = JSON.parse(raw);
    if (!Array.isArray(data.albums)) data.albums = [];
    return data;
  } catch {
    return { albums: [] };
  }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid(prefix) {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

function getAlbum(data, id) {
  return data.albums.find((a) => a.id === id);
}

function ensurePage(album) {
  if (!album.pages || !album.pages.length) {
    album.pages = [{ id: uid("p"), items: [] }];
  }
  return album.pages[0];
}

const app = document.getElementById("app");

function showShelf() {
  const data = load();
  app.innerHTML =
    '<header class="top">' +
    "<h1>Shelf</h1>" +
    '<button id="new-album" type="button">+ Album</button>' +
    "</header>" +
    '<main id="shelf" class="shelf"></main>';

  const shelf = document.getElementById("shelf");
  if (!data.albums.length) {
    shelf.innerHTML = '<p class="empty">No albums yet. Tap + Album.</p>';
  } else {
    data.albums.forEach((album) => {
      const card = document.createElement("div");
      card.className = "album";
      const pages = album.pages?.length || 0;
      card.innerHTML =
        '<button type="button" class="album-open">' +
        '<div class="album-spine"></div><h2></h2><p></p>' +
        "</button>" +
        '<button type="button" class="album-delete" aria-label="Delete album">X</button>';
      card.querySelector("h2").textContent = album.title;
      card.querySelector("p").textContent =
        pages + " page" + (pages === 1 ? "" : "s");
      card.querySelector(".album-open").addEventListener("click", () => showAlbum(album.id));
      card.querySelector(".album-delete").addEventListener("click", (e) => {
        e.stopPropagation();
        if (!confirm("Delete album " + album.title + "?")) return;
        const data2 = load();
        data2.albums = data2.albums.filter((a) => a.id !== album.id);
        save(data2);
        showShelf();
      });
      shelf.appendChild(card);
    });
  }

  document.getElementById("new-album").addEventListener("click", () => {
    const title = prompt("Album name?", "My Life");
    if (!title) return;
    const data2 = load();
    data2.albums.push({
      id: uid("a"),
      title: title.trim(),
      pages: [{ id: uid("p"), items: [] }],
    });
    save(data2);
    showShelf();
  });
}

function showAlbum(albumId) {
  const data = load();
  const album = getAlbum(data, albumId);
  if (!album) {
    showShelf();
    return;
  }
  const page = ensurePage(album);

  app.innerHTML =
    '<header class="top">' +
    '<button id="back" type="button" class="ghost">Back</button>' +
    "<h1></h1>" +
    '<button id="add-polaroid" type="button">+ Polaroid</button>' +
    "</header>" +
    '<main class="page-wrap"><div id="page" class="page"></div></main>';

  app.querySelector("h1").textContent = album.title;
  document.getElementById("back").addEventListener("click", showShelf);
  document.getElementById("add-polaroid").addEventListener("click", () => {
    const data2 = load();
    const a = getAlbum(data2, albumId);
    const p = ensurePage(a);
    p.items.push({
      id: uid("i"),
      type: "polaroid",
      label: "Photo",
      x: 24 + (p.items.length % 3) * 18,
      y: 30 + (p.items.length % 4) * 16,
      rotation: (p.items.length % 2 === 0 ? -3 : 4),
    });
    save(data2);
    showAlbum(albumId);
  });

  const pageEl = document.getElementById("page");
  page.items.forEach((item) => {
    if (item.type !== "polaroid") return;
    const el = document.createElement("div");
    el.className = "polaroid";
    el.style.left = item.x + "%";
    el.style.top = item.y + "%";
    el.style.transform = "translate(-50%, -50%) rotate(" + item.rotation + "deg)";
    el.innerHTML =
      '<div class="polaroid-photo"></div><div class="polaroid-label"></div>';
    el.querySelector(".polaroid-label").textContent = item.label;
    makeDraggable(el, item, albumId);
    pageEl.appendChild(el);
  });
}

function makeDraggable(el, item, albumId) {
  let dragging = false;

  function onMove(clientX, clientY) {
    const pageEl = document.getElementById("page");
    const rect = pageEl.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    item.x = Math.min(92, Math.max(8, x));
    item.y = Math.min(92, Math.max(8, y));
    el.style.left = item.x + "%";
    el.style.top = item.y + "%";
  }

  function persist() {
    const data = load();
    const album = getAlbum(data, albumId);
    const page = ensurePage(album);
    const target = page.items.find((i) => i.id === item.id);
    if (target) {
      target.x = item.x;
      target.y = item.y;
      save(data);
    }
  }

  el.addEventListener("pointerdown", (e) => {
    dragging = true;
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
  });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    onMove(e.clientX, e.clientY);
  });
  el.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("dragging");
    persist();
  });
}

showShelf();
