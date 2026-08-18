document.getElementById('current-year').textContent = new Date().getFullYear();

/*Lock Mode*/
document.documentElement.classList.add('site-locked');

const config_overlay = document.createElement('div');
config_overlay.className = 'site-lock-overlay';
config_overlay.innerHTML = `<div class="site-lock-message" id="lock-text">Загрузка конфигурации...</div>`;

const initLoading = () => {
	if (document.querySelector('.site-lock-overlay')) return;
	(document.body || document.documentElement).appendChild(config_overlay);
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initLoading);
} else {
	initLoading();
}

(async function checkSiteStatus() {
	const CURRENT_SITE_NAME = 'alist'; 
	const url = 'https://raw.githubusercontent.com/REDYQ/RQ.online/refs/heads/main/config.json'; 
	let message = '';
	
	try {
		const response = await fetch(`${url}?t=${Date.now()}`);
		const projects = await response.json();
		const currentProject = projects.find(p => p.name === CURRENT_SITE_NAME);
		
		if (!currentProject) {
		console.warn(`Проект "${CURRENT_SITE_NAME}" не найден. Включена автоблокировка.`);
		message = 'Доступ ограничен\nСайт не зарегистрирован в системе'; 
		} else {
			if (currentProject.status === 0) {
				message = currentProject.lock_info || 'Страница недоступна.';
				
			} else if (currentProject.status === 2) {
				message = currentProject.lock_info || 'Загрузка обновления...';
			}
		}
	} catch (error) {
		console.error('Ошибка проверки статуса:', error);
		message = 'Ошибка безопасности\nНе удалось проверить статус сайта';
	}
			
	if (message) {
		const textElement = document.getElementById('lock-text');
		if (textElement) {
			textElement.innerText = message;
		}
	} else {
		 document.documentElement.classList.remove('site-locked');
		 config_overlay.remove();
	}
})();
//*

function getRelookWord(n) {
	const plural = (n % 10 === 1 && n % 100 !== 11) ? 'раз.' : 
					(n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'раза.' : 'раз.';
	return `${n} ${plural}`;
}

function getNoun(number, one, two, five) {
	let n = Math.abs(number);
	n %= 100;
	if (n >= 5 && n <= 20) return five;
	n %= 10;
	if (n === 1) return one;
	if (n >= 2 && n <= 4) return two;
	return five;
}

let ORIGINAL_DATA = []; 
let DATA_AZ = [];
let DATA_ZA = [];
let currentSortMode = 'default';

let currentFilters = {
	type: [], status: [], voiceover: [], genre: [], 
	category: [], relook: false, studio: []
};

const GENRE_GROUPS = {
	"green": ["драмма", "видеоигры", "исэкай", "комедия", "психологическое", "реинкарнация", "романтика", "спорт", "фантастика", "школа", "экшен"],
	"yellow": ["военное", "гарем", "детектив", "повседневность", "приключение", "сверхъестественное", "триллер", "фэнтези", "этти"],
	"orange": ["вампиры", "исторический", "магия", "меха", "музыка", "супер сила"]
};

const JSON_MAIN = 'https://raw.githubusercontent.com/REDYQ/Anime_List/refs/heads/main/file/data.json'; // AList data
const GIT_BASE = 'https://raw.githubusercontent.com/REDYQ/Anime_List/refs/heads/main/file/data_id/'; // вложенные JSON
const GIT_COVER = 'https://raw.githubusercontent.com/REDYQ/Anime_List/refs/heads/main/file/icon/cover/'; // cover
const GIT_ASSET = 'https://raw.githubusercontent.com/REDYQ/Anime_List/refs/heads/main/file/icon/asset/'; // asset
const HASMUSIC_AMUSIC_ICON_URL = 'https://raw.githubusercontent.com/REDYQ/Anime_List/refs/heads/main/file/icon/system/ic1.jpg'; // has Music

const searchInput = document.getElementById('search-input');
let myListMode = 'titles'; 

let ALL_ANIME_DATA = [];
let SUB_DATA_CACHE = {};

async function loadFolders() {
	const allContainer = document.getElementById('all-list-container');
	allContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #555;">Загрузка...</div>';
	
	try {
		const res = await fetch(JSON_MAIN);
	
/*Sort List*/		
	const data = await res.json();
	ORIGINAL_DATA = [...data];
	DATA_AZ = [...data].sort((a, b) => a.name.localeCompare(b.name, 'en'));
	DATA_ZA = [...DATA_AZ].reverse();	
	
	ALL_ANIME_DATA = ORIGINAL_DATA; 
/*END*/		
		
		await renderList(ALL_ANIME_DATA, 'all-list-container');
		updateMyList();
		
		await syncFullDatabase();
		checkAllMusicStatus();
	} catch (e) {
		allContainer.innerHTML = `<div style="color:red; text-align:center;">Ошибка загрузки</div>`;
	}
}

function waitForIcons() {
	return new Promise((resolve) => {
		const check = () => {
			const icons = document.querySelectorAll('#all-list-container .music-icon');
			if (icons.length > 0) {
				resolve();
			} else {
				requestAnimationFrame(check);
			}
		};
		check();
	});
}

function filterLogic(folder, sub, userItem, isMyList) {
	const filters = currentFilters;

	if (!sub && (filters.type.length > 0 || filters.voiceover.length > 0)) return false; 
	if (!sub) return true; 
	
	if (filters.status.length > 0 && !filters.status.includes(folder.status)) return false;
	
	const isFilteringActive = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v === true);
	if (!isFilteringActive) return true; 

	if (filters.genre.length > 0) {
		const folderGenres = folder.genre.split(', ').map(g => g.trim().toLowerCase());
		if (!filters.genre.some(g => folderGenres.includes(g.toLowerCase()))) return false;
	}

	if (filters.type.length > 0 && !filters.type.includes(sub.type)) return false;

	if (isMyList && filters.category.length > 0) {
		const myData = JSON.parse(localStorage.getItem('my_anime_list') || "[]");
	
	if (filters.category.includes('look_if_1')) {
			if (!userItem || userItem.look_if !== "1") return false;
		}

	if (filters.category.includes('look_if_0')) {
			if (userItem && userItem.look_if !== "") return false;
		}
	
		if (filters.category.includes('can_finish')) {
			const myData = JSON.parse(localStorage.getItem('my_anime_list') || "[]");
			const hasAnyInFolder = myData.some(m => m.id.split('_')[0] === folder.id);
			if (!!userItem || !hasAnyInFolder) return false;
		}
		if (filters.category.includes('relook_only')) {
			if (!userItem || !userItem.relook) return false;
		}		
	}
	
	if (isMyList && filters.voiceover.length > 0 && userItem) {
		const userVoices = userItem.voiceover.split(', ').map(v => v.split('(')[0].trim());
		if (!filters.voiceover.some(v => userVoices.includes(v))) return false;
	}
	return true;
}
		
async function renderList(data, containerId, isMyList = false, userItems = []) {
	window.scrollTo({ top: 0, behavior: 'instant' });
	
	const list = document.getElementById(containerId);
	list.innerHTML = '';

	const rawData = localStorage.getItem('my_anime_list');
	const myItems = rawData ? JSON.parse(rawData) : [];

	if (isMyList) {
		const myItems = JSON.parse(localStorage.getItem('my_anime_list') || "[]");
		
		let visibleFoldersCount = 0;
		let visibleTitlesCount = 0;

		data.forEach(folder => {
			const subData = SUB_DATA_CACHE[folder.id] || [];
			const matchingSubs = subData.filter((sub, index) => {
				const uItem = myItems.find(m => m.id === `${folder.id}_${index + 1}`);
				const isSelected = !!uItem;
				const passesFilter = filterLogic(folder, sub, uItem, isMyList);
				
				if (currentFilters.category.includes('can_finish')) {
					const hasAnyInFolder = myItems.some(m => m.id.split('_')[0] === folder.id);
					return !isSelected && hasAnyInFolder && passesFilter;
				}
				return isSelected && passesFilter;
			});

			if (matchingSubs.length > 0) {
				if (myListMode === 'titles') {
					visibleTitlesCount += matchingSubs.length;
					visibleFoldersCount++;
				} else {
					visibleFoldersCount++;
					visibleTitlesCount += matchingSubs.length;
				}
			}
		});
	
		const ctrl = document.createElement('div');
		ctrl.style = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 10px;";
		
		const countText = myListMode === 'titles' 
			? `${visibleTitlesCount} ${getNoun(visibleTitlesCount, 'тайтл', 'тайтла', 'тайтлов')}` 
			: `${visibleFoldersCount} ${getNoun(visibleFoldersCount, 'папка', 'папки', 'папок')}`;

		ctrl.innerHTML = `
			<div style="font-size: 12px; color: #888; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${countText}</div>
			<div style="display: flex; gap: 20px;">
				<svg onclick="setMyListMode('titles')" style="cursor:pointer; width:22px; fill: ${myListMode === 'titles' ? 'var(--accent)' : '#555'}" viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.68-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
				<svg onclick="setMyListMode('folders')" style="cursor:pointer; width:22px; fill: ${myListMode === 'folders' ? 'var(--accent)' : '#555'}" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
			</div>`;
		list.appendChild(ctrl);
	}

	for (const item of data) {
		const subData = SUB_DATA_CACHE[item.id] || [];
		
		const matchingSubsCount = subData.filter((sub, index) => {
			const currentId = `${item.id}_${index + 1}`;
			const userItem = userItems.find(u => u.id === currentId);
			
			const isSelected = !!userItem;
			const passesFilter = filterLogic(item, sub, userItem, isMyList);
			
			if (isMyList) {
				if (currentFilters.category.includes('can_finish')) {
					const hasAnyInFolder = userItems.some(m => m.id.split('_')[0] === item.id);
					return !isSelected && hasAnyInFolder && passesFilter;
				}
				return isSelected && passesFilter;
			}

			return passesFilter;
		}).length;

		const myMatchingTitles = subData ? subData.filter((sub, index) => {
			const currentId = `${item.id}_${index + 1}`;
			const userItem = userItems.find(u => u.id === currentId);
			
			if (isMyList) {
				if (currentFilters.category.includes('can_finish')) {
					const hasAnyInFolder = userItems.some(m => m.id.split('_')[0] === item.id);
					return !userItem && hasAnyInFolder && filterLogic(item, sub, userItem, true);
				}
				return userItem && filterLogic(item, sub, userItem, true);
			}
			return filterLogic(item, sub, null, false);

		}).length : -1;

		const isSearchActive = searchInput.value.trim() !== "" || Object.values(currentFilters).some(v => Array.isArray(v) ? v.length > 0 : v === true);
		
		if (isSearchActive && myMatchingTitles === 0) continue;

		const isStatusHidden = item.status === "—";
		const wrapper = document.createElement('div');
		wrapper.className = 'anime-wrapper';
		const uniqueId = `${containerId}-${item.id}`;
		
		const isTitles = (isMyList && myListMode === 'titles');

		wrapper.innerHTML = `
		${!isTitles ? `
			 <div class="folder-item" id="folder-${uniqueId}" onclick="toggleFolder(this, '${uniqueId}', '${item.id}')">
				<img src="${GIT_COVER}${item.id}.jpg" class="folder-icon">
				<div class="folder-info">
					<b>${item.name}</b>
					<div class="genre-label">${item.genre}</div>
					${!isStatusHidden ? `<div class="status-label" style="font-size:11px; color:#888;">${item.status}</div>` : ''}
				</div>
				<img src="${HASMUSIC_AMUSIC_ICON_URL}" class="music-icon" id="icon-music-${uniqueId}" onclick="handleMusicClick(event, '${item.id}')">
			</div>` : ''}
			<div class="sub-list" id="list-${uniqueId}"></div>
		`;
		list.appendChild(wrapper);
		
		const subList = wrapper.querySelector('.sub-list');
		fetchSubItems(item.id, subList, userItems, isMyList);

		if (isTitles || (isMyList && matchingSubsCount > 0)) {
			if (isTitles) {
				subList.classList.add('open');
				subList.style.maxHeight = 'none';
				subList.style.marginLeft = '0';
				subList.style.borderLeft = 'none';
			}
		}
		if (containerId === 'all-list-container') {
			checkAllMusicStatus();
		}
	}
}

function updateMyList() {
	const myContainer = document.getElementById('my-list-container');

	if (!ALL_ANIME_DATA || ALL_ANIME_DATA.length === 0) {
		myContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #555;">Загрузка данных...</div>';
		return;
	}

	const rawData = localStorage.getItem('my_anime_list');
	const myIds = rawData ? JSON.parse(rawData) : [];

	if (myIds.length === 0) {
		myContainer.innerHTML = `
			<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; gap: 20px;">
				<div style="color: #555; font-size: 14px;">Ваш список пуст</div>
				<button onclick="triggerImport()" style="background: var(--accent); color: white; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer;">IMPORT</button>
			</div>`;
	} else {
		myIds.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true}));
		
		const filteredData = ALL_ANIME_DATA.filter(folder => myIds.some(u => u.id.split('_')[0] === folder.id));
		renderList(filteredData, 'my-list-container', true, myIds);
	}
}

function switchScreen(screen) {
	window.scrollTo(0, 0);
	
	const allList = document.getElementById('all-list-container');
	const myList = document.getElementById('my-list-container');
	searchInput.value = "";

	currentFilters = { 
		type: [], status: [], voiceover: [], 
		genre: [], category: [], relook: false, studio: [] 
	};

	showToast("Loading...");
	if (overlay) overlay.click();

setTimeout(() => {	
	if (typeof renderDrawerMenu === 'function') {
		renderDrawerMenu(); 
	}
	
	if (screen === 'my') {
		allList.style.display = 'none';
		myList.style.display = 'block';
		updateMyList();
	} else {
		allList.style.display = 'block';
		myList.style.display = 'none';
		renderList(ALL_ANIME_DATA, 'all-list-container');
	}
	}, 250);
}

async function toggleFolder(element, uniqueId, originalId) {
	const subList = document.getElementById(`list-${uniqueId}`);
	const isActive = element.classList.contains('active');

	if (!isActive) {
		const container = element.closest('.container');
		container.querySelectorAll('.folder-item.active').forEach(activeEl => {
			activeEl.classList.remove('active');
			const openList = activeEl.nextElementSibling;
			if (openList) {
				openList.classList.remove('open');
				openList.style.maxHeight = null;
			}			
		});

		element.classList.add('active');
		subList.classList.add('open');
		subList.style.maxHeight = subList.scrollHeight + "px";

		if (subList.getAttribute('data-loaded') !== 'true') {
			await fetchSubItems(originalId, subList);
			subList.style.maxHeight = subList.scrollHeight + "px";
		}
	} else {
		element.classList.remove('active');
		subList.classList.remove('open');
		subList.style.maxHeight = null;
	}
}

async function fetchSubItems(folderId, container, userItems = [], isMyList = false) {
	try {
		if (!SUB_DATA_CACHE[folderId]) {
			const res = await fetch(`${GIT_BASE}${folderId}`);
			SUB_DATA_CACHE[folderId] = await res.json();
		}
		
		const subData = SUB_DATA_CACHE[folderId];
		const folder = ALL_ANIME_DATA.find(f => f.id === folderId);
		
		container.innerHTML = subData.map((sub, index) => {
			const currentId = `${folderId}_${index + 1}`; 
			const userData = isMyList ? userItems.find(u => u.id === currentId) : null;
			
			if (!filterLogic(folder, sub, userData, isMyList)) return '';
			
			const isSelected = !!userData;
			if (isMyList && myListMode === 'titles' && !isSelected) return '';

			const voiceover = userData ? userData.voiceover : sub.studio_name;
			const episodes = userData ? userData.episode : sub.episode;
			const relookCount = userData ? userData.relook : "";
			
			const dimmedStyle = (isMyList && myListMode === 'folders' && !isSelected) 
				? 'style="opacity: 0.15; filter: grayscale(1); pointer-events: none;"' 
				: '';

			return `
			<div class="sub-item" ${dimmedStyle}>
				<img src="${GIT_ASSET}${folderId}/${index + 1}.jpg" class="folder-icon" style="width:50px; height:50px; border-radius: 8px; object-fit: cover;">
				<div class="sub-info">
					<div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
						<b style="font-size: 14px; text-align: left; padding-right: 20px; display: block;">${sub.name}</b>
						<span style="font-size: 10px; color: var(--accent); font-weight: bold;">${sub.type}</span>
					</div>
					
					<div style="font-size: 12px; color: #ccc; margin-top: 2px;">${voiceover}</div>
					
					<div class="sub-center-row">
						${isMyList 
							? (relookCount ? `<span>Пересмотрено ${getRelookWord(relookCount)}</span>` : '') 
							: `<span>${sub.year}</span>`
						}
						<span>${episodes} эп.</span>
					</div>
				</div>
			</div>`;
		}).join('');

		const allHaveMusic = subData.length > 0 && subData.every(sub => String(sub.amusic_check) === "1");
		
		const folderUniqueId = container.id.replace('list-', '');
		const musicIcon = document.getElementById(`icon-music-${folderUniqueId}`);
		
		if (musicIcon) {
			if (allHaveMusic) {
				musicIcon.classList.add('visible'); 
			} else {
				musicIcon.classList.remove('visible'); 
			}
		}
		
		container.setAttribute('data-loaded', 'true');
	} catch (e) {
		container.innerHTML = `<div style="padding:10px; color:red; font-size:12px;">Download ERROR</div>`;
	}
}
loadFolders();

searchInput.oninput = () => {
	window.scrollTo(0, 0); 
	const val = searchInput.value.toLowerCase().trim();
	const wrappers = document.querySelectorAll('.anime-wrapper');
	
	wrappers.forEach(wrapper => {
		const folderId = wrapper.querySelector('.folder-item')?.getAttribute('onclick')?.match(/'([^']+)'\)$/)?.[1] 
						|| wrapper.querySelector('.sub-list')?.id.split('-').pop();

		const folderData = ALL_ANIME_DATA.find(f => f.id === folderId);
		const folderTitle = folderData ? folderData.name.toLowerCase() : "";
		
		const subItems = SUB_DATA_CACHE[folderId] || [];
		const matchesSubItem = subItems.some(sub => sub.name.toLowerCase().includes(val));
		const matchesFolder = folderTitle.includes(val);

		if (val === "") {
			wrapper.style.display = '';
		} else {
			wrapper.style.display = (matchesFolder || matchesSubItem) ? '' : 'none';
		}
	});
};

function setMyListMode(mode) {
	myListMode = mode;
	window.scrollTo(0, 0);
	
	if (searchInput) {
		searchInput.value = ""; 
	}
	
	updateMyList();
}

function handleMusicClick(event, folderId) {
	event.stopPropagation();
	
	const icon = event.currentTarget;
	const isAvailable = icon.classList.contains('visible');
	
	if (isAvailable) {
		var musicUrl = `https://redyq.github.io/RQ.online/amusic/?` + folderId;
		window.open(musicUrl, '_blank');
	} else {
		showToast("Тайтл отсутствует или не полностью загружен в AMusic");
	}
}
		
function showToast(message) {
	const toast = document.getElementById('toast');
	toast.textContent = message;
	toast.classList.add('show');
	setTimeout(() => toast.classList.remove('show'), 1500);
}

const brandName = document.getElementById('brand-name');
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
const drawerContent = document.getElementById('drawer-content');

brandName.onclick = () => {
	drawer.classList.add('open');
	overlay.classList.add('show');
	renderDrawerMenu(); 

	const btnAll = document.getElementById('btn-all-list');
	const btnMy = document.getElementById('btn-my-list');
	const moreTrigger = document.getElementById('more-trigger');
	const contextMenu = document.getElementById('context-menu');

	if (moreTrigger) {
		moreTrigger.onclick = (e) => {
			e.stopPropagation();
			contextMenu.classList.toggle('show');
		};
	}
};

overlay.onclick = () => {
	drawer.classList.remove('open');
	overlay.classList.remove('show');
};

function renderDrawerMenu() {
	const isAllVisible = document.getElementById('all-list-container').style.display !== 'none';
	const stats = getFilterStats();
	
	drawerContent.innerHTML = `
	<div style="padding: 10px; font-weight: bold; font-size: 12px; color: #888;">НАВИГАЦИЯ</div>
		<div class="drawer-item ${isAllVisible ? 'active-screen' : ''}" id="btn-all-list">
			<span>All List</span>
		</div>
		<div class="drawer-item ${!isAllVisible ? 'active-screen' : ''}" id="btn-my-list">
			<span>Мой список</span>
			<div class="more-menu-container">
				<div id="more-trigger" style="margin-bottom: 4px;">⋮</div>
				<div class="context-menu" id="context-menu">
					<div class="menu-item" id="export-btn">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
						EXPORT
					</div>
					<div class="menu-item" id="import-btn">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z" /></svg>
						IMPORT
					</div>
				</div>
			</div>
		</div>
		
		
		
		<hr style="border: 0; border-top: 1px solid #333; margin: 10px 0;">
		
<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 10px 5px 10px;">
	<span style="font-weight: bold; font-size: 12px; color: #888;">ФИЛЬТРЫ</span>
	
<div style="position: relative;">
	<div id="sort-btn-container" onclick="toggleSortMenu(event)" style="cursor:pointer; display: flex; align-items: center; gap: 5px; background: #222; padding: 4px 8px; border-radius: 6px; border: 1px solid #333;">
		${getSortIcon()}
		<span style="font-size: 10px; color: #eee; font-weight: bold;">${currentSortMode.toUpperCase()}</span>
	</div>
	<div id="sort-context-menu" class="context-menu" style="right: 0; top: 35px; width: 120px;">
		<div class="menu-item" onclick="setSort('default')">DEFAULT</div>
		<div class="menu-item" onclick="setSort('az')">A-Z</div>
		<div class="menu-item" onclick="setSort('za')">Z-A</div>
	</div>
</div>
	
</div>
		
		<div class="filter-section">
			${renderFilterGroup('Тип', 'type', stats.type)}
			${renderFilterGroup('Статус', 'status', stats.status)}
			${renderFilterGroup('Жанры', 'genre', stats.genre, true)}
			${!isAllVisible ? renderFilterGroup('Озвучка', 'voiceover', stats.voiceover) : ''}
			${!isAllVisible ? `
				<div class="filter-header" onclick="toggleFilterList(this)">Категории ▾</div>
				<div class="filter-options">
						<label><input type="checkbox" ${currentFilters.category.includes('look_if_1') ? 'checked' : ''} onchange="updateFilter('category', 'look_if_1')"> Смотрю</label>
						<label><input type="checkbox" ${currentFilters.category.includes('look_if_0') ? 'checked' : ''} onchange="updateFilter('category', 'look_if_0')"> Не смотрю</label>
						<label><input type="checkbox" ${currentFilters.category.includes('can_finish') ? 'checked' : ''} onchange="updateFilter('category', 'can_finish')"> Можно досмотреть</label>
						<label><input type="checkbox" ${currentFilters.category.includes('relook_only') ? 'checked' : ''} onchange="updateFilter('category', 'relook_only')"> Пересмотрено</label>
				</div>
			` : ''}
		</div>

		<button onclick="applyFilters()" style="width: 100%; margin-top: 20px; background: var(--accent); color:white; border:none; padding:10px; border-radius:8px;">ПРИМЕНИТЬ</button>
		<button onclick="resetFilters()" style="width: 100%; margin-top: 10px; background: #333; color:#ccc; border:none; padding:8px; border-radius:8px; font-size:12px;">Сбросить всё</button>		
		
		
		
		<div class="drawer-footer">
			<div class="btn-editor" onclick="window.open('https://redyq.github.io/RQ.online/ealist', '_blank')">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
				Редактор списка
			</div>
			<div class="btn-delete-account" id="delete-account-btn">
				Удалить локальный аккаунт
			</div>
		</div>
	`;
	setupDrawerEvents();
}

function renderFilterGroup(label, key, data, isGenre = false) {
	let html = `<div class="filter-header" onclick="toggleFilterList(this)">${label} ▾</div><div class="filter-options">`;
	
	if (isGenre) {
		const allGenresInOrder = [...GENRE_GROUPS.green, ...GENRE_GROUPS.yellow, ...GENRE_GROUPS.orange];
		allGenresInOrder.forEach(name => {
			const count = data[name.toLowerCase()]; 
			if (!count) return;
			
			let color = "#555";
			if (GENRE_GROUPS.green.includes(name)) color = "#4CAF50";
			else if (GENRE_GROUPS.yellow.includes(name)) color = "#FFEB3B";
			else if (GENRE_GROUPS.orange.includes(name)) color = "#FF9800";

			html += `
				<label style="border-left: 4px solid ${color}; padding-left: 10px;">
					<input type="checkbox" ${currentFilters[key].includes(name) ? 'checked' : ''} onchange="updateFilter('${key}', '${name}')">
					<span style="flex:1">${name}</span>
					<small style="color: #666; margin-left: 5px;">(${data[name]})</small>
				</label>`;
		});
 } else {
		Object.keys(data).sort().forEach(name => {
			html += `
				<label>
					<input type="checkbox" ${currentFilters[key].includes(name) ? 'checked' : ''} onchange="updateFilter('${key}', '${name}')">
					<span style="flex:1">${name}</span>
					<small style="color: #666; margin-left: 5px;">(${data[name]})</small>
				</label>`;
		});
	} 	
	return html + `</div>`;
}

const setActiveTab = (activeBtn, inactiveBtn) => {
		activeBtn.classList.add('active-screen');
		inactiveBtn.classList.remove('active-screen');
	};
	
function setupDrawerEvents() {
	const moreTrigger = document.getElementById('more-trigger');
	const contextMenu = document.getElementById('context-menu');
	const btnAll = document.getElementById('btn-all-list');
	const btnMy = document.getElementById('btn-my-list');

	if (!moreTrigger || !contextMenu) return;
	
	moreTrigger.onclick = (e) => {
		e.stopPropagation();
		contextMenu.classList.toggle('show');
	};

	document.addEventListener('click', () => {
		if (contextMenu) contextMenu.classList.remove('show');
	}, { once: true });

	document.getElementById('export-btn').onclick = (e) => {
		e.stopPropagation();
		const data = localStorage.getItem('my_anime_list') || "[]";
		const date = new Date().toLocaleDateString('ru-RU');
		const blob = new Blob([data], { type: 'application/octet-stream' }); 
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `AList_My [${date}].rq`;
		a.click();
	};

	document.getElementById('import-btn').onclick = (e) => {
		e.stopPropagation();
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.rq';
		input.onchange = (ev) => {
			const file = ev.target.files[0];
			if (file && file.name.endsWith('.rq')) {
				const reader = new FileReader();
				reader.onload = (re) => {
					localStorage.setItem('my_anime_list', re.target.result);
					location.reload();
				};
				reader.readAsText(file);
			}
		};
		input.click();
	};

	btnAll.onclick = () => {
		setActiveTab(btnAll, btnMy);
		drawer.classList.remove('open');
		overlay.classList.remove('show');
		switchScreen('all');
	};

	btnMy.onclick = (e) => {
		if(e.target.id === 'more-trigger') return;
		setActiveTab(btnMy, btnAll);
		drawer.classList.remove('open');
		overlay.classList.remove('show');
		switchScreen('my');
	};
	
	const deleteBtn = document.getElementById('delete-account-btn');
	if (deleteBtn) {
		deleteBtn.onclick = () => {
			localStorage.removeItem('my_anime_list');
			location.reload();
		};
	}
}

function triggerImport() {
	const hiddenInput = document.createElement('input');
	hiddenInput.type = 'file';
	hiddenInput.accept = '.rq';
	hiddenInput.onchange = (e) => {
		const file = e.target.files[0];
		const reader = new FileReader();
		reader.onload = (re) => {
			localStorage.setItem('my_anime_list', re.target.result);
			location.reload();
		};
		reader.readAsText(file);
	};
	hiddenInput.click();
}

function checkAllMusicStatus() {
	const musicIcons = document.querySelectorAll('#all-list-container .music-icon');
	
	musicIcons.forEach(icon => {
		const folderId = icon.id.split('-').pop();
		const subData = SUB_DATA_CACHE[folderId];

		if (subData) {
			const allHaveMusic = subData.length > 0 && subData.every(sub => String(sub.amusic_check) === "1");
			if (allHaveMusic) icon.classList.add('visible');
			else icon.classList.remove('visible');
		}
	});
}

function getFilterStats() {
	const stats = { type: {}, status: {}, voiceover: {}, genre: {}, studio: {}, relook: 0 };
	const myData = JSON.parse(localStorage.getItem('my_anime_list') || "[]");
	const isMyScreen = document.getElementById('my-list-container').style.display !== 'none';

	ALL_ANIME_DATA.forEach(folder => {
		const isInMyList = myData.some(m => m.id.split('_')[0] === folder.id);
		if (isMyScreen && !isInMyList) return;

		if (folder.status) stats.status[folder.status] = (stats.status[folder.status] || 0) + 1;

		folder.genre.split(', ').forEach(g => {
			const cleanGenre = g.trim().toLowerCase();
			stats.genre[cleanGenre] = (stats.genre[cleanGenre] || 0) + 1;
		});
		
		const subItems = SUB_DATA_CACHE[folder.id] || [];
		subItems.forEach((sub, idx) => {
			const currentId = `${folder.id}_${idx + 1}`;
			const userItem = myData.find(m => m.id === currentId);
			if (isMyScreen && !userItem) return;

			if (sub.type) stats.type[sub.type] = (stats.type[sub.type] || 0) + 1;
			sub.studio_name.split(', ').forEach(s => stats.studio[s] = (stats.studio[s] || 0) + 1);
			
			const rawVoice = userItem ? userItem.voiceover : sub.studio_name;
			rawVoice.split(', ').forEach(v => {
				const cleanVoice = v.split('(')[0].trim(); 
				stats.voiceover[cleanVoice] = (stats.voiceover[cleanVoice] || 0) + 1;
			});
			if (userItem && userItem.relook) stats.relook++;
		});
	});
	return stats;
}

function toggleFilterList(el) {
	const parent = el.closest('.filter-section');
	const target = el.nextElementSibling;
	const isOpening = !target.classList.contains('show');

	if (isOpening && parent) {
		parent.querySelectorAll('.filter-options.show').forEach(o => {
			o.classList.remove('show');
			o.style.maxHeight = null;
		});
	}

	target.classList.toggle('show');
	if (target.classList.contains('show')) {
		target.style.maxHeight = target.scrollHeight + "px"; 
	} else {
		target.style.maxHeight = null;
	}
}

function updateFilter(key, value) {
	if (Array.isArray(currentFilters[key])) {
		const idx = currentFilters[key].indexOf(value);
		if (idx > -1) currentFilters[key].splice(idx, 1);
		else currentFilters[key].push(value);
	} else {
		currentFilters[key] = !currentFilters[key];
	}
}

function applyFilters() {
	const input = document.getElementById('search-input');
	if (input) input.value = "";
	
	if (overlay) overlay.click();
	showToast("Loading...");
	
	overlay.click();
	
	setTimeout(() => {
		const isAllVisible = document.getElementById('all-list-container').style.display !== 'none';
		
		if (isAllVisible) {
			renderList(ALL_ANIME_DATA, 'all-list-container');
			checkAllMusicStatus();
		} else {
			updateMyList();
		}
	}, 400);
}

function resetFilters() {
	currentFilters = { type: [], status: [], voiceover: [], genre: [], category: [], relook: false, studio: [] };
	renderDrawerMenu();
	applyFilters();
}

function toggleSortMode() {
	if (currentSortMode === 'default') {
		currentSortMode = 'az';
		ALL_ANIME_DATA = DATA_AZ;
	} else if (currentSortMode === 'az') {
		currentSortMode = 'za';
		ALL_ANIME_DATA = DATA_ZA;
	} else {
		currentSortMode = 'default';
		ALL_ANIME_DATA = ORIGINAL_DATA;
	}

	const sortBtn = document.getElementById('sort-btn-container');
	if (sortBtn) {
		sortBtn.innerHTML = `${getSortIcon()} <span style="font-size: 10px; color: #eee; font-weight: bold;">${currentSortMode.toUpperCase()}</span>`;
	}
	
	showToast("Loading...");
	
	overlay.click();

	setTimeout(() => {
		const isAllVisible = document.getElementById('all-list-container').style.display !== 'none';
		if (isAllVisible) {
			renderList(ALL_ANIME_DATA, 'all-list-container');
		} else {
			updateMyList();
		}
	}, 400);
}

function getSortIcon() {
	const style = "width:16px; height:16px; fill:var(--accent);";
	if (currentSortMode === 'az') {
		return `<svg style="${style}" viewBox="0 0 24 24"><path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z"/></svg>`;
	} else if (currentSortMode === 'za') {
		return `<svg style="${style} transform: scaleY(-1);" viewBox="0 0 24 24"><path d="M3 13h12v-2H3v2zm0 5h6v-2H3v2zM3 6v2h18V6H3z"/></svg>`;
	}
	return `<svg style="${style}" viewBox="0 0 24 24"><path d="M3 15h18v-2H3v2zm0 4h18v-2H3v2zm0-8h18V9H3v2zm0-6v2h18V5H3z"/></svg>`;
}

async function syncFullDatabase() {
	if (Object.keys(SUB_DATA_CACHE).length >= ALL_ANIME_DATA.length) return;

	showToast("Синхронизация базы данных с AMusic...");

	const folderIds = ALL_ANIME_DATA.map(f => f.id);
	
	for (let i = 0; i < folderIds.length; i += 10) {
		const chunk = folderIds.slice(i, i + 10);
		await Promise.all(chunk.map(async (id) => {
			if (!SUB_DATA_CACHE[id]) {
				try {
					const response = await fetch(`${GIT_BASE}${id}`);
					SUB_DATA_CACHE[id] = await response.json();
				} catch (e) {
					console.error("Ошибка синхронизации ID:", id);
				}
			}
		}));
		await new Promise(r => setTimeout(r, 10));
	} 
	showToast("Синхронизация завершена!");
	
	if (document.getElementById('all-list-container').style.display !== 'none') {
		checkAllMusicStatus();
	}
}

function toggleSortMenu(e) {
	e.stopPropagation();
	const menu = document.getElementById('sort-context-menu');
	menu.classList.toggle('show');
	document.getElementById('context-menu')?.classList.remove('show');
}

function setSort(mode) {
	currentSortMode = mode;
	if (mode === 'az') ALL_ANIME_DATA = DATA_AZ;
	else if (mode === 'za') ALL_ANIME_DATA = DATA_ZA;
	else ALL_ANIME_DATA = ORIGINAL_DATA;

	document.getElementById('sort-context-menu').classList.remove('show');
	renderDrawerMenu();
	applyFilters();
}
