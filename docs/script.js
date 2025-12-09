fetch("data.json")
  .then(res => res.json())
  .then(items => {
    const gallery = document.getElementById("gallery");

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";

      // Handle missing thumbnail
      const thumbHtml = item.thumbnail
        ? `<img src="${item.thumbnail}" class="thumb" alt="${item.title}">`
        : `<div class="thumb" style="background: #ddd; display: grid; place-items: center; color: #888;">No Image</div>`;

      card.innerHTML = `
        <div class="thumb-container">
            ${thumbHtml}
        </div>
        <div class="card-content">
            <h3>${item.title}</h3>
            <div class="card-meta">
                <span>${item.type.toUpperCase()}</span>
                <span>${item.updated || ''}</span>
            </div>
            <a href="${item.type === 'pdf' ? `viewer.html?file=${encodeURIComponent(item.url)}` : item.url}" class="card-button" target="_blank">開く</a>
        </div>
      `;

      gallery.appendChild(card);
    });
  })
  .catch(err => {
    console.error("Error loading gallery data:", err);
    document.getElementById("gallery").innerHTML = "<p style='text-align:center; width:100%;'>データの読み込みに失敗しました。</p>";
  });
