const STORAGE_KEY = "kayla-scrapbook-v1";
const MAX_PHOTO = 900;
const BACKGROUNDS = [
  { id: "paper", label: "Paper" },
  { id: "grid", label: "Grid" },
  { id: "dots", label: "Dots" },
  { id: "lined", label: "Lined" },
  { id: "blush", label: "Blush" },
  { id: "sage", label: "Sage" },
  { id: "sky", label: "Sky" },
  { id: "night", label: "Night" },
];

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

function ensurePages(album) {
  if (!Array.isArray(album.pages) || !album.pages.length) {
    album.pages = [newPage()];
  }
  album.pages.forEach((p) => {
    if (!Array.isArray(p.items)) p.items = [];
    if (!p.bg) p.bg = "paper";
  });
  return album.pages;
}

function newPage() {
  return { id: uid("p"), bg: "paper", items: [] };
}

function updateItem(albumId, pageId, itemId, patch) {
  const data = load();
  const album = getAlbum(data, albumId);
  if (!album) return;
  const page = ensurePages(album).find((p) => p.id === pageId);
  if (!page) return;
  const item = page.items.find((i) => i.id === itemId);
  if (!item) return;
  Object.assign(item, patch);
  save(data);
}

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_PHOTO / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("bad photo"));
    };
    img.src = url;
  });
}

function pickPhoto(onDone) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      onDone(await readPhoto(file));
    } catch {
      alert("Could not use that photo.");
    }
  };
  input.click();
}

const app = document.getElementById("app");
const viewState = { pageIndex: 0 };

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
      const pages = ensurePages(album).length;
      card.innerHTML =
        '<button type="button" class="album-open">' +
        '<div class="album-spine"></div><h2></h2><p></p>' +
        "</button>" +
        '<button type="button" class="album-delete" aria-label="Delete album">X</button>';
      card.querySelector("h2").textContent = album.title;
      card.querySelector("p").textContent =
        pages + " page" + (pages === 1 ? "" : "s");
      card.querySelector(".album-open").addEventListener("click", () => {
        viewState.pageIndex = 0;
        showAlbum(album.id);
      });
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
      pages: [newPage()],
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
  const pages = ensurePages(album);
  if (viewState.pageIndex >= pages.length) viewState.pageIndex = pages.length - 1;
  if (viewState.pageIndex < 0) viewState.pageIndex = 0;
  const page = pages[viewState.pageIndex];

  app.innerHTML =
    '<header class="top">' +
    '<button id="back" type="button" class="ghost">Back</button>' +
    "<h1></h1>" +
    '<button id="add-polaroid" type="button">+ Polaroid</button>' +
    "</header>" +
    '<div class="toolbar">' +
    '<button id="prev-page" type="button" class="ghost">Prev</button>' +
    '<span id="page-label"></span>' +
    '<button id="next-page" type="button" class="ghost">Next</button>' +
    '<button id="add-page" type="button" class="ghost">+ Page</button>' +
    '<button id="del-page" type="button" class="ghost danger">Del page</button>' +
    '<button id="bg-page" type="button" class="ghost">Background</button>' +
    "</div>" +
    '<main class="page-wrap"><div id="page" class="page"></div></main>' +
    '<p class="hint">Tap photo to add/replace. Tap label to rename. X deletes polaroid.</p>';

  app.querySelector("h1").textContent = album.title;
  document.getElementById("page-label").textContent =
    viewState.pageIndex + 1 + " / " + pages.length;

  document.getElementById("back").addEventListener("click", showShelf);

  document.getElementById("prev-page").addEventListener("click", () => {
    if (viewState.pageIndex <= 0) return;
    viewState.pageIndex -= 1;
    showAlbum(albumId);
  });
  document.getElementById("next-page").addEventListener("click", () => {
    if (viewState.pageIndex >= pages.length - 1) return;
    viewState.pageIndex += 1;
    showAlbum(albumId);
  });

  document.getElementById("add-page").addEventListener("click", () => {
    const data2 = load();
    const a = getAlbum(data2, albumId);
    ensurePages(a).push(newPage());
    save(data2);
    viewState.pageIndex = a.pages.length - 1;
    showAlbum(albumId);
  });

  document.getElementById("del-page").addEventListener("click", () => {
    const data2 = load();
    const a = getAlbum(data2, albumId);
    const list = ensurePages(a);
    if (list.length <= 1) {
      alert("Need at least one page.");
      return;
    }
    if (!confirm("Delete this page?")) return;
    list.splice(viewState.pageIndex, 1);
    save(data2);
    if (viewState.pageIndex >= list.length) viewState.pageIndex = list.length - 1;
    showAlbum(albumId);
  });

  document.getElementById("bg-page").addEventListener("click", () => {
    const names = BACKGROUNDS.map((b, i) => i + 1 + ") " + b.label).join("\n");
    const pick = prompt("Background:\n" + names, "1");
    if (pick === null) return;
    const idx = parseInt(pick, 10) - 1;
    if (!BACKGROUNDS[idx]) return;
    const data2 = load();
    const a = getAlbum(data2, albumId);
    const p = ensurePages(a)[viewState.pageIndex];
    p.bg = BACKGROUNDS[idx].id;
    save(data2);
    showAlbum(albumId);
  });

  document.getElementById("add-polaroid").addEventListener("click", () => {
    const data2 = load();
    const a = getAlbum(data2, albumId);
    const p = ensurePages(a)[viewState.pageIndex];
    p.items.push({
      id: uid("i"),
      type: "polaroid",
      label: "Photo",
      src: "",
      x: 24 + (p.items.length % 3) * 18,
      y: 30 + (p.items.length % 4) * 16,
      rotation: p.items.length % 2 === 0 ? -3 : 4,
    });
    save(data2);
    showAlbum(albumId);
  });

  const pageEl = document.getElementById("page");
  pageEl.className = "page bg-" + (page.bg || "paper");

  page.items.forEach((item) => {
    if (item.type !== "polaroid") return;
    const el = document.createElement("div");
    el.className = "polaroid";
    el.style.left = item.x + "%";
    el.style.top = item.y + "%";
    el.style.transform =
      "translate(-50%, -50%) rotate(" + (item.rotation || 0) + "deg)";
    el.innerHTML =
      '<button type="button" class="item-delete" aria-label="Delete">X</button>' +
      '<div class="polaroid-photo"></div><div class="polaroid-label"></div>';

    const photo = el.querySelector(".polaroid-photo");
    if (item.src) {
      photo.style.backgroundImage = 'url("' + item.src.replace(/"/g, '\\"') + '")';
      photo.classList.add("has-photo");
    }
    el.querySelector(".polaroid-label").textContent = item.label || "Photo";

    let dragMoved = false;
    makeDraggable(el, item, albumId, page.id, () => {
      dragMoved = true;
    });

    photo.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dragMoved) {
        dragMoved = false;
        return;
      }
      pickPhoto((src) => {
        updateItem(albumId, page.id, item.id, { src: src });
        showAlbum(albumId);
      });
    });

    el.querySelector(".polaroid-label").addEventListener("click", (e) => {
      e.stopPropagation();
      const next = prompt("Label", item.label || "Photo");
      if (next === null) return;
      updateItem(albumId, page.id, item.id, { label: next.trim() || "Photo" });
      showAlbum(albumId);
    });

    el.querySelector(".item-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      if (!confirm("Delete this polaroid?")) return;
      const data2 = load();
      const a = getAlbum(data2, albumId);
      const p = ensurePages(a).find((pg) => pg.id === page.id);
      if (!p) return;
      p.items = p.items.filter((i) => i.id !== item.id);
      save(data2);
      showAlbum(albumId);
    });

    pageEl.appendChild(el);
  });
}

function makeDraggable(el, item, albumId, pageId, onMoved) {
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startY = 0;

  function onMove(clientX, clientY) {
    const pageEl = document.getElementById("page");
    const rect = pageEl.getBoundingClientRect();
    item.x = Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100));
    item.y = Math.min(92, Math.max(8, ((clientY - rect.top) / rect.height) * 100));
    el.style.left = item.x + "%";
    el.style.top = item.y + "%";
  }

  function persist() {
    updateItem(albumId, pageId, item.id, { x: item.x, y: item.y });
  }

  el.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".item-delete")) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    el.setPointerCapture(e.pointerId);
    el.classList.add("dragging");
  });

  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) > 8) {
      moved = true;
      if (onMoved) onMoved();
    }
    onMove(e.clientX, e.clientY);
  });

  el.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove("dragging");
    if (moved) persist();
  });
}

showShelf();
