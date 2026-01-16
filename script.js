const db = new Dexie("FreshPronoDB");
db.version(2).stores({ videos: "++id, title, thumb, vidFile, duration" });

window.onload = () => { 
    renderFeed(); 
    updateStorageInfo();
    setTimeout(() => { document.getElementById('splashScreen').style.display = 'none'; }, 1500);
};

async function renderFeed() {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = '';
    const all = await db.videos.toArray();
    all.reverse().forEach(v => {
        const card = document.createElement('div');
        card.className = "v-card";
        card.onclick = () => openPlayer(v);
        card.innerHTML = `<img src="${URL.createObjectURL(v.thumb)}" class="v-thumb"><div style="padding:10px;"><h3 style="margin:0; font-size:16px;">${v.title}</h3></div>`;
        grid.appendChild(card);
    });
}

function openPlayer(v) {
    document.getElementById('homePage').classList.add('hidden');
    document.getElementById('playerPage').classList.remove('hidden');
    const p = document.getElementById('vPlayer');
    p.src = URL.createObjectURL(v.vidFile);
    document.getElementById('pTitle').innerText = v.title;
    renderSuggestions(v.id);
    p.play();
}

async function renderSuggestions(currentId) {
    const sGrid = document.getElementById('suggestionGrid');
    sGrid.innerHTML = '';
    const all = await db.videos.toArray();
    const suggestions = all.filter(vid => vid.id !== currentId).reverse();
    suggestions.forEach(v => {
        const sCard = document.createElement('div');
        sCard.className = "s-card";
        sCard.onclick = () => { openPlayer(v); window.scrollTo(0,0); };
        sCard.innerHTML = `<div class="s-thumb-box"><img src="${URL.createObjectURL(v.thumb)}" class="s-thumb-img"><span class="s-duration">${v.duration}</span></div><div class="s-details"><h4 class="s-v-title">${v.title}</h4></div>`;
        sGrid.appendChild(sCard);
    });
}

function closePlayer() {
    document.getElementById('vPlayer').pause();
    showPage('homePage');
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

async function updateStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const used = (est.usage / (1024 * 1024)).toFixed(1);
        document.getElementById('storageDetail').innerText = `${used}MB Used`;
        document.getElementById('storageFill').style.width = `${((est.usage / est.quota) * 100).toFixed(1)}%`;
    }
}
