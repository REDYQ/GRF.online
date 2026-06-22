document.getElementById('current-year').textContent = new Date().getFullYear();

/*Lock Mode*/
document.documentElement.classList.add('site-locked');

const overlay = document.createElement('div');
overlay.className = 'site-lock-overlay';
overlay.innerHTML = `<div class="site-lock-message" id="lock-text">Загрузка конфигурации...</div>`;

const initLoading = () => {
    if (document.querySelector('.site-lock-overlay')) return;
    (document.body || document.documentElement).appendChild(overlay);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoading);
} else {
    initLoading();
}

(async function checkSiteStatus() {
    const CURRENT_SITE_NAME = 'ealist'; 
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
	     overlay.remove();
    }
})();
//*

function getRelookWord(n) {
    const plural = (n % 10 === 1 && n % 100 !== 11) ? 'раз.' : 
                   (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? 'раза.' : 'раз.';
    return `${n} ${plural}`;
}

const JSON_MAIN = 'https://raw.githubusercontent.com/REDYQ/Anime_List/refs/heads/main/file/data.json'; // AList data
const GIT_BASE = 'https://raw.githubusercontent.com/REDYQ/Anime_List/refs/heads/main/file/data_id/'; // вложенные JSON
const GIT_COVER = 'https://raw.githubusercontent.com/REDYQ/Anime_List/refs/heads/main/file/icon/cover/'; // cover
const GIT_ASSET = 'https://raw.githubusercontent.com/REDYQ/Anime_List/refs/heads/main/file/icon/asset/'; // asset

const CACHE_KEY = 'rq_adder_cache';

const searchInput = document.getElementById('search-input');

let ALL_ANIME_DATA = [];
let SAVED_LIST = [];
let CURRENT_EDIT_ID = null; 
let TEMP_LOOK_IF = "";

window.onload = () => {
	checkCache();
};

async function startApp(mode) {
    if (mode === 'new') {
        localStorage.removeItem(CACHE_KEY);
        SAVED_LIST = []; 
    }
	
    document.getElementById('start-screen').style.display = 'none';
    
    const searchBox = document.getElementById('search-box');
    if (searchBox) {
        searchBox.classList.remove('search-hidden');
    }
    
    document.getElementById('list-container').style.display = 'block';
    renderFooter();

    if (mode === 'view') {
        const imported = await triggerImportPromise(); 
        if (!imported) {
            location.reload(); 
            return;
        }

        try {
            const res = await fetch(JSON_MAIN);
            ALL_ANIME_DATA = await res.json();
            renderSavedOnly(); 
        } catch (e) {}
        return;
    }

    if (mode === 'cache') {
        const cache = localStorage.getItem(CACHE_KEY);
        SAVED_LIST = cache ? JSON.parse(cache) : [];
    } else if (mode === 'import') {
        await triggerImportPromise(); 
    }
    await loadAllFolders();
}

function renderSavedOnly() {
    const container = document.getElementById('list-container');
    container.innerHTML = '';

    const myFolderIds = [...new Set(SAVED_LIST.map(item => item.id.split('_')[0]))];

    const filteredData = ALL_ANIME_DATA.filter(folder => myFolderIds.includes(folder.id));

    if (filteredData.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:20px;">Ваш список пуст</div>';
        return;
    }

    filteredData.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'anime-wrapper';
        wrapper.innerHTML = `
            <div class="folder-item" onclick="toggleFolder(this, '${item.id}', true)">
                <img src="${GIT_COVER}${item.id}.jpg" class="folder-icon">
                <div class="folder-info"><b>${item.name}</b></div>
            </div>
            <div class="sub-list" id="sub-${item.id}"></div>
        `;
        container.appendChild(wrapper);
    });
}    
    
async function loadAllFolders() {
    const container = document.getElementById('list-container');
    
    try {
    	container.innerHTML = '<div style="text-align:center; padding:20px; color: #555;">Загрузка базы...</div>';
        const res = await fetch(JSON_MAIN);
        ALL_ANIME_DATA = await res.json();
        renderFolders();
    } catch (e) {
		container.innerHTML = `<div style="color:red; text-align:center;">Ошибка загрузки</div>`;
		
		const footer = document.querySelector('.adder-footer');
		if (footer) footer.remove();
	}
}

function renderFolders() {
    const container = document.getElementById('list-container');
    container.innerHTML = '';

    ALL_ANIME_DATA.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'anime-wrapper';
        wrapper.innerHTML = `
            <div class="folder-item" onclick="toggleFolder(this, '${item.id}')">
                <img src="${GIT_COVER}${item.id}.jpg" class="folder-icon">
                <div class="folder-info"><b>${item.name}</b></div>
            </div>
            <div class="sub-list" id="sub-${item.id}"></div>
        `;
        container.appendChild(wrapper);
    });
}

async function toggleFolder(element, folderId, isViewMode = false) {
    const subList = document.getElementById(`sub-${folderId}`);
    const isActive = element.classList.contains('active');

    if (!isActive) {
        document.querySelectorAll('.folder-item.active').forEach(el => {
            el.classList.remove('active');
            const openList = el.nextElementSibling;
            if (openList) {
                openList.classList.remove('open');
                openList.style.maxHeight = null;
            }
        });

        element.classList.add('active');
        subList.classList.add('open');

        if (subList.innerHTML === "") {
try{        	
            const res = await fetch(`${GIT_BASE}${folderId}`);
            let data = await res.json();

            let itemsToRender = data.map((sub, index) => ({
                ...sub,
                realId: `${folderId}_${index + 1}`,
                p: index + 1
            }));
            
            if (isViewMode) {
                itemsToRender = itemsToRender.filter(item => 
                    SAVED_LIST.some(i => i.id === item.realId)
                );
            }
            
            subList.innerHTML = itemsToRender.map(item => {
                const userData = SAVED_LIST.find(i => i.id === item.realId);
                
                return `
                    <div class="sub-item" id="item-${item.realId}">
                        <img src="${GIT_ASSET}${folderId}/${item.p}.jpg" class="sub-icon">
                        <div class="sub-info" id="info-${item.realId}">
                            ${getItemInfoHTML(item.realId, item, userData)} 
                        </div>
                        <div class="action-area" onclick="handleAction(event, '${item.realId}', ${item.episode || 0})">
                            ${userData ? getEditIcon() : getPlusIcon()}
                        </div>
                    </div>`;
            }).join('');
            
        
        subList.style.maxHeight = subList.scrollHeight + "px";
	} catch (error) {
        subList.innerHTML = `<div style="padding:10px; color:red; font-size:12px;">Download ERROR</div>`;
        subList.style.maxHeight = subList.scrollHeight + "px";
	}
} else {
	subList.style.maxHeight = subList.scrollHeight + "px";
}
    } else {
        element.classList.remove('active');
        subList.classList.remove('open');
        subList.style.maxHeight = null;
    }
}

function handleAction(event, id, maxEps) {
    event.stopPropagation();
    const isAdded = SAVED_LIST.some(i => i.id === id);

    if (!isAdded) {
        const newItem = {
            relook: "",
            voiceover: "",
            episode: "",
            look_if: "",
            id: id
        };
        SAVED_LIST.push(newItem);
        updateCache();
        refreshItemIcon(id, true);
    } else {
        openEditModal(id, maxEps);
    }
}

function openEditModal(id, maxEps) {
    CURRENT_EDIT_ID = id;
    const item = SAVED_LIST.find(i => i.id === id);
    
    if (item) {
        const inputEps = document.getElementById('edit-episode');
        inputEps.value = item.episode || "";

        if (maxEps) {
            inputEps.max = maxEps;
            inputEps.placeholder = `Максимум: ${maxEps}`;
            
            inputEps.oninput = () => {
                if (parseInt(inputEps.value) > maxEps) {
                    inputEps.value = maxEps;
                    showToast(`В этом тайтле всего ${maxEps} эп.`);
                }
            };
        } else {
            inputEps.removeAttribute('max');
            inputEps.placeholder = "Ввод...";
            inputEps.oninput = null;
        }
    	
        document.getElementById('edit-relook').value = item.relook || "";
        document.getElementById('edit-voiceover').value = item.voiceover || "";
        document.getElementById('edit-episode').value = item.episode || "";
        
        setWatching(item.look_if === "1");
    }

    document.getElementById('modal-overlay').style.display = 'block';
    document.getElementById('edit-modal').classList.add('open');
}

function setWatching(isWatching) {
    TEMP_LOOK_IF = isWatching ? "1" : "";
    document.getElementById('look-yes').classList.toggle('active', isWatching);
    document.getElementById('look-no').classList.toggle('active', !isWatching);
}

document.getElementById('save-edit').onclick  = async () => {
    const index = SAVED_LIST.findIndex(i => i.id === CURRENT_EDIT_ID);
    if (index !== -1) {
        SAVED_LIST[index].relook = document.getElementById('edit-relook').value;
        SAVED_LIST[index].voiceover = document.getElementById('edit-voiceover').value;
        SAVED_LIST[index].episode = document.getElementById('edit-episode').value;
        SAVED_LIST[index].look_if = TEMP_LOOK_IF;
        updateCache();

        closeModal();
        
        const infoBlock = document.getElementById(`info-${CURRENT_EDIT_ID}`);
        if (infoBlock) {
            try {
                const [fId, pId] = CURRENT_EDIT_ID.split('_');
                const res = await fetch(`${GIT_BASE}${fId}`);
                if (res.ok) {
                    const folderData = await res.json();
                    const sub = folderData[parseInt(pId) - 1];
                    infoBlock.innerHTML = getItemInfoHTML(CURRENT_EDIT_ID, sub, SAVED_LIST[index]);
                }
            } catch (e) {
                console.log("Нет подключения к интернету...");
            }
        }
    }
};

document.getElementById('delete-item').onclick = () => {
    const itemToDelete = SAVED_LIST.find(i => i.id === CURRENT_EDIT_ID);	
    SAVED_LIST = SAVED_LIST.filter(i => i.id !== CURRENT_EDIT_ID);
    refreshItemIcon(CURRENT_EDIT_ID, false);
    
    const infoBlock = document.getElementById(`info-${CURRENT_EDIT_ID}`);
    if (infoBlock) {
        const titleName = infoBlock.querySelector('b').innerText;
        infoBlock.innerHTML = `<b style="font-size:14px;">${titleName}</b>`;
    }
    
    updateCache();
    closeModal();
};

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('edit-modal').classList.remove('open');
}

function finishEditing() {
    SAVED_LIST.sort((a, b) => {
        const [aFolder, aItem] = a.id.split('_').map(Number);
        const [bFolder, bItem] = b.id.split('_').map(Number);
        
        if (aFolder !== bFolder) {
            return aFolder - bFolder; 
        }
        return aItem - bItem;
    });
    
    const dataStr = JSON.stringify(SAVED_LIST, null, 2);
    const date = new Date().toLocaleDateString('ru-RU');
    const blob = new Blob([dataStr], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AList_My [${date}].rq`;
    a.click();

    setTimeout(() => {
        location.reload();
    }, 1000);
}

function updateCache() {
    localStorage.setItem(CACHE_KEY, JSON.stringify(SAVED_LIST));
}

function refreshItemIcon(id, isAdded) {
    const btn = document.querySelector(`#item-${id} .action-area`);
    if (btn) btn.innerHTML = isAdded ? getEditIcon() : getPlusIcon();
}

function getPlusIcon() { return `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`; }
function getEditIcon() { return `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`; }

function renderFooter() {
    const footer = document.createElement('div');
    footer.className = 'adder-footer';
    footer.innerHTML = `
        <div class="finish-btn" onclick="finishEditing()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>
            <span>Закончить редактирование</span>
        </div>
    `;
    document.body.appendChild(footer);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 1500);
}

function triggerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.rq';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (re) => {
            SAVED_LIST = JSON.parse(re.target.result);
            updateCache();
            renderFolders();
        };
        reader.readAsText(file);
    };
    input.click();
}

function checkCache() {
    const cache = localStorage.getItem(CACHE_KEY);
    const hasData = cache && JSON.parse(cache).length > 0;
    
    const btnCache = document.getElementById('btn-cache');
    if (btnCache) btnCache.style.display = hasData ? 'block' : 'none';

    const btnView = document.getElementById('btn-view');
    if (btnView) btnView.style.display = hasData ? 'block' : 'none';
}

function getItemInfoHTML(itemId, sub, userData) {
    if (!userData) return `<b style="font-size:14px;">${sub.name}</b>`;

    const voice = userData.voiceover || "";
    const eps = userData.episode ? `${userData.episode} эп.` : ""; 
    const relook = userData.relook ? `<div style="font-size:10px; color:var(--accent); margin-top: 2px;">Пересмотрено ${getRelookWord(userData.relook)}</div>` : '';

    let infoLine = [voice, eps].filter(Boolean).join(' • ');
    
    return `
        <b style="font-size:14px;">${sub.name}</b>
        ${infoLine ? `<div style="font-size:11px; color:#888; margin-top:5px;">${infoLine}</div>` : ''}
        ${relook}
    `;
}

function triggerImportPromise() {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.rq';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (re) => {
                SAVED_LIST = JSON.parse(re.target.result);
                updateCache(); 
                resolve(true);
            };
            reader.onerror = () => resolve(false);
            reader.readAsText(file);
        };
        
        window.addEventListener('focus', () => {
            setTimeout(() => { if (!input.value) resolve(false); }, 500);
        }, { once: true });

        input.click();
    });
}

searchInput.oninput = () => {
    const val = searchInput.value.toLowerCase().trim();
    const wrappers = document.querySelectorAll('.anime-wrapper');
    wrappers.forEach(wrapper => {
        const titleTag = wrapper.querySelector('.folder-info b, .sub-info b');
        const titleText = titleTag ? titleTag.textContent.toLowerCase() : "";
        
        wrapper.style.display = titleText.includes(val) ? '' : 'none';
    });
};

function goBack() {
    const startScreen = document.getElementById('start-screen');
    if (startScreen.style.display === 'none') {
        if (SAVED_LIST.length > 0) {
            updateCache();
        }

        startScreen.style.display = 'flex'; 
        document.getElementById('list-container').style.display = 'none'; 
        
        const searchBox = document.getElementById('search-box');
        if (searchBox) searchBox.classList.add('search-hidden');
        
        const footer = document.querySelector('.adder-footer');
        if (footer) footer.remove();

        checkCache();
        
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        
    } else {}
}