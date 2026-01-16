const db = new Dexie("FreshPronoDB");
db.version(2).stores({ videos: "++id, title, thumb, vidFile, duration" });
let selVid = null, selImg = null, activeId = null, currentDuration = "0:00";

window.onload = () => {
    renderFeed();
    updateStorageInfo();
    setTimeout(() => { document.getElementById('loadingLine').style.width = '100%'; }, 100);
    setTimeout(() => { document.getElementById('splashScreen').style.display = 'none'; }, 2000);
};

async function updateStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const used = (est.usage / (1024 * 1024)).toFixed(1);
        document.getElementById('storageDetail').innerText = `${used}MB Used`;
        document.getElementById('storageFill').style.width = `${((est.usage / est.quota) * 100).toFixed(1)}%`;
    }
}

function showPage(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function resetUploadForm() {
    selVid = null; selImg = null;
    document.getElementById('vTitle').value = "";
    document.getElementById('inVid').value = "";
    document.getElementById('vidPreview').src = "";
    document.getElementById('prePlace').classList.remove('hidden');
    document.getElementById('thumbOverlay').classList.add('hidden');
    document.getElementById('frameRange').value = 0;
    document.getElementById('setThumbBtn').innerText = "Set Current Frame";
    document.getElementById('setThumbBtn').style.background = "#FFD700";
}

document.getElementById('inVid').onchange = (e) => {
    selVid = e.target.files[0];
    if(!selVid) return;
    const vPrev = document.getElementById('vidPreview');
    vPrev.src = URL.createObjectURL(selVid);
    vPrev.onloadedmetadata = () => {
        document.getElementById('frameRange').max = vPrev.duration;
        const mins = Math.floor(vPrev.duration / 60);
        const secs = Math.floor(vPrev.duration % 60);
        currentDuration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };
    document.getElementById('prePlace').classList.add('hidden');
};

document.getElementById('frameRange').oninput = (e) => {
    document.getElementById('vidPreview').currentTime = e.target.value;
};

function captureThumb() {
    const vPrev = document.getElementById('vidPreview');
    const canvas = document.getElementById('thumbCanvas');
    canvas.width = vPrev.videoWidth; canvas.height = vPrev.videoHeight;
    canvas.getContext('2d').drawImage(vPrev, 0, 0);
    canvas.toBlob((blob) => {
        selImg = blob;
        document.getElementById('thumbOverlay').classList.remove('hidden');
        document.getElementById('setThumbBtn').innerText = "Cover Set! ✅";
        document.getElementById('setThumbBtn').style.background = "#4CAF50";
    }, 'image/jpeg');
}

async function saveData() {
    const title = document.getElementById('vTitle').value;
    if(!selVid || !title || !selImg) return alert("Pahile Video ani Cover nivada!");
    document.getElementById('uploadStatusOverlay').classList.remove('hidden');
    document.getElementById('uploadLine').style.width = "100%";
    await db.videos.add({ title, thumb: selImg, vidFile: selVid, duration: currentDuration });
    setTimeout(() => {
        document.getElementById('uploadStatusOverlay').classList.add('hidden');
        resetUploadForm();
        showPage('homePage');
        renderFeed();
        updateStorageInfo();
    }, 1500);
}

async function renderFeed() {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = '';
    const all = await db.videos.toArray();
    all.reverse().forEach(v => {
        const card = document.createElement('div');
        card.style.marginBottom = "15px";
        card.onclick = () => openPlayer(v);
        card.innerHTML = `<div style="position:relative"><img src="${URL.createObjectURL(v.thumb)}" style="width:100%; aspect-ratio:16/9; object-fit:cover"><span style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.8);padding:2px 5px;font-size:12px;border-radius:4px">${v.duration}</span></div><h3 style="padding:10px; margin:0; font-size:15px;">${v.title}</h3>`;
        grid.appendChild(card);
    });
}

function openPlayer(v) {
    activeId = v.id;
    showPage('playerPage');
    const p = document.getElementById('vPlayer');
    p.src = URL.createObjectURL(v.vidFile);
    document.getElementById('pTitle').innerText = v.title;
    p.play();
}

window.closePlayer = () => { document.getElementById('vPlayer').pause(); showPage('homePage'); };
window.delVideo = async () => { if(confirm("Delete this video?")) { await db.videos.delete(activeId); showPage('homePage'); renderFeed(); updateStorageInfo(); } };
window.saveToGallery = async () => {
    const v = await db.videos.get(activeId);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(v.vidFile);
    a.download = v.title + ".mp4"; a.click();
};
// Video Player Open Karnyasathi
function openPlayer(v) {
    activeId = v.id;
    showPage('playerPage');
    
    const p = document.getElementById('vPlayer');
    p.src = URL.createObjectURL(v.vidFile);
    document.getElementById('pTitle').innerText = v.title;
    
    p.play(); // Video auto-play hoil
    
    // 🔴 Suggestions Render Karnyasathi Ha Call Important Aahe
    renderSuggestions(v.id);
}

// Suggestions Render Karnyasathi Function
async function renderSuggestions(currentId) {
    const sGrid = document.getElementById('suggestionGrid');
    if (!sGrid) return; 

    sGrid.innerHTML = '<h3 style="padding:10px 15px; margin:0; font-size:16px; border-top:1px solid #222;">Up Next</h3>';
    
    const all = await db.videos.toArray();
    
    // Jo video chalu aahe to sodun baki sagle dakhva
    const suggestions = all.filter(vid => vid.id !== currentId).reverse();

    if (suggestions.length === 0) {
        sGrid.innerHTML += '<p style="padding:15px; color:#aaa; font-size:13px;">No more videos in vault.</p>';
        return;
    }

    suggestions.forEach(v => {
        const sCard = document.createElement('div');
        sCard.className = "s-card";
        sCard.style.cssText = "display: flex; gap: 10px; padding: 10px; border-bottom: 1px solid #111; align-items: center;";
        
        sCard.onclick = () => { 
            document.getElementById('vPlayer').pause(); 
            openPlayer(v); // Navin video play kar
        };

        sCard.innerHTML = `
            <img src="${URL.createObjectURL(v.thumb)}" style="width:120px; aspect-ratio:16/9; object-fit:cover; border-radius:4px;">
            <div style="flex:1;">
                <h4 style="margin:0; font-size:14px; color:#fff;">${v.title}</h4>
                <p style="margin:4px 0 0; color:#aaa; font-size:12px;">${v.duration}</p>
            </div>
        `;
        sGrid.appendChild(sCard);
    });
}
async function renderSuggestions(currentId) {
    const sGrid = document.getElementById('suggestionGrid');
    sGrid.innerHTML = ''; // Clear previous
    
    const all = await db.videos.toArray();
    // Swatacha video sodun baki sagle reverse order madhe
    const suggestions = all.filter(vid => vid.id !== currentId).reverse();

    if (suggestions.length === 0) {
        sGrid.innerHTML = '<p style="padding:20px; color:#aaa; text-align:center;">No suggestions available.</p>';
        return;
    }

    suggestions.forEach(v => {
        const sCard = document.createElement('div');
        sCard.className = "s-card";
        
        sCard.onclick = () => { 
            document.getElementById('vPlayer').pause(); 
            openPlayer(v);
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Play kelyavar varti scroll kara
        };

        // Motha Thumbnail wala HTML
        sCard.innerHTML = `
            <div class="s-thumb-box">
                <img src="${URL.createObjectURL(v.thumb)}" class="s-thumb-img">
                <span class="s-duration">${v.duration}</span>
            </div>
            <div class="s-details">
                <h4 class="s-v-title">${v.title}</h4>
                <p class="s-v-meta">FreshProno Vault • ${v.duration} • Now Playing</p>
            </div>
        `;
        sGrid.appendChild(sCard);
    });
}
