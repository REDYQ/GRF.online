        let JSON_URL = '';
        let currentFolderId = sessionStorage.getItem('opened_folder_id') || "";
        let isInitializing = false;
        const BASE_URL = 'https://raw.githubusercontent.com/REDYQ/Anime_Music/refs/heads/main/file/';

        const audio = document.getElementById('audio'),
            icon = document.getElementById('icon'),
            videoBg = document.getElementById('bg-video');
        const fullVideo = document.getElementById('full-video'),
            videoContainer = document.getElementById('video-player-container'),
            loader = document.getElementById('loader');
        let tracks = [],
            currentIdx = 0,
            isPlaying = false,
            isShuffle = false,
            isRepOne = false,
            currentBgMode = 'color',
            shuffleQueue = [];
        const fmt = (s) => isNaN(s) ? "0:00" : Math.floor(s / 60) + ":" + Math.floor(s % 60).toString().padStart(2, '0');
        const icons = {
            shOrd: '<path d="M20 9l-4 4V10H4V8h12V5l4 4zm-4 8V14H4v2h12v3l4-4-4-4z"/>',
            shRan: '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.59 10.83l-1.41 1.41 3.13 3.13L14.5 22H20v-5.5l-2.04 2.04-3.37-3.37z"/>',
            reNon: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>',
            reOne: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>'
        };
        async function init(isPreload = false, folderId = "") {
            if (!JSON_URL) return;
            if (folderId) currentFolderId = folderId;
            isInitializing = true;
            try {
                if (!isPreload) {
                    audio.pause();
                    audio.src = "";
                    isPlaying = false;
                    currentIdx = 0;
                    if (icon) icon.src = "";
                    document.getElementById('p-bar').style.width = '0%';
                    document.getElementById('curr').innerText = "0:00";
                    document.getElementById('dur').innerText = "0:00";
                    updatePlayBtn();
                }
                const res = await fetch(JSON_URL);
                tracks = await res.json();
                renderPlaylist();
                
                const listScreen = document.getElementById('playlist-screen');
                const playerScreen = document.getElementById('player-screen');
                if (listScreen) listScreen.className = 'screen screen-active';
                if (playerScreen) playerScreen.className = 'screen screen-hidden';
                renderPlaylist();
                document.getElementById('playlist-screen').className = 'screen screen-active';
                document.getElementById('player-screen').className = 'screen screen-hidden';
        if (isPreload) {
            const playingSrc = audio.src.split('/').pop(); 
            const foundIdx = tracks.findIndex(t => (BASE_URL + t.music).split('/').pop() === playingSrc);
            
            if (foundIdx !== -1) {
                currentIdx = foundIdx; 
            }
        } else {
            
            currentIdx = 0;
            loadTrack(0, false);
        }
                
                if (typeof updateIcons === 'function') updateIcons();
            } catch (e) {
                console.error("Ошибка инициализации списка:", e);
            } finally {
                isInitializing = false;
            }
        }

        function renderPlaylist() {
            let html = '';
            let lastSource = null;
            const playingFolder = sessionStorage.getItem('playing_folder_id');
   		 const isThisFolderPlaying = (playingFolder === currentFolderId);
    
            const currentNameInPlayer = document.getElementById('track-name').innerText;
            const currentAuthorInPlayer = document.getElementById('track-author').innerText;
            tracks.forEach((t, i) => {
                if (t.source && t.source !== lastSource) {
                    html += `<div class="group-header">${t.source}</div>`;
                    lastSource = t.source;
                }
        const isCurrent = isThisFolderPlaying && i === currentIdx;
        const activeClass = isCurrent ? 'active' : '';
        const playingClass = (isCurrent && isPlaying) ? 'playing' : '';

		const fullIconUrl = BASE_URL + t.icon;
		const fullMusicUrl = BASE_URL + t.music;
		
                html += `
            <div class="track-item ${activeClass} ${playingClass}" id="track-${i}" onclick="selectTrack(${i})" data-src="${fullMusicUrl}">
                <div class="bars-wrapper"><div class="playing-bars"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div></div>
                <img src="${fullIconUrl}" class="item-icon">
                <div class="item-info"><b>${t.name}</b><br><small>${t.autor}</small></div>
                </div>
            </div>`;
                if (isCurrent) currentIdx = i;
            });
            document.getElementById('list').innerHTML = html;
        }

        function toggleFav(i) {
            window.parent.postMessage({
                type: 'TOGGLE_FAVORITE',
                track: tracks[i]
            }, '*');
        }

        function selectTrack(i) {
    const t = tracks[i];
    const isSameMusic = audio.getAttribute('src') === (BASE_URL + t.music);
    
    if (currentIdx === i && isSameMusic) {
        toggleScreen('player');
    } else {
        currentIdx = i;
        loadTrack(i, true); 
        toggleScreen('player');
    }
        }

        function setBgMode(mode) {
            const t = tracks[currentIdx];
            if (mode === 'video' && (!t.video || t.video === '#')) {
                showToast("Для данного трека видео отсутствует");
                return;
            }
            currentBgMode = mode;
            updateBgVisual();
        }

        function updateBgVisual() {
            const t = tracks[currentIdx];
            
		    const fullVideoUrl = t.video === '#' ? '#' : 'https://github.com/' + t.video.replace('@', '/releases/download/BG/');
		    const isVideo = currentBgMode === 'video' && fullVideoUrl !== '#';
		    
            document.getElementById('sw-color').classList.toggle('active', !isVideo);
            document.getElementById('sw-video').classList.toggle('active', isVideo);
            if (isVideo) {
                if (videoBg.src !== fullVideoUrl) {
                    videoBg.src = fullVideoUrl;
                    videoBg.load();
                }
                videoBg.style.opacity = 1;
                if (isPlaying) videoBg.play().catch(() => {});
            } else {
                videoBg.style.opacity = 0;
                videoBg.pause();
            }
        }

        function loadTrack(idx, play) {
            const t = tracks[idx];
            if (!t) return;
            
    currentIdx = idx;
    
    const fullMusicUrl = BASE_URL + t.music;
    const fullIconUrl = BASE_URL + t.icon;
    
    audio.src = fullMusicUrl;
    icon.src = fullIconUrl;
            
            const currentName = document.getElementById('track-name').innerText;
            if (!play && currentName !== "" && isPlaying) {
                renderPlaylist();
                return;
            }
            currentIdx = idx;
            icon.src = fullIconUrl;
            document.getElementById('track-name').innerText = t.name;
            document.getElementById('track-author').innerText = t.autor;
            audio.src = fullMusicUrl;
            let volValue = parseInt(t.volume_master);
            audio.volume = (volValue === 0) ? 1.0 : (Math.max(0.01, (volValue || 100) / 100));
            document.getElementById('info-source').innerText = t.source || '-';
            document.getElementById('info-episode').innerText = t.episode || '-';
            document.getElementById('info-type').innerText = t.type || '-';
            document.getElementById('info-full').innerText = t.full || '-';
            
			const fullVideoUrl = t.video === '#' ? '#' : 'https://github.com/' + t.video.replace('@', '/releases/download/BG/');

    if (fullVideoUrl !== '#') {
        videoBg.preload = "metadata"; 
        videoBg.src = fullVideoUrl;
        videoBg.load(); 
    }
			
			document.getElementById('sw-video').classList.toggle('disabled', fullVideoUrl === '#');
			document.getElementById('btn-watch-video').style.display = (fullVideoUrl === '#') ? 'none' : 'block';
			
            updateBgVisual();
            document.querySelectorAll('.track-item').forEach((el, i) => {
                el.classList.remove('playing');el.classList.toggle('active', i === idx);
            });
			
            icon.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 1;canvas.height = 1;ctx.drawImage(icon, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                document.documentElement.style.setProperty('--bg-dynamic', `rgb(${r},${g},${b})`);
            };
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: t.name,
                    artist: t.autor,
                    artwork: [{
                        src: fullIconUrl,
                        sizes: '512x512',
                        type: 'image/png'
                    }]
                });
                navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
                navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
                navigator.mediaSession.setActionHandler('play', () => audio.play());
                navigator.mediaSession.setActionHandler('pause', () => audio.pause());
            }
            if (play) {
                audio.play().catch(() => {});
                isPlaying = true;
                sessionStorage.setItem('playing_folder_id', currentFolderId);
            }
            updatePlayBtn();
            renderPlaylist();
            updateFavButton();
        }

function syncMediaUI(playing) {
    const t = tracks[currentIdx];
const playingFolderId = sessionStorage.getItem('playing_folder_id');
    if (currentFolderId !== playingFolderId) {
        return; 
    }
    if (!t || !t.name || !audio.getAttribute('src')) return;

    const fullIcon = BASE_URL + t.icon;
    const fullMusic = BASE_URL + t.music;
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: t.name,
            artist: t.autor,
            artwork: [{ src: fullIconUrl, sizes: '512x512', type: 'image/png' }]
        });
        navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }

    
    window.parent.postMessage({
        type: 'PLAYER_STATE', 
        isPlaying: playing,
        folderId: currentFolderId,
        name: t.name,
        autor: t.autor,
        img: fullIconUrl,
        music: fullMusicUrl
    }, '*');
}


        function openFullVideo() {
            const t = tracks[currentIdx];
            const fullVideoUrl = t.video === '#' ? '#' : 'https://github.com/' + t.video.replace('@', '/releases/download/BG/');
            if (fullVideoUrl !== '#') {
                audio.pause();
                document.getElementById('v-title').innerText = t.name;
                
                fullVideo.src = fullVideoUrl;
                videoContainer.style.display = 'flex';
				fullVideo.play().catch(e => {
		            showToast("Ошибка запуска: " + e.message);
		        });
            }
        }

        function toggleVideoPlay() {
            if (fullVideo.paused) fullVideo.play();
            else fullVideo.pause();
        }

        function closeVideoPlayer(e) {
            if (e) e.stopPropagation();
            fullVideo.pause();
            fullVideo.src = "";
            videoContainer.style.display = 'none';
        }

        function nextTrack() {
            if (isShuffle) {
                if (shuffleQueue.length === 0) {
                    shuffleQueue = Array.from({
                        length: tracks.length
                    }, (_, i) => i).filter(i => i !== currentIdx);
                    shuffleQueue.sort(() => Math.random() - 0.5);
                }
                currentIdx = shuffleQueue.pop();
            } else {
                currentIdx = (currentIdx + 1) % tracks.length;
            }
            loadTrack(currentIdx, true);
        }

        function prevTrack() {
            currentIdx = (currentIdx - 1 + tracks.length) % tracks.length;
            loadTrack(currentIdx, true);
        }

        function updatePlayBtn() {
            const path = document.getElementById('p-path');
            path.setAttribute('d', isPlaying ? 'M6 19h4V5H6zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z');
            document.getElementById('play-icon-svg').style.marginLeft = isPlaying ? "0px" : "0px";
        }

        function toggleScreen(type) {
            const listScr = document.getElementById('playlist-screen');
            const playScr = document.getElementById('player-screen');
            if (type === 'player') {
                listScr.classList.remove('screen-active');
                listScr.classList.add('screen-hidden');
                playScr.classList.remove('screen-hidden');
                playScr.classList.add('screen-active');
            } else {
                playScr.classList.remove('screen-active');
                playScr.classList.add('screen-hidden');
                listScr.classList.remove('screen-hidden');
                listScr.classList.add('screen-active');
            }
        }

        function updateIcons() {
            document.getElementById('sh-icon').innerHTML = isShuffle ? icons.shRan : icons.shOrd;
            document.getElementById('re-icon').innerHTML = isRepOne ? icons.reOne : icons.reNon;
        }
        
        document.getElementById('play').onclick = () => {
            if (isPlaying) audio.pause();
            else audio.play();
        };
        document.getElementById('next').onclick = nextTrack;
        document.getElementById('prev').onclick = prevTrack;
        document.getElementById('shuf').onclick = () => {
            isShuffle = !isShuffle;shuffleQueue = [];updateIcons();
        };
        document.getElementById('rep').onclick = () => {
            isRepOne = !isRepOne;updateIcons();
        };
        document.getElementById('back-to-list').onclick = () => toggleScreen('list');
        document.getElementById('open-info').onclick = () => {
            document.getElementById('info-modal').classList.add('active');document.getElementById('overlay').style.display = 'block';
        };

        function closeModal() {
            document.getElementById('info-modal').classList.remove('active');
            document.getElementById('overlay').style.display = 'none';
        }
        document.getElementById('overlay').onclick = closeModal;
        let currentFavorites = [];
        document.getElementById('btn-fav').onclick = () => {
            const track = tracks[currentIdx];
            window.parent.postMessage({
                type: 'TOGGLE_FAVORITE',
                track: track
            }, '*');
const isNowFav = !currentFavorites.some(f => f.music === track.music);
showToast(isNowFav ? "Добавлено в избранное" : "Удалено из избранного");
        };

        function updateFavButton() {
            const track = tracks[currentIdx];
            if (!track) return;
            const isFav = currentFavorites.some(f => f.music === track.music);
            document.getElementById('btn-fav').classList.toggle('active', isFav);
        }
        audio.onwaiting = () => loader.style.display = 'block';
        audio.oncanplay = () => loader.style.display = 'none';

audio.onplaying = () => {
    isPlaying = true;
    updatePlayBtn();
    syncMediaUI(true);
    renderPlaylist();
    if (currentBgMode === 'video') videoBg.play().catch(() => {});
    const item = document.getElementById(`track-${currentIdx}`);
    if (item) item.classList.add('playing');
};

audio.onpause = () => {
    isPlaying = false;
    updatePlayBtn();
    syncMediaUI(false); 
    renderPlaylist();
    videoBg.pause();
    const item = document.getElementById(`track-${currentIdx}`);
    if (item) item.classList.remove('playing');
};

        audio.onended = () => {
            if (isRepOne) audio.play();
            else nextTrack();
        };
        audio.ontimeupdate = () => {
            const progress = (audio.currentTime / audio.duration * 100);
            document.getElementById('p-bar').style.width = (progress || 0) + '%';
            if (currentBgMode === 'video' && videoBg.duration) {
                if (audio.paused || audio.seeking) {
                    if (!videoBg.paused) videoBg.pause();
                } else {
                    if (videoBg.paused) videoBg.play().catch(() => {});
                }
                const videoPos = audio.currentTime % videoBg.duration;
                if (Math.abs(videoBg.currentTime - videoPos) > 0.6) {
                    videoBg.currentTime = videoPos;
                }
            }
            document.getElementById('curr').innerText = fmt(audio.currentTime);
            if (!isNaN(audio.duration)) {
                document.getElementById('dur').innerText = fmt(audio.duration);
            }
        };
        document.getElementById('p-cont').onclick = (e) => {
            audio.currentTime = (e.offsetX / e.currentTarget.clientWidth) * audio.duration;
        };
        fullVideo.onplay = () => {
            document.getElementById('v-p-path').setAttribute('d', 'M6 19h4V5H6zm8-14v14h4V5h-4z');
        };
        fullVideo.onpause = () => {
            document.getElementById('v-p-path').setAttribute('d', 'M8 5v14l11-7z');
        };
        document.getElementById('v-p-cont').onclick = (e) => {
            fullVideo.currentTime = (e.offsetX / e.currentTarget.clientWidth) * fullVideo.duration;
        };
        fullVideo.ontimeupdate = () => {
            document.getElementById('v-p-bar').style.width = (fullVideo.currentTime / fullVideo.duration * 100) + '%';
            document.getElementById('v-curr').innerText = fmt(fullVideo.currentTime);
            if (!isNaN(fullVideo.duration)) document.getElementById('v-dur').innerText = fmt(fullVideo.duration);
        };
        window.addEventListener('message', (e) => {
            if (e.data.type === 'LOAD_FAVORITES') {
                tracks = e.data.tracks;
                currentFavorites = e.data.tracks;
                currentFolderId = "FAVORITES_MODE";
                currentIdx = 0;
                renderPlaylist();
                
                loadTrack(0, e.data.playFirst);
                toggleScreen('list');
            }
            
			if (e.data.type === 'SELECT_TRACK_BY_INDEX') {
			    const idx = e.data.index;
			    if (tracks[idx]) {
			        currentIdx = idx;
			        loadTrack(idx, e.data.autoPlay || false); 
			        toggleScreen('player'); 
			    }
			}

            if (e.data.type === 'SYNC_FAVORITES') {
                currentFavorites = e.data.favorites;
                updateFavButton();
            }
            if (e.data.type === 'LOAD_PLAYLIST') {
                JSON_URL = e.data.url;
                
                isInitializing = false;
                currentFolderId = e.data.folderId || e.data.url;
                const isPreload = e.data.noPlay === true;
                
                init(isPreload);
                toggleScreen('list');
            }
            if (e.data.type === 'SHOW_LIST_ONLY') toggleScreen('list');
            if (e.data.type === 'OPEN_CURRENT') toggleScreen('player');
            if (e.data.type === 'TOGGLE') document.getElementById('play').click();
    if (e.data.type === 'GET_STATUS') {
        syncMediaUI(isPlaying);
    }
        });

        function minimizePlayer() {
            const activeScreen = document.querySelector('.screen-active');
            if (!activeScreen) return;
            activeScreen.classList.replace('screen-active', 'screen-hidden');
            
showToast("Нажмите на экран, чтобы вернуть интерфейс");
setTimeout(() => {
    document.body.onclick = () => {
        activeScreen.classList.replace('screen-hidden', 'screen-active');
        document.body.onclick = null;
    };
}, 300);
        }

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
}

        function closeFullPlayer() {
        	syncMediaUI(isPlaying); 
            window.parent.postMessage({
                type: 'CLOSE_PLAYER'
            }, '*');
        }
        window.addEventListener('resize', () => {
            let vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            if (videoContainer.style.display === 'flex') {
                fullVideo.style.maxHeight = (window.innerHeight * 0.7) + 'px';
            }
        });
        window.dispatchEvent(new Event('resize'));

        function fixHeight() {
            setTimeout(() => {
                let vh = window.innerHeight * 0.01;
                document.documentElement.style.setProperty('--vh', `${vh}px`);
                document.body.style.height = window.innerHeight + 'px';
            }, 150);
        }
        document.addEventListener('touchmove', function(e) {
            if (!e.target.closest('.list-container')) {
                e.preventDefault();
            }
        }, {
            passive: false
        });
        window.addEventListener('resize', fixHeight);
        window.addEventListener('orientationchange', fixHeight);
        fixHeight();
       
//*
function handleVideoError(event) {
	const videoElement = event.target;
    const err = videoElement.error;
    
    if (!videoElement.src || videoElement.src === window.location.href || videoElement.src.endsWith('.html')) {
        return;
    }

    if (!err) return;
    
    const videoSrc = event.target.src;
    
    showToast("Ошибка загрузки видео");
    const errorMap = {
        1: "MEDIA_ERR_ABORTED (Загрузка прервана)",
        2: "MEDIA_ERR_NETWORK (Ошибка сети/GitHub)",
        3: "MEDIA_ERR_DECODE (Ошибка кодека/декодирования)",
        4: "MEDIA_ERR_SRC_NOT_SUPPORTED (404 или формат не поддерживается)"
    };

    const errorText = errorMap[err.code] || `UNKNOWN_ERROR (Код: ${err.code})`;
    
    window.parent.postMessage({
        type: 'DEBUG_VIDEO',
        data: {
            file: videoSrc.split('/').pop(),
            fullPath: videoSrc,
            errorDescription: errorText,
            sysMessage: err.message || "#",
            readyState: event.target.readyState
        }
    }, '*');
}

videoBg.onerror = handleVideoError;
fullVideo.onerror = handleVideoError;
//*