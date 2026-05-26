        let JSON_URL = '';
        let currentFolderId = sessionStorage.getItem('opened_folder_id') || "";
        let playingFolderId = sessionStorage.getItem('playing_folder_id') || "";
        let isInitializing = false;
        let currentPlayingTrackData = null;
        
        let tracks = [];
        let playingTracks = []; 
        let playingIdx = -1;
        let currentIdx = 0;
        
        let currentDelayMode = 'auto';
		let customStartTime = 0;
		let isFirstVideoCycleDone = false;

        const BASE_URL = 'https://raw.githubusercontent.com/REDYQ/Anime_Music/refs/heads/main/file/';

        const audio = document.getElementById('audio'),
            icon = document.getElementById('icon'),
            videoBg = document.getElementById('bg-video');
        const fullVideo = document.getElementById('full-video'),
            videoContainer = document.getElementById('video-player-container'),
            loader = document.getElementById('loader');

        let isPlaying = false,
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
                if (!isPreload && currentFolderId === playingFolderId) {
                    currentIdx = playingIdx;
                } else if (!isPreload) {
                    currentIdx = 0;
                }
                
                const res = await fetch(JSON_URL);
                tracks = await res.json();
                
                const listScreen = document.getElementById('playlist-screen');
                const playerScreen = document.getElementById('player-screen');
                if (listScreen) listScreen.className = 'screen screen-active';
                if (playerScreen) playerScreen.className = 'screen screen-hidden';
                
                renderPlaylist();
                
                if (isPreload) {
                    const playingSrc = audio.src.split('/').pop(); 
                    const foundIdx = tracks.findIndex(t => (BASE_URL + t.music).split('/').pop() === playingSrc);
                    
                    if (foundIdx !== -1) {
                        currentIdx = foundIdx; 
                    }
                } else {
                    if (currentFolderId !== playingFolderId) {
                        currentIdx = 0;
                    } else {
                        currentIdx = playingIdx;
                    }
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
            
            const listsMatch = (currentFolderId === playingFolderId);
    
            tracks.forEach((t, i) => {
                if (t.source && t.source !== lastSource) {
                    html += `<div class="group-header">${t.source}</div>`;
                    lastSource = t.source;
                }

                const isCurrent = listsMatch && (playingIdx !== -1) && (i === playingIdx);
                const activeClass = isCurrent ? 'active' : '';
                const playingClass = (isCurrent && isPlaying) ? 'playing' : '';

                const fullIconUrl = BASE_URL + t.icon;
                const fullMusicUrl = BASE_URL + t.music;
                
                html += `
            <div class="track-item ${activeClass} ${playingClass}" id="track-${i}" onclick="selectTrack(${i})" data-src="${fullMusicUrl}">
                <div class="bars-wrapper"><div class="playing-bars"><div class="bar"></div><div class="bar"></div><div class="bar"></div></div></div>
                <img src="${fullIconUrl}" class="item-icon">
                <div class="item-info"><b>${t.name}</b><br><small>${t.autor}</small></div>
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
            const fullMusicUrl = BASE_URL + t.music;
            const isSameMusic = audio.getAttribute('src') === fullMusicUrl;
            
            if (isSameMusic && playingFolderId === currentFolderId) {
                toggleScreen('player');
            } else {
                playingTracks = [...tracks];
                playingIdx = i;
                playingFolderId = currentFolderId;
                sessionStorage.setItem('playing_folder_id', playingFolderId);
                
                loadTrack(playingIdx, true); 
                toggleScreen('player');
            }
        }

        function loadTrack(idx, play) {
   		 isFirstVideoCycleDone = false; 

            const t = playingTracks[idx];
            if (!t) return;
            
            playingIdx = idx;
            currentPlayingTrackData = t;
            
            const fullMusicUrl = BASE_URL + t.music;
            const fullIconUrl = BASE_URL + t.icon;
            
            audio.src = fullMusicUrl;
            icon.src = fullIconUrl;
            
            const currentName = document.getElementById('track-name').innerText;
            if (!play && currentName !== "" && isPlaying) {
                renderPlaylist();
                return;
            }

            document.getElementById('track-name').innerText = t.name;
            document.getElementById('track-author').innerText = t.autor;
            
            if (typeof checkTrackNameLength === 'function') checkTrackNameLength();
            
            let volValue = parseInt(t.volume_master);
            audio.volume = (volValue === 0) ? 1.0 : (Math.max(0.01, (volValue || 100) / 100));
            
            document.getElementById('info-source').innerText = t.source || '-';
            document.getElementById('info-episode').innerText = t.episode || '-';
            document.getElementById('info-type').innerText = t.type || '-';
            document.getElementById('info-full').innerText = t.full || '-';
			
			const hasTimestamp = t.video && t.video.includes('?');
            document.getElementById('delay-mode-section').style.display = hasTimestamp ? 'block' : 'none';
            
            document.querySelectorAll('.track-item').forEach((el, i) => {
                el.classList.remove('playing');
                const isRealFolder = (currentFolderId === playingFolderId);
                el.classList.toggle('active', isRealFolder && i === idx);
            });

            icon.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 1; canvas.height = 1; ctx.drawImage(icon, 0, 0, 1, 1);
                const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
                document.documentElement.style.setProperty('--bg-dynamic', `rgb(${r},${g},${b})`);
            };
            
            videoBg.onloadedmetadata = () => {
                calculateCustomDelay();
            };            

            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: t.name,
                    artist: t.autor,
                    artwork: [{ src: fullIconUrl, sizes: '512x512', type: 'image/png' }]
                });
                navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
                navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
                navigator.mediaSession.setActionHandler('play', () => audio.play());
                navigator.mediaSession.setActionHandler('pause', () => audio.pause());
            }

            if (play) {
                const fullVideoUrl = t.video === '#' ? '#' : 'github.com' + t.video.replace('@', '/releases/download/BG/');
                if (fullVideoUrl !== '#' && currentBgMode === 'video') {
                    videoBg.preload = "metadata"; 
                    videoBg.src = fullVideoUrl;
                    videoBg.load(); 
                } else if (currentBgMode === 'color') {
                    videoBg.removeAttribute('src');
                    videoBg.load();
                }
            
                audio.play().catch(() => {});
                isPlaying = true;
                
                document.getElementById('sw-video').classList.toggle('disabled', fullVideoUrl === '#');
                document.getElementById('btn-watch-video').style.display = (fullVideoUrl === '#') ? 'none' : 'block';
                updateBgVisual();
            }

            updatePlayBtn();
            renderPlaylist();
            updateFavButton();
        }

        function nextTrack() {
            const list = playingTracks.length > 0 ? playingTracks : tracks;
            if (isShuffle) {
                if (shuffleQueue.length === 0) {
                    shuffleQueue = Array.from({
                        length: list.length
                    }, (_, i) => i).filter(i => i !== playingIdx);
                    shuffleQueue.sort(() => Math.random() - 0.5);
                }
                playingIdx = shuffleQueue.pop();
            } else {
                playingIdx = (playingIdx + 1) % list.length;
            }

            const tempTracks = tracks;
            tracks = list;
   
            const originalRender = renderPlaylist;
            renderPlaylist = () => {}; 
   
            loadTrack(playingIdx, true);
            
            renderPlaylist = originalRender;
            tracks = tempTracks;
        }

        function prevTrack() {
            const list = playingTracks.length > 0 ? playingTracks : tracks;
        
            playingIdx = (playingIdx - 1 + list.length) % list.length;
            
            const tempTracks = tracks;
            tracks = list;

            const originalRender = renderPlaylist;
            renderPlaylist = () => {}; 
		   
            loadTrack(playingIdx, true);
		
            renderPlaylist = originalRender;
            tracks = tempTracks;
        } 

        function setBgMode(mode) {
            const t = currentPlayingTrackData;
            if (mode === 'video' && (!t.video || t.video === '#')) {
                showToast("Для данного трека видео отсутствует");
                return;
            }
            currentBgMode = mode;
            updateBgVisual();
        }

        function updateBgVisual() {
		    const t = currentPlayingTrackData; 
		    if (!t) return;
            
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
                videoBg.removeAttribute('src');
            }
        }

function syncMediaUI(playing) {
    const t = currentPlayingTrackData;
    if (!t || !t.name || !audio.getAttribute('src')) return;

    const fullIcon = BASE_URL + t.icon;
    const fullMusic = BASE_URL + t.music;
    
    window.parent.postMessage({
        type: 'PLAYER_STATE', 
        isPlaying: playing,
        folderId: playingFolderId,
        name: t.name,
        autor: t.autor,
        img: fullIcon,
        music: fullMusic
    }, '*');
}

        function openFullVideo() {
   		 const t = currentPlayingTrackData;
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
                
                if (typeof checkTrackNameLength === 'function') {
                    setTimeout(checkTrackNameLength, 150);
                }
                
                if (typeof calculateCustomDelay === 'function') {
                    setTimeout(calculateCustomDelay, 200);
                }
                
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
        document.getElementById('back-to-list').onclick = () => {
            if (currentFolderId !== playingFolderId) {
                currentFolderId = playingFolderId;
                tracks = [...playingTracks]; 
                sessionStorage.setItem('opened_folder_id', currentFolderId);
            }
            toggleScreen('list');
            renderPlaylist();
        };

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
            const track = currentPlayingTrackData;
            if (!track) return;
            window.parent.postMessage({
                type: 'TOGGLE_FAVORITE',
                track: track
            }, '*');
            const isNowFav = !currentFavorites.some(f => f.music === track.music);
            showToast(isNowFav ? "Добавлено в избранное" : "Удалено из избранного");
        };

        function updateFavButton() {
            const track = currentPlayingTrackData;
            if (!track) return;
            const isFav = currentFavorites.some(f => f.music === track.music);
            document.getElementById('btn-fav').classList.toggle('active', isFav);
        }

        audio.onwaiting = () => loader.style.display = 'block';
        audio.oncanplay = () => loader.style.display = 'none';

audio.onplaying = () => {
    isPlaying = true;
    updatePlayBtn();
    renderPlaylist();
    if (currentBgMode === 'video') videoBg.play().catch(() => {});
    syncMediaUI(true);
};

audio.onpause = () => {
    isPlaying = false;
    updatePlayBtn();
    renderPlaylist();
    videoBg.pause();
    syncMediaUI(false); 
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

                let videoPos = 0;

                if (currentDelayMode === 'custom' && isFirstVideoCycleDone) {
                    videoPos = audio.currentTime % videoBg.duration;
                } 
                
                else if (currentDelayMode === 'custom' && customStartTime > 0) {
                    const firstCycleEndTime = customStartTime;

                    if (audio.currentTime >= firstCycleEndTime) {
                        isFirstVideoCycleDone = true;
                        videoPos = audio.currentTime % videoBg.duration;
                    } 
                    
                    else if (audio.currentTime < customStartTime) {
                        videoPos = (videoBg.duration - customStartTime) + audio.currentTime;
                    } 
                    else {
                        videoPos = audio.currentTime - customStartTime;
                    }
                } else {
                    videoPos = audio.currentTime % videoBg.duration;
                }

				if (currentDelayMode === 'custom' && isFirstVideoCycleDone) {
                    const firstCycleEndTime = customStartTime;
                    
                    if (audio.currentTime < firstCycleEndTime) {
                        isFirstVideoCycleDone = false; 
                    }
                }
                
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
                sessionStorage.setItem('opened_folder_id', "FAVORITES_MODE");
                
                renderPlaylist();
                toggleScreen('list');
                
                if (playingFolderId === "FAVORITES_MODE" && currentPlayingTrackData) {
                    const foundIdx = tracks.findIndex(t => t.music === currentPlayingTrackData.music);
                    if (foundIdx !== -1) playingIdx = foundIdx;
                }
            }
            
			if (e.data.type === 'SELECT_TRACK_BY_INDEX') {
			    const idx = e.data.index;
			    if (tracks[idx]) {
	       		 playingTracks = [...tracks];
			        playingIdx = idx;
			        playingFolderId = currentFolderId;
			        sessionStorage.setItem('playing_folder_id', playingFolderId);
			        
			        loadTrack(playingIdx, e.data.autoPlay || false); 
			        toggleScreen('player'); 
			    }
			}

            if (e.data.type === 'SYNC_FAVORITES') {
                currentFavorites = e.data.favorites;
                if (currentFolderId === "FAVORITES_MODE") {
                    tracks = e.data.favorites;
                    renderPlaylist();
                }
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
            
            if (e.data.type === 'OPEN_CURRENT') {
                if (currentFolderId !== playingFolderId) {
                    currentFolderId = playingFolderId;
                    tracks = [...playingTracks];
                    sessionStorage.setItem('opened_folder_id', currentFolderId);
                    renderPlaylist();
                }
                toggleScreen('player');
            }

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
            window.parent.postMessage({
                type: 'CLOSE_PLAYER',
                currentFolderId: currentFolderId
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

function copyTrackLink() {
const playingFolder = sessionStorage.getItem('playing_folder_id') || currentFolderId;

const folderId = playingFolder.includes('/') 
    ? playingFolder.split('/').slice(-2, -1)[0] 
    : playingFolder;    
    
    const trackPos = playingIdx + 1;
    const shareUrl = `https://redyq.github.io/RQ.online/amusic?${folderId}_${trackPos}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast("Ссылка скопирована!");
        }).catch(() => {
            showToast("Ошибка");
        });
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast("Ссылка скопирована!");
        } catch (err) {
            showToast("Ошибка");
        }
        document.body.removeChild(textArea);
    }
}
       
function handleVideoError(event) {
	const videoElement = event.target;
    const err = videoElement.error;
    
    if (!videoElement.src || 
        videoElement.src === window.location.href || 
        videoElement.src.endsWith('.html') || 
        videoElement.src.endsWith('/') || 
        videoElement.src === "" ||
        videoElement.getAttribute('src') === "") {
        return;
    }

    if (!err) return;

    if (err.code === 4 && (!videoElement.getAttribute('src') || videoElement.getAttribute('src') === '#')) {
        return;
    }
    
    const videoSrc = event.target.src;
    
    showToast("Видео недоступно (MEDIA DECODE / 404)");
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
//*

let marqueeAnimations = {};

function checkTrackNameLength() {
    const trackInfo = document.querySelector('.track-info');
    const parentWidth = trackInfo ? trackInfo.clientWidth : 0;

    const elements = [
        document.getElementById('track-name'),
        document.getElementById('track-author')
    ];

    elements.forEach(el => {
        if (!el) return;
        if (marqueeAnimations[el.id]) {
            marqueeAnimations[el.id].cancel();
            marqueeAnimations[el.id] = null;
        }

        el.classList.remove('align-left');
        el.style.transform = 'translate3d(0, 0, 0)';
        el.classList.add('align-left');
        void el.offsetWidth; 
        const textWidth = el.offsetWidth;

        if (textWidth > parentWidth) {
            const distance = -(textWidth - parentWidth); 
            const pixelsPerSecond = 30; 
            const moveTimeSeconds = Math.abs(distance) / pixelsPerSecond;
            const startPause = 2.0; 
            const endPause = 2.0;  
            const totalTime = (startPause + moveTimeSeconds + endPause + moveTimeSeconds) * 1000;
            const p1 = startPause * 1000 / totalTime;
            const p2 = (startPause + moveTimeSeconds) * 1000 / totalTime;
            const p3 = (startPause + moveTimeSeconds + endPause) * 1000 / totalTime;

            marqueeAnimations[el.id] = el.animate([
                { transform: 'translate3d(0, 0, 0)', offset: 0 },
                { transform: 'translate3d(0, 0, 0)', offset: p1 },
                { transform: `translate3d(${distance}px, 0, 0)`, offset: p2 },
                { transform: `translate3d(${distance}px, 0, 0)`, offset: p3 },
                { transform: 'translate3d(0, 0, 0)', offset: 1.0 }
            ], {
                duration: totalTime,
                iterations: Infinity,
                easing: 'linear'
            });

        } else {
            el.classList.remove('align-left');
        }
    });
}

window.addEventListener('DOMContentLoaded', checkTrackNameLength);
window.addEventListener('resize', () => {
    setTimeout(checkTrackNameLength, 150);
});

//#
//#

function setDelayMode(mode) {
    currentDelayMode = mode;
    document.getElementById('sw-delay-auto').classList.toggle('active', mode === 'auto');
    document.getElementById('sw-delay-custom').classList.toggle('active', mode === 'custom');
    
    calculateCustomDelay();
}

function calculateCustomDelay() {
    const t = currentPlayingTrackData;
    if (!t || t.video === '#' || !videoBg.duration) return;

    const hasTimestamp = t.video.includes('?');
    document.getElementById('delay-mode-section').style.display = hasTimestamp ? 'block' : 'none';

    if (!hasTimestamp || currentDelayMode === 'auto') {
        customStartTime = 0;
        return;
    }

    const parts = t.video.split('?');
    const timeMatch = parts[1].match(/^(\d+)-(\d+(?:\.\d+)?)$/);

    if (timeMatch) {
        const minutes = parseInt(timeMatch[1], 10);
        const seconds = parseFloat(timeMatch[2]);
        
        customStartTime = (minutes * 60) + seconds; 
    }
}
