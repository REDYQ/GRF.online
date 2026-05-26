        function sortFavoritesBySource() {
            favorites.sort((a, b) => {
                const sourceA = (a.source || "").toLowerCase();
                const sourceB = (b.source || "").toLowerCase();
                if (sourceA < sourceB) return -1;
                if (sourceA > sourceB) return 1;
                return 0;
            });
        }
        let favorites = JSON.parse(localStorage.getItem('rq_favorites') || '[]');
        let isPlayingFavorites = false;

        function saveFavorites() {
            localStorage.setItem('rq_favorites', JSON.stringify(favorites));
        }
        document.getElementById('current-year').textContent = new Date().getFullYear();
        const JSON_URL = 'https://raw.githubusercontent.com/REDYQ/Anime_Music/refs/heads/main/file/data.json';
        const BASE_URL = 'https://raw.githubusercontent.com/REDYQ/Anime_Music/refs/heads/main/file/';
        const frame = document.getElementById('player-frame');
        const mini = document.getElementById('mini-player');
        const searchInput = document.getElementById('search-input');
        const searchContainer = document.getElementById('search-container');
        let currentLoadedUrl = "";
        let hasPlayedOnce = false;
        
        async function loadFolders() {
        	const allContainer = document.getElementById('folder-list');
   		 allContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #555;">Загрузка...</div>';
   
            const list = document.getElementById('folder-list');
            list.innerHTML = '';
            const favDiv = document.createElement('div');
            favDiv.className = 'folder-item favorites';
            favDiv.setAttribute('data-name', 'избранное');
            favDiv.style.marginBottom = '60px';
            favDiv.innerHTML = `
    <img src="https://raw.githubusercontent.com/REDYQ/Anime_Music/refs/heads/main/file/icon/favourites.jpg" class="folder-icon">
    <div class="folder-info">
        <b>ИЗБРАННОЕ</b><br>
        <span class="fav-badge">${favorites.length} шт.</span>
    </div>
    <div class="fav-menu-container">
        <button class="dots-btn" onclick="event.stopPropagation(); toggleFavMenu(event)">
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="white""")/>></svg>
        </button>
        <div class="fav-dropdown" id="fav-drop">
            <button class="drop-item" onclick="exportFavorites(event)">
                <svg viewBox="0 0 24 24"><path d="M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z""")/>></svg>
                EXPORT
            </button>
            <button class="drop-item" onclick="importFavorites(event)">
                <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z""")/>></svg>
                IMPORT
            </button>
        </div>
    </div>
        <input type="file" id="import-file" style="display:none" accept=".rq" onchange="handleFileSelect(event)">
                
            <div class="playing-bars">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            </div>
    `;
    
        if (typeof updateTrackListVisuals === 'function') {
        updateTrackListVisuals();
    }
            favDiv.onclick = (e) => {
                if (e.target.closest('.fav-menu-container') || e.target.closest('.fav-dropdown')) return;
                if (favorites.length > 0) {
                    openFavorites();
                } else {
                    showToast("Список избранного пуст!");
                }
            };
            list.appendChild(favDiv);
    
            try {
                const res = await fetch(JSON_URL);
                const data = await res.json();
                data.forEach((item) => {
		            const fullIconUrl = BASE_URL + item.icon;
		            const fullDataUrl = BASE_URL + item.data;
                	
                    const div = document.createElement('div');
                    div.className = 'folder-item';
                    div.setAttribute('data-name', item.name.toLowerCase());
                    div.setAttribute('data-id', item.number);
                    div.innerHTML = `<img src="${fullIconUrl}" class="folder-icon"><div class="folder-info"><b>${item.name}</b><br></div>`;
                    div.onclick = () => {
                        sessionStorage.setItem('opened_folder_id', item.number);
                        openFullPlayer();
                        
                        if (currentLoadedUrl !== fullDataUrl) {
                            currentLoadedUrl = fullDataUrl;
                            frame.contentWindow.postMessage({
                                type: 'LOAD_PLAYLIST',
                                url: fullDataUrl,
                                folderId: item.data,
                                noPlay: true
                            }, '*');
                        } else {
                            frame.contentWindow.postMessage({
                                type: 'SHOW_LIST_ONLY'
                            }, '*');
                            updateTrackListVisuals();
                        }
                    };
                    list.appendChild(div);
                });
            } catch (e) {
                allContainer.innerHTML = `<div style="color:red; text-align:center;">Ошибка загрузки</div>`;
            }
			setTimeout(handleUrlParams, 500); 
        }

function openFavorites() {
    sessionStorage.setItem('opened_folder_id', "FAVORITES_MODE");
    openFullPlayer(false);
    
    currentLoadedUrl = "FAVORITES_MODE";
    frame.contentWindow.postMessage({
        type: 'LOAD_FAVORITES',
        tracks: favorites,
        playFirst: false
    }, '*');
}

        function exportFavorites(e) {
            if (e) e.stopPropagation();
            if (favorites.length === 0) return showToast("Нечего экспортировать!");
            const d = new Date();
            const dateStr = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`;
            const blob = new Blob([JSON.stringify(favorites)], {
                type: "application/octet-stream"
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `AMusic_Favorites [${dateStr}].rq`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            const drop = document.getElementById('fav-drop');
            if (drop) drop.classList.remove('active');
            showToast("Файл сохранен");
        }

        function importFavorites(e) {
            if (e) e.stopPropagation();
            document.getElementById('import-file').click();
        }
        async function handleFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.rq')) {
                showToast("Ошибка: Выберите файл .rq");
                event.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (!Array.isArray(importedData)) throw new Error();
                    const drop = document.getElementById('fav-drop');
                    if (drop) drop.classList.remove('active');
                    const badge = document.querySelector('.fav-badge');
                    if (badge) {
                        badge.innerText = "Проверка...";
                        badge.style.background = "#FF9800";
                    }
                    let added = 0,
                        skipped = 0,
                        notFound = 0;
                    for (const track of importedData) {
                        const isDuplicate = favorites.some(f => f.music === track.music);
                        if (!isDuplicate && track.music) {
                            try {
                                const check = await fetch(track.music, {
                                    method: 'HEAD'
                                });
                                if (check.ok) {
                                    favorites.push(track);
                                    added++;
                                } else {
                                    notFound++;
                                }
                            } catch (err) {
                                notFound++;
                            }
                        } else {
                            skipped++;
                        }
                    }
                    sortFavoritesBySource();
                    saveFavorites();
                    loadFolders();
                    frame.contentWindow.postMessage({
                        type: 'SYNC_FAVORITES',
                        favorites: favorites
                    }, '*');
                    if (added > 0) {
                        showToast(`Добавлено: ${added} (пропущено: ${skipped + notFound})`, 4000);
                    } else {
                        showToast("Новых треков не найдено", 3000);
                    }
                } catch (err) {
                    showToast("Ошибка: Файл поврежден", 3000);
                    loadFolders();
                }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        function openFullPlayer(isFromMini = false) {
            document.body.classList.add('no-scroll');
            document.querySelector('header').classList.add('hide-ui');
            document.querySelector('footer').classList.add('hide-ui');
            document.body.style.paddingTop = '0';
            frame.style.display = 'block';
            frame.classList.add('full-frame');
            updateIframeHeight();
            searchContainer.style.display = 'none';
            mini.classList.remove('active');
            frame.style.height = window.innerHeight + 'px';
            
            if (isFromMini) {
                frame.contentWindow.postMessage({
                    type: 'OPEN_CURRENT'
                }, '*');
            }
        }

        function togglePlay() {
            frame.contentWindow.postMessage({
                type: 'TOGGLE'
            }, '*');
        }
        searchInput.oninput = () => {
            const val = searchInput.value.toLowerCase().trim();
            const folders = document.querySelectorAll('.folder-item');
            folders.forEach(item => {
                const name = item.getAttribute('data-name') || "";
                if (name.includes(val)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        };
let currentPlayingSrc = ""; 
let isCurrentlyPlaying = false; 
let currentlyPlayingFolderId = sessionStorage.getItem('playing_folder_id') || "";


function updateTrackListVisuals() {
    const allTracks = document.querySelectorAll('.track-item');
    const openedFolderId = sessionStorage.getItem('opened_folder_id');
    
    allTracks.forEach(track => {
        const trackSrc = track.getAttribute('data-src');
        
        
        const cleanTrackSrc = trackSrc ? trackSrc.split('/').pop() : "";
        const cleanPlayingSrc = currentPlayingSrc ? currentPlayingSrc.split('/').pop() : "";

        if (openedFolderId === currentlyPlayingFolderId && cleanTrackSrc !== "" && cleanTrackSrc === cleanPlayingSrc) {
            track.classList.add('active'); 
            if (isCurrentlyPlaying) {
                track.classList.add('playing'); 
            } else {
                track.classList.remove('playing');
            }
        } else {
            track.classList.remove('active');
            track.classList.remove('playing');
        }
    });
}

window.addEventListener('message', (e) => {
if (e.data.type === 'DEBUG_VIDEO') {
    const d = e.data.data;
    console.group("=== ОТЧЕТ ОБ ОШИБКЕ В ВИДЕО ===");
    console.error("Ошибка:", d.errorDescription);
    console.log("Имя файла:", d.file);
    console.log("Полный путь:", d.fullPath);
    console.warn("Технические детали:", d.sysMessage);
    console.groupEnd();
}
	
    if (e.data.type === 'PLAYER_STATE') {
        
        const trackData = e.data;
        const playingFolder = sessionStorage.getItem('playing_folder_id');
        
        if (trackData.folderId !== playingFolder && !trackData.isPlaying) {
            return; 
        }

		const isFromPlayingFolder = (trackData.folderId === playingFolder);

        const mImg = document.getElementById('m-img');
        const mName = document.getElementById('m-name');
        const mAuthor = document.getElementById('m-author');
        const mPath = document.getElementById('m-path'); 

        if (isFromPlayingFolder || trackData.type === 'MEDIA_SESSION_SYNC' || trackData.isPlaying) {
            
            const title = trackData.metadata?.title || trackData.name || trackData.trackInfo?.title;
            const artist = trackData.metadata?.artist || trackData.autor || trackData.trackInfo?.artist;
            const artwork = trackData.metadata?.artwork || trackData.img;

            if (mName && title) mName.innerText = title;
            if (mAuthor && artist) mAuthor.innerText = artist;
            if (mImg && artwork) mImg.src = artwork;
        }

        currentPlayingSrc = trackData.trackSrc || trackData.music || currentPlayingSrc;
        isCurrentlyPlaying = trackData.isPlaying;

        if (trackData.isPlaying && trackData.folderId) {
            sessionStorage.setItem('playing_folder_id', trackData.folderId);
            currentlyPlayingFolderId = trackData.folderId;
        }
        
        if (mPath) {
            mPath.setAttribute('d', isCurrentlyPlaying ? 'M6 19h4V5H6zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z');
        }

if (isCurrentlyPlaying && mName && mName.innerText !== "-Name-") {
    mini.classList.add('active'); 
} else if (mName && mName.innerText !== "-Name-") {
    mini.classList.add('active'); 
}

    if (e.data.isPlaying) {
        isPlayingFavorites = (e.data.folderId === "FAVORITES_MODE");
    }
    
        updateTrackListVisuals();
    }


            if (e.data.type === 'TOGGLE_FAVORITE') {
                const track = e.data.track;
                const index = favorites.findIndex(f => f.music === track.music);
                if (index > -1) {
                    favorites.splice(index, 1);
                } else {
                    favorites.push(track);
                }
                sortFavoritesBySource();
                localStorage.setItem('rq_favorites', JSON.stringify(favorites));
                loadFolders();
                frame.contentWindow.postMessage({
                    type: 'SYNC_FAVORITES',
                    favorites: favorites
                }, '*');
            }

            
            if (e.data.type === 'CLOSE_PLAYER') {
                document.body.classList.remove('no-scroll');
                document.querySelector('header').classList.remove('hide-ui');
                document.querySelector('footer').classList.remove('hide-ui');
                document.body.style.paddingTop = '70px';
                frame.style.display = 'none';
                frame.classList.remove('full-frame');
                searchContainer.style.display = 'flex';

                if (e.data.currentFolderId) {
                    if (e.data.currentFolderId === "FAVORITES_MODE") {
                        currentLoadedUrl = "FAVORITES_MODE";
                    } else {
                        currentLoadedUrl = e.data.currentFolderId.startsWith('http') ? e.data.currentFolderId : BASE_URL + e.data.currentFolderId;
                    }
                }
                
                updateTrackListVisuals();
                
			    const mini = document.getElementById('mini-player');
			    if (isCurrentlyPlaying && mini) {
			        mini.classList.add('active');
			    }
            }
        });
        loadFolders();

        function updateIframeHeight() {
            const frame = document.getElementById('player-frame');
            if (!frame) return;
            if (frame.classList.contains('full-frame')) {
                frame.style.height = window.innerHeight + 'px';
            } else {
                frame.style.height = (window.innerHeight - 60) + 'px';
            }
        }
        window.addEventListener('load', updateIframeHeight);
        window.addEventListener('resize', updateIframeHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateIframeHeight, 200);
        });

        function toggleFavMenu(e) {
            const drop = document.getElementById('fav-drop');
            drop.classList.toggle('active');
            const closeMenu = (event) => {
                if (!event.target.closest('.fav-menu-container')) {
                    drop.classList.remove('active');
                    document.removeEventListener('click', closeMenu);
                }
            };
            document.addEventListener('click', closeMenu);
        }

        function sortFavoritesBySource() {
            favorites.sort((a, b) => {
                const sA = (a.source || "").toLowerCase();
                const sB = (b.source || "").toLowerCase();
                return sA.localeCompare(sB);
            });
        }
        let pressTimer;
        mini.addEventListener('mousedown', startPress);
        mini.addEventListener('touchstart', startPress, {
            passive: true
        });
        mini.addEventListener('mouseup', cancelPress);
        mini.addEventListener('mouseleave', cancelPress);
        mini.addEventListener('touchend', cancelPress);
        mini.addEventListener('touchmove', cancelPress);

        function startPress(e) {
            pressTimer = window.setTimeout(() => {
                mini.classList.remove('active');
                showToast("Плеер скрыт");
            }, 800);
        }

        function cancelPress() {
            clearTimeout(pressTimer);
        }

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
}

let urlParamsProcessed = false;

function handleUrlParams() {
	if (urlParamsProcessed) return;
	
    const query = window.location.search.substring(1); 
    if (!query) return;
    
    urlParamsProcessed = true;

    const parts = query.split('_');
    const folderIdFromUrl = decodeURIComponent(parts[0]).toLowerCase();
    const trackPos = parts[1] ? parseInt(parts[1]) : null;

    const folders = document.querySelectorAll('.folder-item');
    let targetFolder = null;

    folders.forEach(folder => {
        const id = folder.getAttribute('data-id');
        const name = (folder.getAttribute('data-name') || "").toLowerCase();
        
        if (id === folderIdFromUrl || (folderIdFromUrl === "избранное" && name === "избранное")) {
            targetFolder = folder;
        }
    });

    if (targetFolder) {
        targetFolder.click(); 

        if (trackPos !== null) {
            const trackIndex = trackPos - 1;
            let attempts = 0;

            const checkFrame = setInterval(() => {
                const frame = document.getElementById('player-frame');
                if (frame && frame.contentWindow) {
                    frame.contentWindow.postMessage({
                        type: 'SYNC_FAVORITES',
                        favorites: favorites
                    }, '*');

                    frame.contentWindow.postMessage({
                        type: 'SELECT_TRACK_BY_INDEX',
                        index: trackIndex,
                        autoPlay: false
                    }, '*');
                    
                    clearInterval(checkFrame);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
                if (attempts++ > 30) clearInterval(checkFrame); 
            }, 500);
        }
    }
}