// DOM elemanları
const mediaListEl = document.getElementById("mediaList");
const detailPanelEl = document.getElementById("detailPanel");

const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const genreFilter = document.getElementById("genreFilter");
const yearFilter = document.getElementById("yearFilter");

const allMediaBtn = document.getElementById("allMediaBtn");
const favoritesBtn = document.getElementById("favoritesBtn");

// Veri tutacak değişkenler
let allMedia = [];
let favorites = [];
let showFavorites = false;

// Kullanıcının verdiği 5 üzerinden puanlar (localStorage'da tutulacak)
let userRatings = {}; // { "1": 4, "2": 5, ... }
let comments = {}; // { "1": [ { text: "...", date: "..." } ] }

// SAYFA AÇILDIĞINDA ÇALIŞAN KISIM
loadFavoritesFromStorage();
loadUserRatingsFromStorage();
loadCommentsFromStorage();
loadMedia();
attachEventListeners();

// ------------------ VERİ YÜKLEME ------------------ //
async function loadMedia() {
  try {
    // data.json aynı klasörde
    const response = await fetch("data.json");
    const data = await response.json();
    allMedia = data;
    renderMediaList();
  } catch (err) {
    console.error("Veri yüklenemedi:", err);
    mediaListEl.innerHTML = "<p>Veriler yüklenemedi.</p>";
  }
}

// ------------------ EVENTLER ------------------ //
function attachEventListeners() {
  searchInput.addEventListener("input", renderMediaList);
  typeFilter.addEventListener("change", renderMediaList);
  genreFilter.addEventListener("change", renderMediaList);
  yearFilter.addEventListener("change", renderMediaList);

  allMediaBtn.addEventListener("click", () => {
    showFavorites = false;
    renderMediaList();
  });

  favoritesBtn.addEventListener("click", () => {
    showFavorites = true;
    renderMediaList();
  });
}

// ------------------ FİLTRE ------------------ //
function getFilteredMedia() {
  const searchText = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const selectedGenre = genreFilter.value;
  const selectedYear = yearFilter.value;

  let list = showFavorites
    ? allMedia.filter(item => favorites.includes(item.id))
    : allMedia;

  return list.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchText);
    const matchesType =
      selectedType === "all" ? true : item.type === selectedType;
    const matchesGenre =
      selectedGenre === "all" ? true : item.genre === selectedGenre;

    let matchesYear = true;
    if (selectedYear === "2000plus") {
      matchesYear = item.year >= 2000;
    } else if (selectedYear === "1900_2000") {
      matchesYear = item.year >= 1900 && item.year < 2000;
    } else if (selectedYear === "before1900") {
      matchesYear = item.year < 1900;
    }

    return matchesSearch && matchesType && matchesGenre && matchesYear;
  });
}

// IMDb puanını 1 ondalık göster (8.8 gibi)
function formatImdb(rating) {
  if (typeof rating === "number") {
    return rating.toFixed(1);
  }
  return rating;
}

// 5 yıldız HTML'i oluştur
function getStarsHtml(id, currentRating) {
  let html = `<div class="stars" data-id="${id}">`;
  for (let i = 1; i <= 5; i++) {
    const filledClass = i <= currentRating ? "filled" : "";
    html += `<span class="star ${filledClass}" data-value="${i}">&#9733;</span>`;
  }
  html += "</div>";
  return html;
}

// ------------------ LİSTEYİ BAS ------------------ //
function renderMediaList() {
  const list = getFilteredMedia();

  if (!list || list.length === 0) {
    mediaListEl.innerHTML = "<p>Sonuç bulunamadı.</p>";
    return;
  }

  mediaListEl.innerHTML = "";

  list.forEach(item => {
    const card = document.createElement("article");
    card.className = "media-card";

    const imdbScore = formatImdb(item.rating);
    const currentUserRating = userRatings[item.id] || 0;
    const showStars = item.type === "film" || item.type === "dizi";

    card.innerHTML = `
      <img src="${item.poster}" alt="${item.title}" />
      <div class="media-card-content">
        <h3>${item.title}</h3>
        <p>${item.year} • ${item.genre}</p>
        <p class="imdb">IMDb: ${imdbScore}/10</p>
        ${
          showStars
            ? `
        <div class="user-rating">
          <span class="user-rating-label">Senin puanın:</span>
          ${getStarsHtml(item.id, currentUserRating)}
        </div>
        `
            : ""
        }
        <button class="fav-btn">
          ${favorites.includes(item.id) ? "Favoriden Çıkar" : "Favoriye Ekle"}
        </button>
      </div>
    `;

    // Kartın boş alanına tıklayınca detay göster
    card.addEventListener("click", e => {
      // butona ya da yıldıza tıklıyorsa detay açma
      if (
        e.target.classList.contains("fav-btn") ||
        e.target.classList.contains("star")
      ) {
        return;
      }
      showDetail(item);
    });

    // Favori butonu
    const favBtn = card.querySelector(".fav-btn");
    favBtn.addEventListener("click", e => {
      e.stopPropagation();
      toggleFavorite(item.id);
      renderMediaList();
    });

    // Yıldızlara tıklama (sadece film/dizi için)
    if (showStars) {
      const starsContainer = card.querySelector(".stars");
      starsContainer.addEventListener("click", e => {
        if (!e.target.classList.contains("star")) return;

        e.stopPropagation(); // kart tıklamasını engelle

        const value = Number(e.target.getAttribute("data-value"));
        const mediaId = Number(starsContainer.getAttribute("data-id"));

        userRatings[mediaId] = value;
        saveUserRatingsToStorage();
        renderMediaList(); // yıldızları güncelle
      });
    }

    mediaListEl.appendChild(card);
  });
}

// ------------------ DETAY PANELİ ------------------ //
function showDetail(item) {
  const imdbScore = formatImdb(item.rating);

  const itemComments = comments[item.id] || [];

  detailPanelEl.innerHTML = `
    <div class="detail-image-container">
      <img class="detail-image" src="${item.poster}" alt="${item.title}">
    </div>

    <h2>${item.title}</h2>

    <p><strong>Tür:</strong> ${item.type}</p>
    <p><strong>Yıl:</strong> ${item.year}</p>
    <p><strong>Kategori:</strong> ${item.genre}</p>
    <p><strong>IMDb:</strong> ${imdbScore}/10</p>
    <p><strong>Oyuncular / Yazar:</strong> ${item.cast}</p>
    <p><strong>Açıklama:</strong> ${item.description}</p>

    <hr style="margin: 1rem 0; opacity: 0.4;">

    <h3>Yorumlar</h3>
    <div class="comments-list">
      ${
        itemComments.length === 0
          ? "<p>Henüz yorum yok. İlk yorumu sen yap!</p>"
          : itemComments
              .map(
                c => `
          <div class="comment-box">
            <p class="comment-text">${c.text}</p>
            <span class="comment-date">${c.date}</span>
          </div>`
              )
              .join("")
      }
    </div>

    <div class="comment-add">
      <textarea id="commentInput" placeholder="Yorum yaz..." rows="3"></textarea>
      <button id="addCommentBtn">Yorumu Gönder</button>
    </div>
  `;

  // Yorum gönderme butonu
  const addCommentBtn = document.getElementById("addCommentBtn");
  const commentInput = document.getElementById("commentInput");

  addCommentBtn.addEventListener("click", () => {
    const text = commentInput.value.trim();
    if (!text) return;

    const now = new Date();
    const dateString = now.toLocaleString("tr-TR");

    if (!comments[item.id]) comments[item.id] = [];

    comments[item.id].push({
      text,
      date: dateString
    });

    saveCommentsToStorage();
    showDetail(item); // tekrar yükle yorum görünsün
  });
}

// ------------------ FAVORİLER ------------------ //
function toggleFavorite(id) {
  if (favorites.includes(id)) {
    favorites = favorites.filter(favId => favId !== id);
  } else {
    favorites.push(id);
  }
  saveFavoritesToStorage();
}

function saveFavoritesToStorage() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function loadFavoritesFromStorage() {
  const stored = localStorage.getItem("favorites");
  favorites = stored ? JSON.parse(stored) : [];
}

// ------------------ KULLANICI YILDIZLARI ------------------ //
function saveUserRatingsToStorage() {
  localStorage.setItem("userRatings", JSON.stringify(userRatings));
}

function loadUserRatingsFromStorage() {
  const stored = localStorage.getItem("userRatings");
  userRatings = stored ? JSON.parse(stored) : {};
}
// ------------------ YORUMLAR ------------------ //
function saveCommentsToStorage() {
  localStorage.setItem("comments", JSON.stringify(comments));
}

function loadCommentsFromStorage() {
  const stored = localStorage.getItem("comments");
  comments = stored ? JSON.parse(stored) : {};
}

