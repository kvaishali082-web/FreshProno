const db = new Dexie("FreshPronoDB");
db.version(1).stores({ videos: "++id, title, thumb, vidFile" });

let selImg = null, selVid = null, activeId = null;

async function updateStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
        const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(1);
        const percent = ((estimate.usage / estimate.quota) * 100).toFixed(1);
        document.getElementById('storageDetail').innerText = `${usedMB}MB / ${quotaMB}MB Used`;
        document.getElementById('storageFill').style.width = `${percent}%`;
    }
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    document.getElementById('storageBox').style.display = (id === 'homePage') ? 'block' : 'none';
    if(id === 'homePage') { renderFeed(); updateStorageInfo(); }
}

async function saveData() {
    const titleInput = document.getElementById('vTitle');
    const title = titleInput.value;
    const status = document.getElementById('upStatus');
    
    if(!selImg || !selVid || !title) return alert("Pahile sagle details bhara!");
    
    status.style.display = "block";
    status.innerText = "Saving to Vault... 0%";

    try {
        let progress = 0;
        let interval = setInterval(() => {
            progress += 10;
            status.innerText = `Saving to Vault... ${progress}%`;
            if(progress >= 90) clearInterval(interval);
        }, 150);

        await db.videos.add({ title, thumb: selImg, vidFile: selVid });
        
        clearInterval(interval);
        status.innerText = "Upload Complete! 100%";
        status.style.color = "#4CAF50";

        setTimeout(() => {
            // Form Reset Logic
            titleInput.value = "";
            selImg = null; selVid = null;
            document.getElementById('preImg').classList.add('hidden');
            document.getElementById('prePlace').classList.remove('hidden');
            document.getElementById('vidName').innerText = "Select Video File";
            status.style.display = "none";
            status.style.color = "gold";
            
            alert("Success: Video Saved!");
            showPage('homePage');
            location.reload(); 
        }, 600);

    } catch(e) { alert("Error: Storage Full!"); status.style.display = "none"; }
}

async function renderFeed() {
    const grid = document.getElementById('videoGrid');
    const all = await db.videos.toArray();
    grid.innerHTML = all.length ? "" : "<p style='text-align:center; padding:50px; color:#555;'>No Videos in Vault.</p>";
    all.reverse().forEach(v => {
        const card = document.createElement('div');
        card.className = "v-card";
        card.onclick = () => openPlayer(v);
        card.innerHTML = `<img class="v-thumb" src="${URL.createObjectURL(v.thumb)}"><div class="v-info"><h3>${v.title}</h3></div>`;
        grid.appendChild(card);
    });
}

async function openPlayer(v) {
    activeId = v.id;
    showPage('playerPage');
    const p = document.getElementById('vPlayer');
    p.src = URL.createObjectURL(v.vidFile);
    p.play();
    document.getElementById('pTitle').innerText = v.title;
    renderSuggestions();
    window.scrollTo(0,0);
}

async function renderSuggestions() {
    const list = document.getElementById('nextList');
    const all = await db.videos.toArray();
    const other = all.filter(v => v.id !== activeId);
    list.innerHTML = "";
    other.reverse().forEach(v => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.onclick = () => openPlayer(v);
        item.innerHTML = `<img src="${URL.createObjectURL(v.thumb)}" class="suggestion-thumb"><div class="suggestion-meta"><h4>${v.title}</h4></div>`;
        list.appendChild(item);
    });
}

window.delVideo = async () => {
    if(confirm("Delete this video?")) {
        await db.videos.delete(activeId);
        URL.revokeObjectURL(document.getElementById('vPlayer').src);
        await updateStorageInfo();
        location.reload();
    }
};

window.seek = (s) => document.getElementById('vPlayer').currentTime += s;
window.closePlayer = () => { document.getElementById('vPlayer').pause(); showPage('homePage'); };
window.toggleFullScreen = () => {
    const v = document.getElementById('vPlayer');
    if (v.requestFullscreen) v.requestFullscreen();
    else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
};

document.getElementById('inImg').onchange = (e) => {
    selImg = e.target.files[0];
    document.getElementById('preImg').src = URL.createObjectURL(selImg);
    document.getElementById('preImg').classList.remove('hidden');
    document.getElementById('prePlace').classList.add('hidden');
};
document.getElementById('inVid').onchange = (e) => {
    selVid = e.target.files[0];
    document.getElementById('vidName').innerText = selVid.name;
};

window.onload = () => { renderFeed(); updateStorageInfo(); };