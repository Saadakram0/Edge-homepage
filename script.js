const BG_PRESETS = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1433086566280-608bf20bc141?auto=format&fit=crop&w=1920&q=80'
];

const DEFAULT_SHORTCUTS = [
    { id: 1, name: 'Google', url: 'https://google.com', icon: '' },
    { id: 2, name: 'YouTube', url: 'https://youtube.com', icon: '' },
    { id: 3, name: 'GitHub', url: 'https://github.com', icon: '' }
];

let state = {
    theme: 'dark',
    background: BG_PRESETS[0],
    particlesEnabled: true,
    isEditing: false,
    editingIndex: null,
    shortcuts: [...DEFAULT_SHORTCUTS],
    searchHistory: [],
    todos: [],
    notes: '',
    usageSecondsToday: 0,
    usageSecondsTotal: 0,
    lastDate: new Date().toDateString()
};

let particlesAnimationId = null;

document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('edge_homepage_full_state');
    if (saved) state = { ...state, ...JSON.parse(saved) };

    // Reset daily time if a new day has passed
    const today = new Date().toDateString();
    if (state.lastDate !== today) {
        state.usageSecondsToday = 0;
        state.lastDate = today;
    }

    renderAll();
    startClock();
    startUsageTracker();
    setupEventListeners();
    initParticlesCanvas();
});

function saveState() {
    localStorage.setItem('edge_homepage_full_state', JSON.stringify(state));
}

function renderAll() {
    document.documentElement.setAttribute('data-theme', state.theme);
    document.body.style.backgroundImage = `url('${state.background}')`;

    // Render Search History Chips
    renderSearchHistory();

    // Render Shortcuts Grid
    renderShortcuts();

    // Render Background Presets
    renderBgPresets();

    // Render Tasks & Notes
    renderTodos();
    document.getElementById('notes-area').value = state.notes;

    // Toggle Particles
    document.getElementById('toggle-particles').checked = state.particlesEnabled;
}

function renderShortcuts() {
    const shortContainer = document.getElementById('shortcuts-container');
    if (!shortContainer) return;

    shortContainer.innerHTML = '';
    shortContainer.classList.toggle('editing', state.isEditing);

    state.shortcuts.forEach((s, idx) => {
        const tile = document.createElement('a');
        tile.className = 'tile';
        tile.href = state.isEditing ? 'javascript:void(0)' : s.url;

        let iconHtml = s.icon 
            ? `<div class="tile-icon">${s.icon}</div>` 
            : `<img src="https://www.google.com/s2/favicons?sz=64&domain=${new URL(s.url).hostname}" alt="${s.name}">`;

        tile.innerHTML = `
            <button class="delete-btn" data-idx="${idx}">&times;</button>
            ${iconHtml}
            <span>${s.name}</span>
        `;

        tile.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openEditModal(idx);
        });

        tile.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeShortcut(idx);
        });

        shortContainer.appendChild(tile);
    });

    const addTile = document.createElement('div');
    addTile.className = 'tile tile-add';
    addTile.innerHTML = `<div class="tile-icon" style="font-size:1.8rem; font-weight:300;">+</div><span>Add Tile</span>`;
    addTile.addEventListener('click', openAddModal);
    shortContainer.appendChild(addTile);
}

function renderSearchHistory() {
    const histContainer = document.getElementById('search-history-list');
    if (!histContainer) return;

    histContainer.innerHTML = '';
    state.searchHistory.slice(0, 6).forEach((query, idx) => {
        const chip = document.createElement('div');
        chip.className = 'history-chip';
        chip.innerHTML = `
            <span>🔍 ${query}</span>
            <span class="del-hist" data-idx="${idx}">&times;</span>
        `;

        chip.addEventListener('click', (e) => {
            if (e.target.classList.contains('del-hist')) return;
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        });

        chip.querySelector('.del-hist').addEventListener('click', (e) => {
            e.stopPropagation();
            state.searchHistory.splice(idx, 1);
            saveState();
            renderSearchHistory();
        });

        histContainer.appendChild(chip);
    });
}

function renderBgPresets() {
    const container = document.getElementById('bg-presets');
    if (!container) return;
    container.innerHTML = '';

    BG_PRESETS.forEach(url => {
        const thumb = document.createElement('div');
        thumb.className = 'bg-thumb';
        thumb.style.backgroundImage = `url('${url}')`;
        thumb.addEventListener('click', () => {
            state.background = url;
            saveState();
            renderAll();
        });
        container.appendChild(thumb);
    });
}

function renderTodos() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    list.innerHTML = '';

    state.todos.forEach((t, idx) => {
        const item = document.createElement('li');
        item.className = `todo-item ${t.done ? 'done' : ''}`;
        item.innerHTML = `
            <input type="checkbox" ${t.done ? 'checked' : ''}>
            <span>${t.text}</span>
        `;
        item.querySelector('input').addEventListener('change', () => {
            state.todos[idx].done = !state.todos[idx].done;
            saveState();
            renderTodos();
        });
        list.appendChild(item);
    });
}

/* Usage Time Tracker */
function startUsageTracker() {
    setInterval(() => {
        state.usageSecondsToday++;
        state.usageSecondsTotal++;
        saveState();

        const format = sec => `${Math.floor(sec / 60)}m ${sec % 60}s`;
        document.getElementById('today-time').innerText = format(state.usageSecondsToday);
        document.getElementById('total-time').innerText = format(state.usageSecondsTotal);
    }, 1000);
}

/* Particle Canvas System */
function initParticlesCanvas() {
    const canvas = document.getElementById('particles-canvas');
    const ctx = canvas.getContext('2d');

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 45 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        radius: Math.random() * 2 + 1
    }));

    function animate() {
        ctx.clearRect(0, 0, width, height);

        if (state.particlesEnabled) {
            ctx.fillStyle = state.theme === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)';
            ctx.strokeStyle = state.theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

            particles.forEach((p, i) => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0 || p.x > width) p.vx *= -1;
                if (p.y < 0 || p.y > height) p.vy *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });
        }

        particlesAnimationId = requestAnimationFrame(animate);
    }

    if (particlesAnimationId) cancelAnimationFrame(particlesAnimationId);
    animate();
}

function startClock() {
    const update = () => {
        const now = new Date();
        const clockEl = document.getElementById('clock');
        const dateEl = document.getElementById('date-greeting');
        if (clockEl) clockEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (dateEl) dateEl.innerText = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };
    update();
    setInterval(update, 1000);
}

function setupEventListeners() {
    // Search Bar & History Recording
    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    state.searchHistory = [query, ...state.searchHistory.filter(q => q !== query)];
                    saveState();
                    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }

    // Toggle Particle Animation
    document.getElementById('toggle-particles').addEventListener('change', (e) => {
        state.particlesEnabled = e.target.checked;
        saveState();
    });

    // Notes Input Saver
    document.getElementById('notes-area').addEventListener('input', (e) => {
        state.notes = e.target.value;
        saveState();
    });

    // To-Do Add Button
    document.getElementById('btn-add-todo').addEventListener('click', () => {
        const input = document.getElementById('todo-input');
        if (input.value.trim()) {
            state.todos.push({ text: input.value.trim(), done: false });
            input.value = '';
            saveState();
            renderTodos();
        }
    });

    // Top Bar Buttons
    document.getElementById('btn-edit-mode').addEventListener('click', () => {
        state.isEditing = !state.isEditing;
        document.getElementById('btn-edit-mode').classList.toggle('active', state.isEditing);
        renderShortcuts();
    });

    document.getElementById('btn-theme').addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        saveState();
        renderAll();
    });

    const panel = document.getElementById('settings-panel');
    document.getElementById('btn-settings').addEventListener('click', () => panel.classList.toggle('open'));
    document.getElementById('close-settings').addEventListener('click', () => panel.classList.remove('open'));

    // Modals
    const overlay = document.getElementById('overlay');
    document.getElementById('btn-open-add-modal').addEventListener('click', openAddModal);
    overlay.addEventListener('click', closeModals);

    document.getElementById('btn-save-shortcut').addEventListener('click', () => {
        const name = document.getElementById('shortcut-name').value.trim();
        let url = document.getElementById('shortcut-url').value.trim();
        const icon = document.getElementById('shortcut-icon').value.trim();

        if (name && url) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
            state.shortcuts.push({ id: Date.now(), name, url, icon });
            saveState();
            renderShortcuts();
            closeModals();
        }
    });

    document.getElementById('btn-update-shortcut').addEventListener('click', () => {
        if (state.editingIndex === null) return;
        const name = document.getElementById('edit-shortcut-name').value.trim();
        let url = document.getElementById('edit-shortcut-url').value.trim();
        const icon = document.getElementById('edit-shortcut-icon').value.trim();

        if (name && url) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
            state.shortcuts[state.editingIndex] = { ...state.shortcuts[state.editingIndex], name, url, icon };
            saveState();
            renderShortcuts();
            closeModals();
        }
    });
}

function removeShortcut(idx) {
    state.shortcuts.splice(idx, 1);
    saveState();
    renderShortcuts();
}

function openEditModal(idx) {
    state.editingIndex = idx;
    const shortcut = state.shortcuts[idx];

    document.getElementById('edit-shortcut-name').value = shortcut.name;
    document.getElementById('edit-shortcut-url').value = shortcut.url;
    document.getElementById('edit-shortcut-icon').value = shortcut.icon || '';

    document.getElementById('overlay').style.display = 'block';
    document.getElementById('edit-shortcut-modal').style.display = 'block';
}

function openAddModal() {
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('add-modal').style.display = 'block';
}

function closeModals() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('add-modal').style.display = 'none';
    document.getElementById('edit-shortcut-modal').style.display = 'none';
    state.editingIndex = null;
}