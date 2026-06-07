document.getElementById('current-year').textContent = new Date().getFullYear();

const JSON_MAIN  = 'https://raw.githubusercontent.com/REDYQ/Anime_NEWS/refs/heads/main/file/data.json';
const GIT_BASE   = 'https://raw.githubusercontent.com/REDYQ/Anime_NEWS/refs/heads/main/file/data_id/';
const GIT_COVER  = 'https://raw.githubusercontent.com/REDYQ/Anime_NEWS/refs/heads/main/file/icon/cover/';
const GIT_ASSET  = 'https://raw.githubusercontent.com/REDYQ/Anime_NEWS/refs/heads/main/file/icon/asset/';
const VIDEO_SERVER = 'https://github.com/RQ-S1/am1/releases/download/NEWS/';

let ALL_ANIME_DATA = [];
let currentSearchQuery = '';
let activeVideos = [];
let lastScrollPosition = 0;

const searchInput = document.getElementById('search-input');

async function loadFolders() {
    const mainContainer = document.getElementById('anime-list-container');
    if (!mainContainer) return;

    mainContainer.innerHTML = '<div class="loading-text" style="padding:20px; text-align:center; color:#888;">Загрузка новостей...</div>';
    
    try {
        const res = await fetch(JSON_MAIN);
        if (!res.ok) throw new Error('Сетевая ошибка при загрузке данных');
        
        const data = await res.json();
        ALL_ANIME_DATA = Array.isArray(data) ? data : [];
        
        renderMainList(ALL_ANIME_DATA);
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchQuery = e.target.value.trim().toLowerCase();
                filterAndRenderMainList();
            });
        }
    } catch (e) {
        console.error(e);
        mainContainer.innerHTML = `<div class="error-text" style="color:#F44336; text-align:center; padding:20px;">Ошибка загрузки данных</div>`;
    }
}

function filterAndRenderMainList() {
    if (!ALL_ANIME_DATA) return;

    const filtered = currentSearchQuery === '' 
        ? ALL_ANIME_DATA 
        : ALL_ANIME_DATA.filter(item => item.name && item.name.toLowerCase().includes(currentSearchQuery));

    renderMainList(filtered);
}

function registerVideoControl(videoElement) {
    if (!videoElement) return;
    
    if (!activeVideos.includes(videoElement)) {
        activeVideos.push(videoElement);
    }

    videoElement.addEventListener('play', () => {
        activeVideos.forEach(vid => {
            if (vid !== videoElement && !vid.paused) {
                vid.pause();
            }
        });
    });
}

loadFolders();

function renderMainList(data) {
    const container = document.getElementById('anime-list-container');
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = '<div class="empty-text" style="text-align:center; padding:20px; color:#666;">Ничего не найдено</div>';
        return;
    }

    container.innerHTML = '';

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.setAttribute('onclick', `openAnimeNews('${item.id}', '${item.name}')`);

        const mediaContainerId = `media-preview-${item.id}`;

        card.innerHTML = `
            <div class="card-media-box" id="${mediaContainerId}">
            </div>
            <div class="card-content">
                <b class="card-title">${item.name}</b>
            </div>
        `;

        container.appendChild(card);
        loadMediaPreview(item.id, mediaContainerId);
    });
}

function loadMediaPreview(id, containerId) {
    const box = document.getElementById(containerId);
    if (!box) return;

	const videoUrl = `${VIDEO_SERVER}${id}.mp4`;
    const imageUrl = `${GIT_COVER}${id}.jpg`;
    const galleryFirstUrl = `${GIT_COVER}${id}_1.jpg`;

    const video = document.createElement('video');
    video.src = videoUrl;
    video.autoplay = true;
    video.loop = true;
    video.controls = true;
    video.setAttribute('playsinline', '');
    registerVideoControl(video);

    video.oncanplay = () => {
        box.innerHTML = '';
        box.appendChild(video);
    };

    video.onerror = () => {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.className = 'card-image';

        img.onload = () => {
            box.innerHTML = '';
            box.appendChild(img);
        };

        img.onerror = () => {
            const galleryImg = document.createElement('img');
            galleryImg.src = galleryFirstUrl;
            galleryImg.className = 'card-image';

            galleryImg.onload = () => {
                initGalleryMode(id, box, 1);
            };

            galleryImg.onerror = () => {
                box.style.display = 'none';
                const parentCard = box.closest('.anime-card');
                if (parentCard) parentCard.classList.add('no-media');
            };
        };
    };
}

function initGalleryMode(id, box, currentIdx) {
	document.querySelectorAll('.card-media-box.expanded').forEach(openBox => {
        if (openBox !== box) openBox.classList.remove('expanded');
    });

    box.innerHTML = '';
    box.classList.add('expanded');

const getGalleryUrl = (idx, ext) => ext === 'mp4' 
    ? `${VIDEO_SERVER}cover/${id}_${idx}.${ext}` 
    : `${GIT_COVER}${id}_${idx}.${ext}`;

    const mediaContainer = document.createElement('div');
    mediaContainer.style.width = '100%';
    mediaContainer.style.height = '100%';
    box.appendChild(mediaContainer);

    const tryLoadSlide = (idx) => {
        mediaContainer.innerHTML = '';
        
        const video = document.createElement('video');
        video.src = getGalleryUrl(idx, 'mp4');
        video.autoplay = true;
        video.loop = true;
        video.controls = true;
        video.setAttribute('playsinline', '');
        registerVideoControl(video);

        video.oncanplay = () => {
            mediaContainer.appendChild(video);
            updateGalleryButtons(idx);
        };

        video.onerror = () => {
            const img = document.createElement('img');
            img.src = getGalleryUrl(idx, 'jpg');
            img.className = 'card-image';
            img.onload = () => {
                mediaContainer.appendChild(img);
                updateGalleryButtons(idx);
            };
            img.onerror = () => {
                mediaContainer.innerHTML = '<div style="color:#555; text-align:center; padding-top:20%;">Ошибка медиа</div>';
            };
        };
    };

    const updateGalleryButtons = (idx) => {
        const oldControls = box.querySelector('.gallery-controls');
        if (oldControls) oldControls.remove();

        const controls = document.createElement('div');
        controls.className = 'gallery-controls';
		controls.onclick = (e) => e.stopPropagation(); 

        const btnPrev = document.createElement('button');
        btnPrev.className = 'gallery-btn prev-btn';
        btnPrev.innerText = '‹';
        if (idx === 1) btnPrev.disabled = true;
        btnPrev.onclick = (e) => { e.stopPropagation(); tryLoadSlide(idx - 1); };

        const btnNext = document.createElement('button');
        btnNext.className = 'gallery-btn next-btn';
        btnNext.innerText = '›';

		btnNext.disabled = true;
		
		fetch(getGalleryUrl(idx + 1, 'mp4'), { method: 'HEAD' })
		    .then(res => {
		        if (res.ok) {
		            btnNext.disabled = false;
		        } else {
		            return fetch(getGalleryUrl(idx + 1, 'jpg'), { method: 'HEAD' });
		        }
		    })
		    .then(res => {
		        if (res && res.ok) btnNext.disabled = false;
		    })
		    .catch(() => {
		        btnNext.disabled = true;
		    });

        controls.appendChild(btnPrev);
        controls.appendChild(btnNext);
        box.appendChild(controls);
    };

    tryLoadSlide(currentIdx);
}

function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
}

function toggleScreens(showSubScreen) {
    const mainScreen = document.getElementById('main-screen');
    const subScreen = document.getElementById('sub-screen');

	activeVideos.forEach(vid => {
        if (!vid.paused) vid.pause();
    });
    
    if (showSubScreen) {
        if (mainScreen) mainScreen.style.display = 'none';
        if (subScreen) subScreen.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'instant'});
    } else {
        if (mainScreen) mainScreen.style.display = 'block';
        if (subScreen) subScreen.style.display = 'none';
        
        window.scrollTo({ top: lastScrollPosition, behavior: 'instant' });
        
        if (searchInput) searchInput.value = '';
        currentSearchQuery = '';
    }
}

async function openAnimeNews(id, animeName) {
	lastScrollPosition = window.scrollY;
	
    const newsContainer = document.getElementById('news-list-container');
    const folderTitle = document.getElementById('folder-title');
    
    if (!newsContainer) return;

    if (folderTitle) {
        folderTitle.textContent = `Folder ${id} | ${animeName}`;
    }

    newsContainer.innerHTML = '<div class="loading-text" style="text-align:center; padding:20px; color:#888;">Загрузка новостей тайтла...</div>';
    toggleScreens(true);

    try {
        const fileUrl = `${GIT_BASE}${id}.json`;
        const res = await fetch(fileUrl);
        
        if (!res.ok) throw new Error('Ошибка сети при получении новостей');
        
        const newsData = await res.json();
        renderNewsList(id, Array.isArray(newsData) ? newsData : []);
    } catch (e) {
        console.error(e);
        newsContainer.innerHTML = `<div class="error-text" style="color:#F44336; text-align:center; padding:20px;">Не удалось загрузить новости для этой папки.</div>`;
    }
}

function renderNewsList(folderId, newsItems) {
    const container = document.getElementById('news-list-container');
    if (!container) return;

    if (newsItems.length === 0) {
        container.innerHTML = '<div class="empty-text" style="text-align:center; padding:20px; color:#666;">В этой папке пока нет новостей.</div>';
        return;
    }

    container.innerHTML = '';

    newsItems.forEach((news) => {
        const card = document.createElement('div');
        card.className = 'news-card';

        const parsed = parseNewsInfo(news.info);
        const mediaContainerId = `news-media-${folderId}-${news.id}`;

        card.innerHTML = `
            <div class="news-date">${news.publication_date || 'Дата не указана'}</div>
            <div class="news-media-box" id="${mediaContainerId}">
            </div>
            <div class="news-text-box">
                <p class="news-description">${parsed.cleanText}</p>
            </div>
        `;

        container.appendChild(card);

        const mediaBox = document.getElementById(mediaContainerId);
        if (mediaBox) {
            if (parsed.hasMedia) {
                const mediaUrl = `${GIT_ASSET}${folderId}/${parsed.mediaFile}`;

                if (parsed.mediaType === 'video') {
                    const video = document.createElement('video');
                    video.src = `${VIDEO_SERVER}${folderId}-${parsed.mediaFile}`;
                    video.muted = true;
                    video.autoplay = false;
                    video.controls = true;
                    video.setAttribute('playsinline', '');

                    registerVideoControl(video);
                    mediaBox.appendChild(video);
                } else if (parsed.mediaType === 'image') {
                    const img = document.createElement('img');
                    img.src = mediaUrl;
                    img.className = 'news-image';
                    
                    img.onerror = () => {
                        mediaBox.style.display = 'none';
                    };
                    mediaBox.appendChild(img);
                }
            } else {
                mediaBox.style.display = 'none';
            }
        }
    });
}

function parseNewsInfo(infoString) {
    const result = {
        hasMedia: false,
        mediaFile: '',
        mediaType: '',
        cleanText: infoString || ''
    };

    if (!infoString) return result;

    const mediaRegex = /^#(video|image)-([^#\s]+)#/;
    const match = infoString.trim().match(mediaRegex);

    if (match) {
        result.hasMedia = true;
        result.mediaType = match[1];
        result.mediaFile = match[2];
        
        result.cleanText = infoString.replace(mediaRegex, '').trim();
    }

    return result;
}

document.addEventListener('DOMContentLoaded', () => {
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            toggleScreens(false);
        });
    }
});