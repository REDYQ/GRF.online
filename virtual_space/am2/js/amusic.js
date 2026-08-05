const MAIN_JSON_URL = 'https://raw.githubusercontent.com/REDYQ/Anime_Music/refs/heads/main/file/data.json';
const BASE_URL = 'https://raw.githubusercontent.com/REDYQ/Anime_Music/refs/heads/main/file/';

let originalTracks = [];
let currentTracks = [];

let playingIdx = -1;

let isPlaying = false;
let isShuffle = false;
let loopMode = 0;
let currentBgMode = 'custom';

let savedTrackVideoVersions = {}; 

let uiVisibilityConfig = {
	source: true,
	name: true,
	author: true,
	versions: true,
	controls: true
};

const audioCore = document.getElementById('audio-core');
const bgVideo = document.getElementById('bg-video');
const mainPlayIcon = document.getElementById('main-play-icon');
const miniPlayIconSvg = document.getElementById('mini-play-icon-svg');

const SVG_ICONS = {
	play: '<path d="M8 5v14l11-7z" />',
	pause: '<path d="M6 19h4V5H6zm8-14v14h4V5h-4z" />',
	shOrd: '<path d="M20 9l-4 4V10H4V8h12V5l4 4zm-4 8V14H4v2h12v3l4-4-4-4z"/>',
	shRan: '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.59 10.83l-1.41 1.41 3.13 3.13L14.5 22H20v-5.5l-2.04 2.04-3.37-3.37z"/>',
	loopOff: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>',
	loopOne: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>',
	loopAll: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>'
};

const formatTime = (seconds) => {
	if (isNaN(seconds)) return "0:00";
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const showToast = (message) => {
	let toast = document.getElementById('toast');
	if (!toast) {
		toast = document.createElement('div');
		toast.id = 'toast';
		document.body.appendChild(toast);
	}
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => {
		toast.classList.remove('show');
	}, 1500);
};

const closeDropdowns = () => {
	const eyeMenu = document.getElementById('eye-menu');
	const overlay = document.getElementById('ui-overlay');
	if (eyeMenu) eyeMenu.classList.remove('active');
	if (overlay) overlay.style.display = 'none';
};

async function initApp() {
	const listContainer = document.getElementById('tracks-html-list');
	listContainer.innerHTML = '<div style="padding: 30px; text-align: center; opacity: 0.5; font-size: 18px;">Загрузка медиатеки...<br>Это может занять какое-то время</div>';

	try {
		const response = await fetch(MAIN_JSON_URL);
		const folders = await response.json();
		let loadedTracks = [];
		const repoRootUrl = MAIN_JSON_URL.replace('data.json', '');
		for (const folder of folders) {
			try {
				const folderJsonUrl = repoRootUrl + folder.data;
				const folderResponse = await fetch(folderJsonUrl);
				const folderTracks = await folderResponse.json();
				const preparedTracks = folderTracks.map(track => ({
					...track,
					folderIcon: folder.icon,
					folderId: folder.number
				}));

				loadedTracks = loadedTracks.concat(preparedTracks);
			} catch (err) {
				console.error(`Не удалось прогрузить JSON-файл для папки: ${folder.name}. Ссылка: ${folderJsonUrl}. Детали:`, err);
			}
		}

		if (loadedTracks.length === 0) throw new Error("Список треков пуст");

		originalTracks = [...loadedTracks];
		currentTracks = [...loadedTracks];

		updateSystemIcons();
		renderPlaylist();
		document.getElementById('tracks-counter').innerText = `0 / ${currentTracks.length}`;

	} catch (error) {
		console.error("Критическая ошибка инициализации AMusic v2:", error);
		listContainer.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--accent);">Ошибка загрузки медиатеки.</div>';
	}
}

function renderPlaylist() {
	const listContainer = document.getElementById('tracks-html-list');
	let html = '';
	let lastSource = null;

	if (isShuffle) {
		listContainer.classList.add('shuffle-active');
	} else {
		listContainer.classList.remove('shuffle-active');
	}

	currentTracks.forEach((track, index) => {
		if (!isShuffle && track.source && track.source !== lastSource) {
			html += `<div class="group-header">${track.source}</div>`;
			lastSource = track.source;
		}

		const isCurrent = (playingIdx !== -1) && (originalTracks[playingIdx].music === track.music);
		const activeClass = isCurrent ? 'active' : '';
		const playingClass = (isCurrent && isPlaying) ? 'playing' : '';

		const trackIconPath = track.icon ? track.icon : track.folderIcon;
		const fullIconUrl = BASE_URL + trackIconPath;
		const fullMusicUrl = BASE_URL + track.music;

		html += `
			<div class="track-item ${activeClass} ${playingClass}" id="track-row-${index}" onclick="selectTrack(${index})" data-src="${fullMusicUrl}">
				<div class="track-pos-num">${index + 1}</div>
				<div class="bars-wrapper">
					<div class="playing-bars">
						<div class="bar"></div>
						<div class="bar"></div>
						<div class="bar"></div>
					</div>
				</div>
				<img src="${fullIconUrl}" class="item-icon" loading="lazy">
				<div class="item-info">
					<b>${track.name}</b>
					<small>${track.autor}</small>
				</div>
			</div>
		`;
	});

	listContainer.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', initApp);

function selectTrack(index) {
	const track = currentTracks[index];
	if (!track) return;
	const originalIndex = originalTracks.findIndex(t => t.music === track.music);
	
	if (playingIdx === originalIndex && playingIdx !== -1) {
		document.getElementById('player-section').scrollIntoView({ behavior: 'smooth' });
		return;
	}

	playingIdx = originalIndex;
	loadTrack(playingIdx, true);
	document.getElementById('player-section').scrollIntoView({ behavior: 'smooth' });
}

function loadTrack(idx, shouldPlay) {
	const track = originalTracks[idx];
	if (!track) return;

	const fullMusicUrl = BASE_URL + track.music;
	const fullIconUrl = BASE_URL + (track.icon || track.folderIcon);

	audioCore.src = fullMusicUrl;

	document.getElementById('player-name').innerText = track.name;
	document.getElementById('player-author').innerText = track.autor;
	const epLabel = track.episode ? ` (Episode: ${track.episode})` : '';
	const typeLabel = track.type ? ` | ${track.type}` : '';
	document.getElementById('player-source').innerText = `${track.source || 'ANIME'}${epLabel}${typeLabel}`;
	document.getElementById('mini-player-name').innerText = `${track.name} — ${track.autor}`;

	let volValue = parseInt(track.volume_master);
	audioCore.volume = (volValue === 0) ? 1.0 : (Math.max(0.01, (volValue || 100) / 100));

	const img = new Image();
	img.crossOrigin = "anonymous";
	img.src = fullIconUrl;
	img.onload = () => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		canvas.width = 1; 
		canvas.height = 1; 
		ctx.drawImage(img, 0, 0, 1, 1);
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		
		if (r > 215 && g > 215 && b > 215) {
			document.documentElement.style.setProperty('--bg-dynamic', 'var(--accent)');
		} else {
			document.documentElement.style.setProperty('--bg-dynamic', `rgb(${r},${g},${b})`);
		}
	};

	buildVideoVersionsPanel(track);

	if (shouldPlay) {
		startBgVideoForTrack(track);
		audioCore.play().catch(err => console.log("Автовоспроизведение заблокировано браузером, ожидается жест:", err));
		isPlaying = true;
	}

	updatePlayButtonsUI();
	renderPlaylist();
	updateCounterUI();
	syncMediaSession(track);
}

function togglePlay() {
	if (playingIdx === -1) {
		if (currentTracks.length > 0) selectTrack(0);
		return;
	}

	if (isPlaying) {
		audioCore.pause();
		if (bgVideo.src) bgVideo.pause();
		isPlaying = false;
	} else {
		audioCore.play().catch(() => {});
		if (bgVideo.src && currentBgMode === 'auto') bgVideo.play().catch(() => {});
		if (bgVideo.src && currentBgMode === 'custom') {
			triggerCustomBgSync();
		}
		isPlaying = true;
	}

	updatePlayButtonsUI();
	renderPlaylist();
}

function updatePlayButtonsUI() {
	const currentIcon = isPlaying ? SVG_ICONS.pause : SVG_ICONS.play;
	mainPlayIcon.innerHTML = currentIcon;
	mainPlayIcon.style.marginLeft = isPlaying ? "0px" : "2px";
	miniPlayIconSvg.innerHTML = currentIcon;
	miniPlayIconSvg.style.marginLeft = isPlaying ? "0px" : "1px";
}

function updateCounterUI() {
	if (playingIdx === -1) return;
	const currentTrack = originalTracks[playingIdx];
	const visualIndex = currentTracks.findIndex(t => t.music === currentTrack.music);
	
	if (visualIndex !== -1) {
		document.getElementById('tracks-counter').innerText = `${visualIndex + 1} / ${currentTracks.length}`;
	}
}

function toggleShuffle() {
	const shuffleBtn = document.getElementById('shuffle-btn');
	isShuffle = !isShuffle;

	if (isShuffle) {
		shuffleBtn.classList.add('active-shuffle');
		showToast("Случайный порядок");

		for (let i = currentTracks.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[currentTracks[i], currentTracks[j]] = [currentTracks[j], currentTracks[i]];
		}
	} else {
		shuffleBtn.classList.remove('active-shuffle');
		showToast("Порядок по умолчанию");
		
		const searchVal = document.getElementById('search-input').value.toLowerCase().trim();
		if (searchVal) {
			currentTracks = originalTracks.filter(t => 
				t.name.toLowerCase().includes(searchVal) || 
				(t.source && t.source.toLowerCase().includes(searchVal)) ||
				t.autor.toLowerCase().includes(searchVal)
			);
		} else {
			currentTracks = [...originalTracks];
		}
	}

	updateSystemIcons();
	renderPlaylist();
	updateCounterUI();
}

function toggleLoopMode() {
	loopMode = (loopMode + 1) % 3;
	audioCore.loop = (loopMode === 1);

	if (loopMode === 0) showToast("Повтор выключен");
	if (loopMode === 1) showToast("Повтор текущей композиции");
	if (loopMode === 2) showToast("Повтор всего списка");

	updateSystemIcons();
}

function handleSearch() {
	const val = document.getElementById('search-input').value.toLowerCase().trim();
	currentTracks = originalTracks.filter(track => {
		const nameMatch = track.name.toLowerCase().includes(val);
		const authorMatch = track.autor.toLowerCase().includes(val);
		const sourceMatch = track.source ? track.source.toLowerCase().includes(val) : false;
		return nameMatch || authorMatch || sourceMatch;
	});

	if (isShuffle) {
		for (let i = currentTracks.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[currentTracks[i], currentTracks[j]] = [currentTracks[j], currentTracks[i]];
		}
	}

	renderPlaylist();
	updateCounterUI();
}

function toggleEyeMenu(event) {
	if (event) event.stopPropagation();
	const eyeMenu = document.getElementById('eye-menu');
	const overlay = document.getElementById('ui-overlay');

	const isActive = eyeMenu.classList.toggle('active');
	overlay.style.display = isActive ? 'block' : 'none';
}

function updateVisibility() {
	uiVisibilityConfig.source = document.getElementById('chk-source').checked;
	uiVisibilityConfig.name = document.getElementById('chk-name').checked;
	uiVisibilityConfig.author = document.getElementById('chk-author').checked;
	uiVisibilityConfig.versions = document.getElementById('chk-versions').checked;
	uiVisibilityConfig.controls = document.getElementById('chk-controls').checked;

	const sourceNode = document.getElementById('player-source');
	const nameNode = document.getElementById('player-name');
	const authorNode = document.getElementById('player-author');
	const versionsNode = document.getElementById('ui-versions-panel');
	const controlsNode = document.getElementById('ui-controls');

	if (sourceNode) sourceNode.classList.toggle('ui-hidden', !uiVisibilityConfig.source);
	if (nameNode) nameNode.classList.toggle('ui-hidden', !uiVisibilityConfig.name);
	if (authorNode) authorNode.classList.toggle('ui-hidden', !uiVisibilityConfig.author);
	if (versionsNode) versionsNode.classList.toggle('ui-hidden', !uiVisibilityConfig.versions);
	if (controlsNode) controlsNode.classList.toggle('ui-hidden', !uiVisibilityConfig.controls);
}

function updateSystemIcons() {
	const shuffleBtn = document.getElementById('shuffle-btn');
	const shuffleIcon = document.getElementById('shuffle-icon');
	const loopBtn = document.getElementById('loop-btn');
	const loopIcon = document.getElementById('loop-icon');

	if (shuffleIcon) {
		shuffleIcon.innerHTML = isShuffle ? SVG_ICONS.shRan : SVG_ICONS.shOrd;
	}

	if (loopIcon) {
		if (loopMode === 0) {
			loopIcon.innerHTML = SVG_ICONS.loopOff;
			loopBtn.classList.remove('active-loop');
		} else if (loopMode === 1) {
			loopIcon.innerHTML = SVG_ICONS.loopOne;
			loopBtn.classList.add('active-loop');
		} else if (loopMode === 2) {
			loopIcon.innerHTML = SVG_ICONS.loopAll;
			loopBtn.classList.add('active-loop');
		}
	}
}

let globalVideoConfigsCache = null;
async function fetchVideoConfigs() {
	if (globalVideoConfigsCache) return globalVideoConfigsCache;
	
	const VIDEO_CONFIG_URL = BASE_URL + 'video_config.json';
	try {
		const res = await fetch(VIDEO_CONFIG_URL);
		if (!res.ok) throw new Error("Конфигурационный файл видео не найден");
		globalVideoConfigsCache = await res.json();
		return globalVideoConfigsCache;
	} catch (err) {
		console.warn("Файл video_config.json не обнаружен.", err);
		globalVideoConfigsCache = [];
		return globalVideoConfigsCache;
	}
}

async function buildVideoVersionsPanel(track) {
	const container = document.getElementById('versions-container');
	const panelNode = document.getElementById('ui-versions-panel');
	if (!container || !panelNode) return;

	container.innerHTML = '';

	if (!track.video || track.video === '#') {
		panelNode.style.display = 'none';
		return;
	}

	const configs = await fetchVideoConfigs();
	const trackConfig = configs.find(c => c.music_file === track.music);

	if (!trackConfig || !trackConfig.videos_count || trackConfig.videos_count <= 1) {
		panelNode.style.display = 'none';
		return;
	}

	panelNode.style.display = uiVisibilityConfig.versions ? 'block' : 'none';
	const fullMusicKey = track.music;
	const activeVersion = savedTrackVideoVersions[fullMusicKey] || 1;

	for (let i = 1; i <= trackConfig.videos_count; i++) {
		const btn = document.createElement('button');
		btn.className = `v-btn ${i === activeVersion ? 'active' : ''}`;
		btn.innerText = `v${i}`;
		
		btn.onclick = (e) => {
			if (e) e.stopPropagation();
			changeTrackVideoVersion(track, i, trackConfig);
		};

		container.appendChild(btn);
	}
}

function changeTrackVideoVersion(track, selectedVersion, trackConfig) {
	const fullMusicKey = track.music;
	savedTrackVideoVersions[fullMusicKey] = selectedVersion;
	const buttons = document.querySelectorAll('#versions-container .v-btn');
	buttons.forEach((btn, idx) => {
		btn.classList.toggle('active', (idx + 1) === selectedVersion);
	});

	updateMetaFromVideoConfig(track, selectedVersion, trackConfig);
	const generatedVideoUrl = generateVideoUrlByVersion(track.video, selectedVersion);
	
	if (generatedVideoUrl !== '#') {
		bgVideo.src = generatedVideoUrl;
		bgVideo.load();
		
		if (isPlaying) {
			if (currentBgMode === 'auto') bgVideo.play().catch(() => {});
			if (currentBgMode === 'custom') triggerCustomBgSync();
		}
	}
}

function generateVideoUrlByVersion(rawVideoPath, version) {
	if (!rawVideoPath || rawVideoPath === '#') return '#';
	let fullUrl = 'https://github.com/' + rawVideoPath.replace('@', '/releases/download/BG/');

	if (version === 1) {
		return fullUrl;
	}

	if (fullUrl.toLowerCase().endsWith('.mp4')) {
		const basePath = fullUrl.substring(0, fullUrl.length - 4);
		return `${basePath}_${version}.mp4`;
	}

	return fullUrl;
}

function updateMetaFromVideoConfig(track, version, trackConfig) {
	const versionData = trackConfig.versions_meta ? trackConfig.versions_meta[`v${version}`] : null;
	const sourceNode = document.getElementById('player-source');
	const nameNode = document.getElementById('player-name');
	const authorNode = document.getElementById('player-author');

	if (versionData) {
		const episode = versionData.episode || track.episode || 'ANIME';
		const type = versionData.type || track.type || '';
		const typeLabel = type ? ` | ${type}` : '';

		if (sourceNode) sourceNode.innerText = `${track.source || 'ANIME'} (${episode})${typeLabel}`;
	} else {
		const typeLabel = track.type ? ` | ${track.type}` : '';
		if (sourceNode) sourceNode.innerText = `${track.source || 'ANIME'}${typeLabel}`;
	}
}

function nextTrack() {
	if (currentTracks.length === 0) return;

	if (loopMode === 1 && playingIdx !== -1) {
		loadTrack(playingIdx, true);
		return;
	}

	const currentTrack = originalTracks[playingIdx];
	let visualIdx = currentTracks.findIndex(t => t.music === currentTrack.music);

	if (visualIdx !== -1) {
		let nextVisualIdx = visualIdx + 1;
		if (nextVisualIdx >= currentTracks.length) {
			if (loopMode === 2) {
				nextVisualIdx = 0;
			} else {
				audioCore.pause();
				bgVideo.pause();
				isPlaying = false;
				updatePlayButtonsUI();
				renderPlaylist();
				return;
			}
		}
		
		const nextTrackData = currentTracks[nextVisualIdx];
		const origIdx = originalTracks.findIndex(t => t.music === nextTrackData.music);
		playingIdx = origIdx;
		loadTrack(playingIdx, true);
	}
}

function prevTrack() {
	if (currentTracks.length === 0 || playingIdx === -1) return;

	const currentTrack = originalTracks[playingIdx];
	let visualIdx = currentTracks.findIndex(t => t.music === currentTrack.music);

	if (visualIdx !== -1) {
		let prevVisualIdx = visualIdx - 1;
		
		if (prevVisualIdx < 0) {
			prevVisualIdx = currentTracks.length - 1;
		}

		const prevTrackData = currentTracks[prevVisualIdx];
		const origIdx = originalTracks.findIndex(t => t.music === prevTrackData.music);
		playingIdx = origIdx;
		loadTrack(playingIdx, true);
	}
}

/*=====*/
function setBgMode(mode) {
    if (mode === 'auto' || mode === 'custom') {
        currentBgMode = mode;
        
        const bgModeBtn = document.getElementById('bg-mode-btn');
        if (bgModeBtn) {
            bgModeBtn.innerText = `Режим: ${mode === 'auto' ? 'Auto' : 'Custom'}`;
        }
        
        updateBgVisual();
    }
}

function toggleBgMode() {
    const nextMode = (currentBgMode === 'auto') ? 'custom' : 'auto';
    setBgMode(nextMode);
    showToast(`Режим видео-фона: ${nextMode.toUpperCase()}`);
}

function updateBgVisual() {
    if (!bgVideo.src || isNaN(audioCore.duration) || isNaN(bgVideo.duration) || bgVideo.duration === 0) {
        return;
    }

    if (currentBgMode === 'auto') {
        const targetTime = audioCore.currentTime % bgVideo.duration;
        if (Math.abs(bgVideo.currentTime - targetTime) > 0.5) {
            bgVideo.currentTime = targetTime;
        }
    } else if (currentBgMode === 'custom') {
        const remainder = audioCore.duration % bgVideo.duration;
        const startOffset = bgVideo.duration - remainder;
        const expectedVideoTime = (audioCore.currentTime + startOffset) % bgVideo.duration;

        if (Math.abs(bgVideo.currentTime - expectedVideoTime) > 0.6) {
            bgVideo.currentTime = expectedVideoTime;
        }
    }

    if (isPlaying && !audioCore.paused) {
        if (bgVideo.paused) bgVideo.play().catch(() => {});
    } else {
        if (!bgVideo.paused) bgVideo.pause();
    }
}

function startBgVideoForTrack(track) {
    const selectedVersion = savedTrackVideoVersions[track.music] || 1;
    const fullVideoUrl = generateVideoUrlByVersion(track.video, selectedVersion);

    if (fullVideoUrl === '#') {
        bgVideo.removeAttribute('src');
        bgVideo.style.opacity = 0;
        bgVideo.load();
        return;
    }

    bgVideo.loop = true; 
    bgVideo.muted = true;
    bgVideo.src = fullVideoUrl;
    bgVideo.style.opacity = 1;
    bgVideo.load();

    bgVideo.onloadedmetadata = () => {
        updateBgVisual();
    };
}

audioCore.ontimeupdate = () => {
    if (isNaN(audioCore.duration)) return;

    const progressPercent = (audioCore.currentTime / audioCore.duration) * 100;
    const bottomProgress = document.getElementById('bottom-progress');
    if (bottomProgress) bottomProgress.style.width = progressPercent + '%';

    const miniProgressBar = document.getElementById('mini-progress-bar');
    if (miniProgressBar) miniProgressBar.style.width = progressPercent + '%';

    const timeTextNode = document.getElementById('mini-player-time');
    if (timeTextNode) {
        timeTextNode.innerText = `${formatTime(audioCore.currentTime)} / ${formatTime(audioCore.duration)}`;
    }

    updateBgVisual();
};

audioCore.onplay = () => {
    isPlaying = true;
    updatePlayButtonsUI();
    renderPlaylist();
    updateBgVisual();
};

audioCore.onpause = () => {
    isPlaying = false;
    updatePlayButtonsUI();
    renderPlaylist();
    updateBgVisual();
};

audioCore.onended = () => {
    nextTrack();
};
/**/

function handleProgressBarClick(event) {
	if (!audioCore.duration || playingIdx === -1) return;
	const container = document.getElementById('mini-progress-container');
	const clickX = event.offsetX;
	const width = container.clientWidth;
	const newTime = (clickX / width) * audioCore.duration;
	audioCore.currentTime = newTime;

	if (bgVideo.src && currentBgMode === 'custom') {
		triggerCustomBgSync();
	}
}

function syncMediaSession(track) {
	if ('mediaSession' in navigator) {
		const fullIconUrl = BASE_URL + (track.icon || track.folderIcon);
		
		navigator.mediaSession.metadata = new MediaMetadata({
			title: track.name,
			artist: track.autor,
			album: track.source || "Anime Music",
			artwork: [{ src: fullIconUrl, sizes: '512x512', type: 'image/png' }]
		});

		navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
		navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
		navigator.mediaSession.setActionHandler('play', () => audioCore.play());
		navigator.mediaSession.setActionHandler('pause', () => audioCore.pause());
	}
}

function toggleBgMode() {
	currentBgMode = (currentBgMode === 'auto') ? 'custom' : 'auto';
	document.getElementById('bg-mode-btn').innerText = `Режим: ${currentBgMode === 'auto' ? 'Auto' : 'Custom'}`;
	showToast(`Режим видео-фона: ${currentBgMode.toUpperCase()}`);
	
	if (playingIdx !== -1) {
		startBgVideoForTrack(originalTracks[playingIdx]);
	}
}

function toggleVideoFit() {
	const videoNode = document.getElementById('bg-video');
	if (!videoNode) return;
	
	if (videoNode.style.objectFit === 'contain') {
		videoNode.style.objectFit = 'cover';
		document.getElementById('video-fit-btn').innerText = 'Маштаб: На весь экран';
		showToast("Видео растянуто на весь экран");
	} else {
		videoNode.style.objectFit = 'contain';
		videoNode.style.width = '100%';
		videoNode.style.height = '100%';
		document.getElementById('video-fit-btn').innerText = 'Маштаб: Сохранить пропорции';
		showToast("Сохранены оригинальные пропорции");
	}
}