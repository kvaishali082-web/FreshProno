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
    renderSuggestions(v.id);
}

window.closePlayer = () => { document.getElementById('vPlayer').pause(); showPage('homePage'); };
window.delVideo = async () => { if(confirm("Delete this video?")) { await db.videos.delete(activeId); showPage('homePage'); renderFeed(); updateStorageInfo(); } };
window.saveToGallery = async () => {
    const v = await db.videos.get(activeId);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(v.vidFile);
    a.download = v.title + ".mp4"; a.click();
};

async function renderSuggestions(currentId) {
    const sGrid = document.getElementById('suggestionGrid');
    sGrid.innerHTML = ''; 
    const all = await db.videos.toArray();
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
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
function openSecretWebsite() {
    // Hi line website la navin window madhe ughdel
    window.open("https://freshporno.net", "_blank");
}
function toggleSearch() {
    const sSec = document.getElementById('searchSection');
    sSec.classList.toggle('hidden');
}

async function downloadFromUrl() {
    const url = document.getElementById('videoUrlInput').value;
    if(!url) return alert("Pahile URL taka!");

    try {
        document.getElementById('uploadStatusOverlay').classList.remove('hidden');
        document.getElementById('uploadLine').style.width = "50%";

        const response = await fetch(url);
        const blob = await response.blob();
        
        // Video file tayar zali
        const file = new File([blob], "DownloadedVideo.mp4", { type: "video/mp4" });
        
        // Atat ha video vault madhe save karnyasaathi automatic upload page var pathva
        selVid = file;
        const vPrev = document.getElementById('vidPreview');
        vPrev.src = URL.createObjectURL(selVid);
        
        document.getElementById('uploadLine').style.width = "100%";
        setTimeout(() => {
            document.getElementById('uploadStatusOverlay').classList.add('hidden');
            showPage('uploadPage'); // Atat tithe jaun title ani cover set kara
            alert("Video Fetch zala! Atat Cover set karun Save kara.");
        }, 1000);

    } catch (error) {
        alert("Error: Website ne permission nakarli aahe. Manually download karun upload kara.");
        document.getElementById('uploadStatusOverlay').classList.add('hidden');
    }
}
let tempEditThumb = null;

async function openEditModal() {
    const v = await db.videos.get(activeId);
    document.getElementById('editTitle').value = v.title;
    
    const editPrev = document.getElementById('editPreview');
    editPrev.src = URL.createObjectURL(v.vidFile);
    
    editPrev.onloadedmetadata = () => {
        document.getElementById('editFrameRange').max = editPrev.duration;
    };
    
    document.getElementById('editFrameRange').oninput = (e) => {
        editPrev.currentTime = e.target.value;
    };
    
    document.getElementById('editModal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('editModal').classList.add('hidden');
    tempEditThumb = null;
}

function captureNewThumb() {
    const vPrev = document.getElementById('editPreview');
    const canvas = document.getElementById('thumbCanvas');
    canvas.width = vPrev.videoWidth; 
    canvas.height = vPrev.videoHeight;
    canvas.getContext('2d').drawImage(vPrev, 0, 0);
    canvas.toBlob((blob) => {
        tempEditThumb = blob;
        alert("New Cover Selected! ✅");
    }, 'image/jpeg');
}

async function saveEdit() {
    const newTitle = document.getElementById('editTitle').value;
    const updateData = { title: newTitle };
    
    if (tempEditThumb) {
        updateData.thumb = tempEditThumb;
    }
    
    await db.videos.update(activeId, updateData);
    alert("Video Updated!");
    closeEditModal();
    
    // UI Refresh
    renderFeed();
    const v = await db.videos.get(activeId);
    document.getElementById('pTitle').innerText = v.title;
}
