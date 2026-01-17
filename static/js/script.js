const AppState = {
    currentUser: null,
    favorites: [],
    games: [],           
    filteredGames: [],   
    theme: 'dark',
    sidebarVisible: true,
    currentCategory: 'Todos',
    currentSearch: '',
    isLoading: false,
    formStep: 1,
    totalSteps: 8,
    allGamesLoaded: false,
    notifications: [
        {
            id: 1,
            title: "¡Bienvenido!",
            message: "Gracias por unirte a SNAPP. Explora nuestros juegos.",
            icon: "fas fa-gamepad",
            time: "Ahora",
            read: false,
            type: "welcome"
        }
    ],
    createGameFormData: {} // Para guardar el progreso del formulario
};

// Función global para cerrar TODOS los modales y paneles
function closeAllModals() {
    const modals = [
        'authModal',
        'editProfileModal', 
        'changePasswordModal',
        'createGameModal',
        'createGameContainer',
        'searchModal'
    ];
    
    const panels = [
        'notificationsPanel',
        'userPanel'
    ];
    
    // Cerrar modales
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hidden');
        }
    });
    
    // Cerrar paneles (usan 'block' en lugar de 'show')
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.remove('show', 'block');
            panel.classList.add('hidden');
        }
    });
    
    // Restaurar scroll
    document.body.style.overflow = '';
}

let sessionRefreshInterval = null;

function startSessionRefresh() {
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
    }
    sessionRefreshInterval = setInterval(async () => {
        if (AppState.currentUser) {
            try {
                const response = await fetch('/api/auth/refresh');
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        // Sesión refrescada
                    }
                }
            } catch (error) {
                // Error silencioso
            }
        }
    }, 5 * 60 * 1000); // 5 minutos
}

function stopSessionRefresh() {
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
        sessionRefreshInterval = null;
    }
}

async function checkAndRestoreSession() {
    try {
        const response = await api.checkAuth();
        if (response.authenticated) {
            if (!AppState.currentUser || AppState.currentUser.email !== response.user.email) {
                AppState.currentUser = response.user;
                AppState.favorites = response.favorites || [];
                updateUserUI();
                updateUserStats();
                startSessionRefresh();
            }
        } else {
            if (AppState.currentUser) {
                AppState.currentUser = null;
                AppState.favorites = [];
                resetUserUI();
                stopSessionRefresh();
            }
        }
    } catch (error) {
        // Error silencioso
    }
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    if (!panel) return;
    
    // Usamos clases de utilidad para mostrar/ocultar en lugar de solo 'show'
    if (panel.classList.contains('hidden')) {
        // Cerrar userPanel si está abierto
        const userPanel = document.getElementById('userPanel');
        if (userPanel) {
            userPanel.classList.remove('show');
            userPanel.classList.add('hidden');
        }
        
        panel.classList.remove('hidden');
        panel.classList.add('block');
        // Mobile notification panel might need overflow hidden on body
        if (window.innerWidth <= 768) {
             document.body.style.overflow = 'hidden';
        }
        markAllNotificationsAsRead();
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('block');
        document.body.style.overflow = '';
    }
}

function renderNotifications() {
    const list = document.getElementById('notificationsList');
    const badge = document.getElementById('notificationBadge');
    
    if (!list) return;

    const unreadCount = AppState.notifications.filter(n => !n.read).length;
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (AppState.notifications.length === 0) {
        list.innerHTML = `
            <div class="p-[3rem_2rem] text-center text-[var(--text-muted)]">
                <i class="fas fa-bell-slash text-[2.5rem] mb-[1rem] opacity-50"></i>
                <p>No hay notificaciones</p>
            </div>
        `;
        return;
    }

    let html = '';
    AppState.notifications.forEach(notification => {
        // Clases de Tailwind para item de notificación
        const unreadClass = notification.read ? '' : 'bg-[rgba(130,102,90,0.05)] border-l-[3px] border-l-[var(--accent)]';
        const timeAgo = notification.time || 'Hace un momento';
        
        html += `
            <div class="notification-item ${unreadClass} p-[1rem] border-b border-[rgba(130,102,90,0.1)] flex gap-[0.8rem] cursor-pointer transition-all duration-200 hover:bg-[var(--bg-sidebar-hover)]" data-id="${notification.id}">
                <div class="notification-icon w-[36px] h-[36px] min-w-[36px] rounded-full bg-[image:var(--gradient-accent)] flex items-center justify-center text-white text-[0.9rem]">
                    <i class="${notification.icon || 'fas fa-bell'}"></i>
                </div>
                <div class="notification-content flex-1">
                    <div class="notification-title font-semibold text-[var(--text-primary)] mb-[0.3rem] text-[0.95rem]">${notification.title}</div>
                    <div class="notification-message text-[var(--text-secondary)] text-[0.85rem] leading-[1.4]">${notification.message}</div>
                    <div class="notification-time text-[0.75rem] text-[var(--text-muted)] mt-[0.3rem]">
                        <i class="far fa-clock"></i> ${timeAgo}
                    </div>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;

    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            markNotificationAsRead(id);
        });
    });
}

function markNotificationAsRead(id) {
    const notification = AppState.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
        notification.read = true;
        renderNotifications();
    }
}

function markAllNotificationsAsRead() {
    let changed = false;
    AppState.notifications.forEach(notification => {
        if (!notification.read) {
            notification.read = true;
            changed = true;
        }
    });
    
    if (changed) {
        renderNotifications();
        api.showNotification('Todas las notificaciones marcadas como leídas', 'success');
    }
}

function clearAllNotifications() {
    if (AppState.notifications.length === 0) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?')) {
        AppState.notifications = [];
        renderNotifications();
        api.showNotification('Notificaciones eliminadas', 'info');
    }
}

function addNotification(title, message, type = 'info') {
    const iconMap = {
        'welcome': 'fas fa-gamepad',
        'new_game': 'fas fa-plus',
        'update': 'fas fa-star',
        'favorite': 'fas fa-heart',
        'info': 'fas fa-info-circle',
        'warning': 'fas fa-exclamation-triangle',
        'error': 'fas fa-exclamation-circle',
        'success': 'fas fa-check-circle'
    };

    const newNotification = {
        id: Date.now(),
        title,
        message,
        icon: iconMap[type] || 'fas fa-bell',
        time: 'Ahora',
        read: false,
        type
    };

    AppState.notifications.unshift(newNotification);
    
    if (AppState.notifications.length > 50) {
        AppState.notifications.pop();
    }

    renderNotifications();
    
    // Si el panel no está visible, mostrar toast
    const panel = document.getElementById('notificationsPanel');
    if (!panel || panel.classList.contains('hidden')) {
        api.showNotification(title, type);
    }
}

function showFavoritesInPanel() {
    const favoritesSection = document.getElementById('favoritesSection');
    const favoritesList = document.getElementById('favoritesList');
    const userMenu = document.querySelector('.user-menu');
    
    if (!favoritesSection || !favoritesList) return;
    
    if (userMenu) userMenu.style.display = 'none';
    favoritesSection.style.display = 'block';
    favoritesSection.classList.remove('hidden');

    if (AppState.favorites.length === 0) {
        favoritesList.innerHTML = `
            <div class="text-center p-[2rem_1rem] text-[var(--text-muted)]">
                <i class="fas fa-heart text-[2rem] mb-[0.5rem] opacity-50"></i>
                <p class="m-0 text-[0.9rem]">No tienes juegos favoritos</p>
                <small>¡Haz clic en el corazón de los juegos para añadirlos!</small>
            </div>
        `;
        return;
    }

    const favoriteGames = AppState.games.filter(game => 
        AppState.favorites.includes(game.title)
    );

    if (favoriteGames.length === 0) {
        favoritesList.innerHTML = `
            <div class="text-center p-[2rem_1rem] text-[var(--text-muted)]">
                <i class="fas fa-heart-broken text-[2rem] mb-[0.5rem] opacity-50"></i>
                <p class="m-0 text-[0.9rem]">No se encontraron juegos favoritos</p>
                <small>Los juegos pueden haber sido eliminados</small>
            </div>
        `;
        return;
    }

    let html = '';
    favoriteGames.forEach(game => {
        const imageUrl = game.thumb || `https://via.placeholder.com/50x50/cccccc/333333?text=${encodeURIComponent(game.title.substring(0, 1))}`;
        const categoryIcon = getCategoryIcon(game.category);
        
        // HTML Actualizado con Tailwind
        html += `
            <div class="favorite-game-item flex items-center gap-[0.8rem] p-[0.8rem] mb-[0.5rem] rounded-[12px] bg-[var(--bg-main)] cursor-pointer transition-all duration-200 border border-transparent hover:bg-[var(--bg-sidebar-hover)] hover:border-[var(--accent)] hover:translate-x-[5px]" data-game-title="${game.title}">
                <div class="favorite-game-image w-[50px] h-[50px] min-w-[50px] rounded-[8px] overflow-hidden bg-[var(--bg-card)] flex items-center justify-center">
                    <img src="${imageUrl}" 
                         alt="${game.title}"
                         class="w-full h-full object-cover"
                         onerror="this.src='https://via.placeholder.com/50x50/cccccc/333333?text=G'">
                </div>
                <div class="favorite-game-content flex-1 overflow-hidden">
                    <div class="favorite-game-title font-semibold text-[var(--text-primary)] text-[0.9rem] mb-[0.2rem] whitespace-nowrap overflow-hidden text-ellipsis">${game.title}</div>
                    <div class="favorite-game-category text-[0.8rem] text-[var(--text-muted)] flex items-center gap-[0.3rem]">
                        <i class="${categoryIcon}"></i>
                        ${game.category}
                    </div>
                </div>
                <div class="favorite-game-actions flex gap-[0.3rem]">
                    <button class="favorite-game-remove bg-transparent border-none text-[var(--text-muted)] cursor-pointer p-[0.3rem] rounded-[4px] transition-colors hover:text-[var(--favorite-color)] hover:bg-[rgba(255,71,87,0.1)]" 
                            data-game="${game.title}"
                            title="Quitar de favoritos">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    });

    favoritesList.innerHTML = html;
    setupFavoriteItemsListeners();
}

function hideFavoritesInPanel() {
    const favoritesSection = document.getElementById('favoritesSection');
    const userMenu = document.querySelector('.user-menu');
    
    if (favoritesSection) {
        favoritesSection.style.display = 'none';
        favoritesSection.classList.add('hidden');
    }
    if (userMenu) userMenu.style.display = 'block';
}

function setupFavoriteItemsListeners() {
    document.querySelectorAll('.favorite-game-item').forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.closest('.favorite-game-remove')) return;
            const gameTitle = this.getAttribute('data-game-title');
            const game = AppState.games.find(g => g.title === gameTitle);
            
            if (game && game.gameUrl) {
                showPageLoading('Cargando juego...');
                
                const loadingTimeout = setTimeout(() => {
                    hidePageLoading();
                }, 5000);
                
                try {
                    window.location.href = game.gameUrl;
                } catch (error) {
                    clearTimeout(loadingTimeout);
                    hidePageLoading();
                    api.showNotification('Error al cargar el juego', 'error');
                }
            } else {
                api.showNotification('Juego no disponible', 'error');
            }
        });
    });

    document.querySelectorAll('.favorite-game-remove').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            e.preventDefault();
            const gameTitle = this.getAttribute('data-game');
            
            if (!AppState.currentUser) {
                api.showNotification('Debes iniciar sesión para modificar favoritos', 'error');
                return;
            }

            try {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                this.disabled = true;
                
                const response = await api.toggleFavorite(gameTitle);
                
                if (response.success) {
                    AppState.favorites = response.favorites || [];
                    updateUserStats();
                    updateFavoriteButtons();
                    showFavoritesInPanel();
                    api.showNotification('Removido de favoritos', 'info');
                } else {
                    api.showNotification(response.error || 'Error al quitar favorito', 'error');
                }
            } catch (error) {
                api.showNotification('Error de conexión', 'error');
            }
        });
    });
}

function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const gameTitle = btn.getAttribute('data-game');
        const isFavorite = AppState.favorites.includes(gameTitle);
        
        // Mantenemos la lógica de clases, pero el CSS de Tailwind manejará el color
        if (isFavorite) {
            btn.classList.add('favorited'); // Asegúrate de que .favorited tenga estilo en Tailwind o añade clase de color aquí
            btn.classList.add('text-[var(--favorite-color)]', 'bg-[rgba(0,0,0,0.5)]');
            btn.setAttribute('title', 'Quitar de favoritos');
        } else {
            btn.classList.remove('favorited');
            btn.classList.remove('text-[var(--favorite-color)]', 'bg-[rgba(0,0,0,0.5)]');
            btn.setAttribute('title', 'Añadir a favoritos');
        }
    });
}

let searchDebounceTimeout;
let currentSuggestions = [];

function showSearchSuggestions(searchTerm) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer) return;

    if (!searchTerm.trim()) {
        hideSearchSuggestions();
        return;
    }

    const filteredGames = AppState.games.filter(game => {
        const searchLower = searchTerm.toLowerCase();
        return (
            game.title.toLowerCase().includes(searchLower) ||
            game.category.toLowerCase().includes(searchLower) ||
            game.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
            game.description?.toLowerCase().includes(searchLower) ||
            game.developer?.toLowerCase().includes(searchLower)
        );
    }).slice(0, 8); 

    currentSuggestions = filteredGames;

    let html = '';
    if (filteredGames.length > 0) {
        html += `
            <div class="search-suggestions-header p-[10px_12px] border-b border-[var(--text-muted)] text-[0.85rem] text-[var(--text-muted)] flex justify-between items-center bg-[var(--bg-main)] rounded-t-[12px]">
                <span><span class="search-suggestions-count font-semibold text-[var(--accent)]">${filteredGames.length}</span> sugerencias</span>
                <button class="search-suggestions-clear bg-transparent border-none text-[var(--text-muted)] text-[0.8rem] cursor-pointer p-[4px_10px] rounded-[4px] transition-all duration-200 flex items-center gap-[4px] hover:text-[var(--accent)] hover:bg-[var(--bg-sidebar-hover)]" id="clearSuggestions">
                    <i class="fas fa-times"></i> Limpiar
                </button>
            </div>
        `;
        
        filteredGames.forEach(game => {
            const isFavorite = AppState.favorites.includes(game.title);
            const highlightTitle = highlightMatches(game.title, searchTerm);
            const imageUrl = game.thumb || `https://via.placeholder.com/48x48/cccccc/333333?text=${encodeURIComponent(game.title.substring(0, 1))}`;
            const ratingStars = getRatingStars(game.rating || 0);
            
            html += `
                <div class="search-suggestion-item p-[8px_12px] cursor-pointer border-b border-[var(--text-muted)] transition-colors duration-200 flex items-center gap-[12px] min-h-[60px] last:border-b-0 hover:bg-[var(--bg-sidebar-hover)] group" 
                     data-game-id="${game.id}" 
                     data-game-title="${game.title}"
                     title="${game.title} - ${game.category}">
                    <div class="suggestion-image w-[48px] h-[48px] min-w-[48px] rounded-[8px] overflow-hidden bg-[var(--bg-main)] flex items-center justify-center border border-[var(--text-muted)]">
                        <img src="${imageUrl}" 
                             alt="${game.title}"
                             class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                             onerror="this.src='https://via.placeholder.com/48x48/cccccc/333333?text=G'; this.onerror=null;">
                    </div>
                    <div class="suggestion-content flex-1 flex flex-col gap-[4px] overflow-hidden">
                        <div class="suggestion-title font-semibold text-[var(--text-primary)] text-[0.95rem] leading-tight line-clamp-2">${highlightTitle}</div>
                        <div class="suggestion-meta flex items-center gap-[8px] text-[0.8rem]">
                            <span class="suggestion-category text-[var(--text-muted)] bg-[var(--bg-main)] p-[2px_8px] rounded-[10px] flex items-center gap-[4px]">
                                <i class="${getCategoryIcon(game.category)} text-[0.7rem]"></i>
                                ${game.category}
                            </span>
                            ${ratingStars}
                            ${isFavorite ? '<span class="suggestion-favorite active text-[var(--favorite-color)]"><i class="fas fa-heart"></i></span>' : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    } else {
        html = `
            <div class="search-suggestion-item empty p-[20px] text-center text-[var(--text-muted)] italic flex flex-col items-center justify-center gap-[10px]">
                <i class="fas fa-search text-[1.5rem] opacity-50"></i>
                <span>No se encontraron juegos para "${searchTerm}"</span>
                <small>Intenta con otro término de búsqueda</small>
            </div>
        `;
    }

    suggestionsContainer.innerHTML = html;
    suggestionsContainer.classList.add('show');
    setupSuggestionListeners();
}

function getRatingStars(rating) {
    if (!rating || rating === 0) return '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    return `<span class="suggestion-rating text-[var(--star-color)] flex items-center gap-[2px] text-[0.7rem]">${stars}</span>`;
}

function highlightMatches(text, searchTerm) {
    if (!searchTerm.trim()) return text;
    const searchLower = searchTerm.toLowerCase();
    const textLower = text.toLowerCase();
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<span class="highlight bg-[rgba(130,102,90,0.2)] text-[var(--accent)] font-semibold p-[0_2px] rounded-[2px]">$1</span>');
}

function getCategoryIcon(category) {
    const iconMap = {
        'Aventura': 'fas fa-mountain',
        'Puzzle': 'fas fa-puzzle-piece',
        'Deportes': 'fas fa-running',
        'Acción': 'fas fa-fire',
        'Multijugador': 'fas fa-users',
        'Estrategia': 'fas fa-chess',
        'RPG': 'fas fa-dragon',
        'Simulación': 'fas fa-car',
        'Carreras': 'fas fa-flag-checkered',
        'Terror': 'fas fa-ghost',
        'Plataformas': 'fas fa-shoe-prints',
        'Disparos': 'fas fa-crosshairs',
        'Lucha': 'fas fa-hand-fist',
        'Musical': 'fas fa-music',
        'Educativo': 'fas fa-graduation-cap',
        'Arcade': 'fas fa-gamepad',
        'Survival': 'fas fa-campground',
        'Mundo Abierto': 'fas fa-globe',
        'VR': 'fas fa-vr-cardboard',
        'Todos': 'fas fa-gamepad'
    };
    return iconMap[category] || 'fas fa-gamepad';
}

function setupSuggestionListeners() {
    document.querySelectorAll('.search-suggestion-item:not(.empty)').forEach(item => {
        item.addEventListener('click', function() {
            const gameId = this.getAttribute('data-game-id');
            const gameTitle = this.getAttribute('data-game-title');
            const game = AppState.games.find(g => g.id == gameId || g.title === gameTitle);
            
            if (game && game.gameUrl) {
                showPageLoading('Cargando juego...');
                
                const loadingTimeout = setTimeout(() => {
                    hidePageLoading();
                }, 5000);
                
                try {
                    window.location.href = game.gameUrl;
                } catch (error) {
                    clearTimeout(loadingTimeout);
                    hidePageLoading();
                    api.showNotification('Error al cargar el juego', 'error');
                }
            } else {
                api.showNotification('Juego no disponible', 'error');
            }
            
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
            }
            hideSearchSuggestions();
        });
    });

    const clearBtn = document.getElementById('clearSuggestions');
    if (clearBtn) {
        clearBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = '';
                AppState.currentSearch = '';
            }
            hideSearchSuggestions();
        });
    }
}

function hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (suggestionsContainer) {
        suggestionsContainer.classList.remove('show');
        suggestionsContainer.innerHTML = '';
        currentSuggestions = [];
    }
}

function setupKeyboardNavigation() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    let selectedIndex = -1;

    searchInput.addEventListener('keydown', function(e) {
        const suggestions = document.querySelectorAll('.search-suggestion-item:not(.empty)');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (suggestions.length > 0) {
                    selectedIndex = (selectedIndex + 1) % suggestions.length;
                    updateSelectedSuggestion(suggestions, selectedIndex);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (suggestions.length > 0) {
                    selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
                    updateSelectedSuggestion(suggestions, selectedIndex);
                }
                break;
            case 'Enter':
                if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                    e.preventDefault();
                    suggestions[selectedIndex].click();
                } else if (this.value.trim()) {
                    e.preventDefault();
                    const searchTerm = this.value.trim().toLowerCase();
                    const matchingGame = AppState.games.find(game => 
                        game.title.toLowerCase().includes(searchTerm) ||
                        game.category.toLowerCase().includes(searchTerm)
                    );
                    
                    if (matchingGame && matchingGame.gameUrl) {
                        showPageLoading('Cargando juego...');
                        
                        const loadingTimeout = setTimeout(() => {
                            hidePageLoading();
                        }, 5000);
                        
                        try {
                            window.location.href = matchingGame.gameUrl;
                        } catch (error) {
                            clearTimeout(loadingTimeout);
                            hidePageLoading();
                            api.showNotification('Error al cargar el juego', 'error');
                        }
                    } else {
                        api.showNotification('No se encontró el juego', 'info');
                    }
                    hideSearchSuggestions();
                }
                break;
            case 'Escape':
                hideSearchSuggestions();
                break;
            case 'Tab':
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    if (activeElement !== searchInput && !activeElement.closest('.search-suggestions')) {
                        hideSearchSuggestions();
                    }
                }, 10);
                break;
        }
    });
}

function updateSelectedSuggestion(suggestions, index) {
    suggestions.forEach((suggestion, i) => {
        if (i === index) {
            suggestion.style.backgroundColor = 'var(--bg-sidebar-hover)';
            suggestion.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            suggestion.style.backgroundColor = '';
        }
    });
}

function filterGamesLocally(category = 'Todos', searchTerm = '') {
    AppState.currentCategory = category;
    AppState.currentSearch = ''; 
    
    if (category === 'Todos') {
        AppState.filteredGames = [...AppState.games];
    } else {
        AppState.filteredGames = AppState.games.filter(game => 
            game.category === category
        );
    }
    renderFilteredGames();
}

async function loadAllGames() {
    showLoading();
    try {
        const response = await api.getGames('Todos', '');
        if (response.success) {
            AppState.games = response.games;
            AppState.filteredGames = [...response.games]; 
            AppState.allGamesLoaded = true;
            renderFilteredGames();
        } else {
            api.showNotification('Error al cargar juegos', 'error');
            renderNoGames();
        }
    } catch (error) {
        api.showNotification('Error de conexión al cargar juegos', 'error');
        renderNoGames();
    } finally {
        hideLoading();
    }
}

function renderFilteredGames() {
    const gamesGrid = document.getElementById('gamesGrid');
    if (!gamesGrid) return;

    if (AppState.filteredGames.length === 0) {
        renderNoFilteredGames();
        return;
    }

    let html = '';
    AppState.filteredGames.forEach((game, index) => {
        const isFavorite = AppState.favorites.includes(game.title);
        const favoriteClass = isFavorite ? 'favorited text-[var(--favorite-color)] bg-[rgba(0,0,0,0.5)]' : '';
        const favoriteTitle = isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos';
        
        const hash = simpleHash(game.title);
        // Traducción de clases antiguas a Tailwind
        const gridSpan = (hash % 100) < 85 ? 'col-span-1 aspect-square' : 'col-span-2 aspect-[2/1]';
        
        const imageUrl = game.thumb || `https://via.placeholder.com/300x300/cccccc/333333?text=${encodeURIComponent(game.title.substring(0, 1))}`;
        
        // Plantilla actualizada con clases de Tailwind completas
        const gameCard = `
            <div class="game-card ${gridSpan} bg-[image:var(--gradient-card)] rounded-[12px] shadow-[var(--shadow-large)] overflow-visible cursor-pointer transition-all duration-300 ease-out relative block border-[2px] border-transparent hover:-translate-y-[8px] hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(130,102,90,0.3)] hover:border-[var(--accent)] group [will-change:transform]" 
                 data-id="${game.id}" 
                 data-title="${game.title}"
                 title="${game.title} - ${game.category}"
                 style="animation-delay: ${index * 0.05}s;">
                <div class="rounded-[12px] overflow-hidden w-full h-full">
                    <img src="${imageUrl}" alt="${game.title}" class="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" 
                         onerror="this.src='https://via.placeholder.com/300x300/cccccc/333333?text=Game'">
                </div>
                
                <button class="favorite-btn ${favoriteClass} absolute top-[8px] right-[8px] bg-[var(--glass-effect-dark)] border border-[rgba(255,255,255,0.2)] w-[34px] h-[34px] rounded-full flex items-center justify-center cursor-pointer text-white transition-all duration-200 backdrop-blur-[8px] text-[1rem] opacity-0 group-hover:opacity-100 hover:bg-[var(--glass-effect-darker)] hover:text-[var(--favorite-color)] hover:scale-[1.1]" 
                        data-game="${game.title}"
                        title="${favoriteTitle}"
                        aria-label="${favoriteTitle}">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
        `;
        html += gameCard;
    });

    gamesGrid.innerHTML = html;
    addGameEventListeners();
}

function renderNoFilteredGames() {
    const gamesGrid = document.getElementById('gamesGrid');
    if (!gamesGrid) return;

    const message = AppState.currentCategory !== 'Todos'
        ? `No hay juegos en la categoría "${AppState.currentCategory}"`
        : 'No se encontraron juegos';

    // HTML actualizado con Tailwind
    gamesGrid.innerHTML = `
        <div class="no-results flex flex-col items-center justify-center p-[60px_20px] text-center col-span-full gap-[20px]">
            <i class="fas fa-gamepad text-[4rem] text-[var(--text-muted)] opacity-50 mb-0"></i>
            <h3 class="m-0 text-[var(--text-primary)] text-[1.5rem] font-semibold">${message}</h3>
            <p class="m-0 text-[var(--text-muted)] text-[1rem] max-w-[400px] leading-relaxed">Intenta con otra categoría</p>
            <button class="btn btn-primary mt-[10px] p-[12px_24px] text-[1rem] rounded-[12px] font-medium cursor-pointer transition-all duration-200 inline-flex items-center gap-[0.5rem] bg-[image:var(--gradient-accent)] text-white hover:opacity-90 hover:-translate-y-[2px]" id="resetFilterBtn">
                <i class="fas fa-undo"></i> Mostrar todos los juegos
            </button>
        </div>
    `;

    const resetBtn = document.getElementById('resetFilterBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-category').forEach(c => c.classList.remove('active'));
            const allCategoryBtn = document.querySelector('.sidebar-category[data-category="Todos"]');
            if (allCategoryBtn) allCategoryBtn.classList.add('active');
            
            filterGamesLocally('Todos');
            api.showNotification('Mostrando todos los juegos', 'info');
        });
    }
}

// (La sección 'api' permanece igual, no tiene manipulación de DOM)
const api = {
    async checkAuth() {
        try {
            const response = await fetch('/api/auth/check');
            return response.json();
        } catch (error) {
            return { authenticated: false, error: 'Network error' };
        }
    },
    async login(email, password) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
async logout() {
        try {
            const response = await fetch('/api/auth/logout');
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async register(name, email, password, confirmPassword, username, avatar) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, confirm_password: confirmPassword, username, avatar })
            });
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async refreshSession() {
        try {
            const response = await fetch('/api/auth/refresh');
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async getGames(category = 'Todos', search = '') {
        try {
            let url = `/api/games?category=${encodeURIComponent(category)}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            const response = await fetch(url);
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async getRandomGame() {
        try {
            const response = await fetch('/api/games/random');
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async shuffleGames() {
        try {
            const response = await fetch('/api/games/shuffle');
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async toggleFavorite(gameTitle) {
        if (!AppState.currentUser) {
            return { 
                success: false, 
                error: 'Authentication required',
                requiresLogin: true 
            };
        }
        try {
            const response = await fetch('/api/favorites/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ game_title: gameTitle })
            });
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async updateSettings(settings) {
        try {
            const response = await fetch('/api/settings/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async submitGameForm(formData) {
        try {
            const response = await fetch('/api/games/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async getUserStats() {
        if (!AppState.currentUser) {
            return { 
                success: false, 
                error: 'Not authenticated',
                stats: { favorites_count: 0 }
            };
        }
        try {
            const response = await fetch('/api/user/stats');
            return response.json();
        } catch (error) {
            return { 
                success: false, 
                error: 'Network error',
                stats: { favorites_count: 0 }
            };
        }
    },
    async changePassword(currentPassword, newPassword, confirmNewPassword) {
        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    confirm_new_password: confirmNewPassword
                })
            });
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    async updateProfile(profileData) {
        try {
            const response = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: profileData.username,
                    firstName: profileData.firstName,
                    lastName: profileData.lastName,
                    name: profileData.name,
                    email: profileData.email,
                    avatar: profileData.avatar
                })
            });
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    // Notificaciones "Toast" flotantes
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        // Clases de Tailwind para notificación flotante
        let bgClass = 'bg-[var(--info-color)]';
        if (type === 'error') bgClass = 'bg-[var(--error-color)]';
        if (type === 'success') bgClass = 'bg-[var(--success-color)]';
        if (type === 'warning') bgClass = 'bg-[var(--warning-color)]';

        notification.className = `notification fixed bottom-[20px] right-[20px] p-[12px_20px] rounded-[6px] text-white z-[4000] translate-x-full transition-transform duration-300 ease-out max-w-[300px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] font-poppins text-[14px] ${bgClass}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', async function() {
    loadLocalConfig();
    await checkAuth();
    if (AppState.currentUser) {
        startSessionRefresh();
    }
    
    // Check session every minute
    setInterval(checkAndRestoreSession, 60 * 1000);

    // Initial Load
    await loadAllGames();
    
    setupEventListeners();
    setupGameForm();
    renderNotifications();

    // Re-check session on window focus
    window.addEventListener('focus', function() {
        checkAndRestoreSession();
    });
    
    // Re-check logic for mobile/tab switching
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            setTimeout(checkAndRestoreSession, 1000);
            // Ocultar loading overlay si existe cuando volvemos a la página
            hidePageLoading();
        }
    });
    
    // Limpiar loading overlay cuando se vuelve a la página (botón atrás del navegador)
    window.addEventListener('pageshow', function(event) {
        // Si la página se carga desde el cache (BFCache), ocultar loading
        if (event.persisted) {
            hidePageLoading();
        }
    });

    // Welcome message if logged in
    setTimeout(() => {
        if (AppState.currentUser) {
            addNotification(`¡Bienvenido de nuevo, ${AppState.currentUser.name}!`, 'Esperamos que disfrutes de nuestros juegos.', 'welcome');
        }
    }, 2000);

// =================================================================
    // FIX: Handle Resize Events to Reset Mobile States when Switching
    // =================================================================
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            // 1. Reset Sidebar & Main Content classes
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            // Usar AppState en lugar de localStorage para respetar el estado actual
            const shouldShowSidebar = AppState.sidebarVisible;

            if (shouldShowSidebar) {
                if (sidebar) {
                    sidebar.classList.remove('hidden');
                    sidebar.classList.remove('-translate-x-full');
                }
                if (mainContent) {
                    mainContent.classList.remove('sidebar-hidden', 'ml-0', 'w-full');
                    mainContent.classList.add('ml-[68px]', 'w-[calc(100vw-90px)]');
                }
                AppState.sidebarVisible = true;
            } else {
                // If it was hidden by preference, ensure desktop hidden styling
                if (sidebar) sidebar.classList.add('hidden');
                if (mainContent) {
                    mainContent.classList.add('sidebar-hidden', 'ml-0', 'w-full');
                    mainContent.classList.remove('ml-[68px]', 'w-[calc(100vw-90px)]');
                }
            }

            // 2. Remove Mobile Overlay
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.remove();

            // 3. Force close Mobile Search if open AND clean up its content
            const mobileSearchModal = document.getElementById('mobileSearchModal');
            if (mobileSearchModal?.classList.contains('show')) {
                hideMobileSearchModal();
            }
            // Also ensure modal is completely hidden even if show class wasn't present
            if (mobileSearchModal) {
                mobileSearchModal.classList.remove('show');
                // Clean up search input and results
                const mobileSearchInput = document.getElementById('mobileSearchInput');
                const mobileSearchResults = document.getElementById('mobileSearchResults');
                const mobileSearchCategories = document.getElementById('mobileSearchCategories');
                
                if (mobileSearchInput) mobileSearchInput.value = '';
                if (mobileSearchResults) {
                    mobileSearchResults.style.display = 'none';
                    mobileSearchResults.innerHTML = '';
                }
                if (mobileSearchCategories) {
                    mobileSearchCategories.style.display = 'grid';
                }
            }

            // 4. Update Icons
            updateSidebarIcon();
            
            // 5. Unlock scroll if it was locked by a mobile modal
            if (!document.getElementById('authModal')?.classList.contains('show') && 
                !document.getElementById('createGameContainer')?.classList.contains('show') &&
                !document.getElementById('userPanel')?.classList.contains('show') &&
                !document.getElementById('notificationsPanel')?.classList.contains('show')) {
                document.body.style.overflow = '';
            }
        }
    });
});

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleBtn = document.getElementById('toggleSidebar');
    
    if (!sidebar || !mainContent) return;

    // Usamos clases de Tailwind para ocultar/mostrar
    // .hidden en Tailwind es display: none
    const isHidden = sidebar.classList.contains('hidden');

    if (isHidden) {
        sidebar.classList.remove('hidden');
        mainContent.classList.remove('sidebar-hidden'); // Esta clase se usaba para márgenes, ahora controlamos con clases
        
        // Ajustes de Tailwind para Desktop
        if (window.innerWidth > 1024) {
            mainContent.classList.remove('ml-0', 'w-full');
            mainContent.classList.add('ml-[68px]', 'w-[calc(100vw-90px)]');
        } else {
            // Mobile Overlay
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay fixed inset-0 bg-[var(--overlay-dark-opacity)] z-[1099] opacity-0 invisible transition-all duration-300';
                overlay.addEventListener('click', toggleSidebar);
                document.body.appendChild(overlay);
            }
            // Mostrar overlay
            overlay.classList.remove('opacity-0', 'invisible');
            overlay.classList.add('opacity-100', 'visible');
            
            // Sidebar en mobile
            sidebar.classList.remove('-translate-x-full');
        }
        
        localStorage.setItem('sidebarHidden', 'false');
        AppState.sidebarVisible = true;
    } else {
        sidebar.classList.add('hidden');
        mainContent.classList.add('sidebar-hidden');
        
        // Ajustes Tailwind
        mainContent.classList.add('ml-0', 'w-full');
        mainContent.classList.remove('ml-[68px]', 'w-[calc(100vw-90px)]');
        
        if (window.innerWidth <= 1024) {
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.classList.remove('opacity-100', 'visible');
                overlay.classList.add('opacity-0', 'invisible');
                setTimeout(() => overlay.remove(), 300);
            }
            sidebar.classList.add('-translate-x-full');
        }

        localStorage.setItem('sidebarHidden', 'true');
        AppState.sidebarVisible = false;
    }

    updateSidebarIcon();
    
    // Re-layout grid if needed
    if (AppState.filteredGames.length > 0) {
        setTimeout(() => {
            renderFilteredGames();
        }, 400);
    }
}

function updateSidebarIcon() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    if (!sidebar) return;
    
    const isHidden = sidebar.classList.contains('hidden');
    const icon = isHidden ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
    
    if (toggleBtn) {
        const toggleIcon = toggleBtn.querySelector('i');
        if (toggleIcon) toggleIcon.className = icon;
        toggleBtn.title = isHidden ? 'Mostrar categorías' : 'Ocultar categorías';
    }
    
    if (sidebarToggle) {
        const sidebarIcon = sidebarToggle.querySelector('i');
        if (sidebarIcon) sidebarIcon.className = icon;
    }
}

function loadSidebarState() {
    const sidebarHidden = localStorage.getItem('sidebarHidden');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const toggleBtn = document.getElementById('toggleSidebar');
    
    if (window.innerWidth > 1024 && sidebarHidden === 'true' && sidebar && mainContent) {
        sidebar.classList.add('hidden');
        mainContent.classList.add('ml-0', 'w-full');
        mainContent.classList.remove('ml-[68px]', 'w-[calc(100vw-90px)]');
        AppState.sidebarVisible = false;
    } else {
        if (sidebar && mainContent) {
            sidebar.classList.remove('hidden');
            if (window.innerWidth > 1024) {
                mainContent.classList.add('ml-[68px]', 'w-[calc(100vw-90px)]');
                mainContent.classList.remove('ml-0', 'w-full');
            }
        }
        AppState.sidebarVisible = true;
    }
    updateSidebarIcon();
}

function loadLocalConfig() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    AppState.theme = savedTheme;
    loadSidebarState();
    updateThemeIcon();
    
    setTimeout(() => {
        setupKeyboardNavigation();
    }, 500);
}

async function checkAuth() {
    try {
        const response = await api.checkAuth();
        if (response.authenticated) {
            AppState.currentUser = response.user;
            AppState.favorites = response.favorites || [];
            
            // Normalizar estructura de datos del usuario
            // Asegurar que username exista
            if (!AppState.currentUser.username && AppState.currentUser.email) {
                AppState.currentUser.username = AppState.currentUser.email.split('@')[0];
            }
            
            // Asegurar que firstName y lastName existan
            if (!AppState.currentUser.firstName || !AppState.currentUser.lastName) {
                const nameParts = (AppState.currentUser.name || '').trim().split(' ');
                if (!AppState.currentUser.firstName) {
                    AppState.currentUser.firstName = nameParts[0] || '';
                }
                if (!AppState.currentUser.lastName) {
                    AppState.currentUser.lastName = nameParts.slice(1).join(' ') || '';
                }
            }
            
            // Generate avatar if missing
            if (!AppState.currentUser.profile) {
                AppState.currentUser.profile = {};
            }
            
            // Verificar avatar en ambas ubicaciones
            const hasAvatar = AppState.currentUser.avatar || AppState.currentUser.profile.avatar;
            
            if (!hasAvatar) {
                const emailHash = md5(AppState.currentUser.email);
                const avatarStyles = ['identicon', 'bottts', 'avataaars', 'jdenticon', 'micah'];
                const styleIndex = Array.from(AppState.currentUser.email).reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarStyles.length;
                const style = avatarStyles[styleIndex];
                const generatedAvatar = `https://api.dicebear.com/7.x/${style}/png?seed=${emailHash}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
                
                // Guardar en ambas ubicaciones
                AppState.currentUser.avatar = generatedAvatar;
                AppState.currentUser.profile.avatar = generatedAvatar;
            } else {
                // Sincronizar avatar entre ambas ubicaciones
                if (AppState.currentUser.avatar && !AppState.currentUser.profile.avatar) {
                    AppState.currentUser.profile.avatar = AppState.currentUser.avatar;
                } else if (AppState.currentUser.profile.avatar && !AppState.currentUser.avatar) {
                    AppState.currentUser.avatar = AppState.currentUser.profile.avatar;
                }
            }

            updateUserUI();
            updateUserStats();
        } else {
            AppState.currentUser = null;
            AppState.favorites = [];
            resetUserUI();
        }
    } catch (error) {
        AppState.currentUser = null;
        AppState.favorites = [];
        resetUserUI();
    }
}

function md5(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

function showLoading() {
    AppState.isLoading = true;
    const gamesGrid = document.getElementById('gamesGrid');
    if (gamesGrid) {
        gamesGrid.innerHTML = `
            <div class="loading flex justify-center items-center h-[200px] col-span-full">
                <div class="spinner w-[40px] h-[40px] border-[4px] border-[rgba(34,32,36,0.2)] rounded-full border-t-[var(--accent)] animate-[spin_1s_ease-in-out_infinite]"></div>
                <p class="ml-[10px]">Cargando juegos...</p>
            </div>
        `;
    }
}

function hideLoading() {
    AppState.isLoading = false;
}

function updateUserStats() {
    const userFavoritesCount = document.getElementById('userFavoritesCount');
    if (userFavoritesCount) {
        userFavoritesCount.textContent = AppState.favorites.length;
    }
    
    const userGamesCount = document.getElementById('userGamesCount');
    if (userGamesCount && AppState.currentUser) {
        const userGames = AppState.games.filter(game => 
            game.created_by === AppState.currentUser.email
        );
        userGamesCount.textContent = userGames.length;
    }
}
function updateUserUI() {
    if (!AppState.currentUser) {
        resetUserUI();
        return;
    }
    
    const userBtn = document.getElementById('userBtn');
    const createGameBtn = document.getElementById('createGameBtn');
    
    // Obtener avatar de cualquiera de las dos ubicaciones posibles
    const avatarUrl = AppState.currentUser.avatar || 
                      (AppState.currentUser.profile && AppState.currentUser.profile.avatar);
    
    if (userBtn) {
        if (avatarUrl) {
            // Mostrar imagen de avatar en el botón del header
            userBtn.innerHTML = `<img src="${avatarUrl}" 
                alt="${AppState.currentUser.name}" 
                style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            // Mostrar iniciales si no hay avatar
            const initials = AppState.currentUser.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            userBtn.innerHTML = `<span style="font-size: 1.1rem; font-weight: 600;">${initials}</span>`;
        }
        userBtn.title = 'Mi cuenta';
        userBtn.classList.add('user-logged-in');
    }

    if (createGameBtn) {
        createGameBtn.style.display = 'flex';
    }

    const userNameElement = document.getElementById('userName');
    const userUsernameElement = document.getElementById('userUsername');
    const userEmailElement = document.getElementById('userEmail');
    const userAvatarElement = document.getElementById('userAvatar');
    
    if (userNameElement) userNameElement.textContent = AppState.currentUser.name;
    if (userUsernameElement) {
        const username = AppState.currentUser.username || AppState.currentUser.email.split('@')[0];
        userUsernameElement.textContent = `@${username}`;
    }
    if (userEmailElement) userEmailElement.textContent = AppState.currentUser.email;
    
    if (userAvatarElement) {
        if (avatarUrl) {
            // Mostrar imagen de avatar en el panel de usuario
            userAvatarElement.innerHTML = `<img src="${avatarUrl}" 
                alt="${AppState.currentUser.name}" 
                style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            // Mostrar iniciales si no hay avatar
            const initials = AppState.currentUser.name
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            userAvatarElement.innerHTML = initials;
        }
    }
    
    updateUserStats();
    hideAuthModal();
}
function updateUserDisplay() {
    updateUserUI();
}

function resetUserUI() {
    const userBtn = document.getElementById('userBtn');
    const createGameBtn = document.getElementById('createGameBtn');
    
    if (userBtn) {
        userBtn.innerHTML = '<i class="fas fa-user"></i>';
        userBtn.title = 'Iniciar sesión';
        userBtn.classList.remove('user-logged-in');
    }

    if (createGameBtn) {
        createGameBtn.style.display = 'none';
    }

    const userFavoritesCount = document.getElementById('userFavoritesCount');
    const userGamesCount = document.getElementById('userGamesCount');
    
    if (userFavoritesCount) userFavoritesCount.textContent = '0';
    if (userGamesCount) userGamesCount.textContent = '0';
    
    hideUserPanel();
}

function updateThemeIcon() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            const baseClasses = 'w-[24px] text-center mr-[0.75rem]';
            const faClass = AppState.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            icon.className = `${faClass} ${baseClasses}`;
        }
    }
}

function showAuthModal(tab = 'login') {
    closeAllModals(); // Cerrar otros modales primero
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.classList.add('show');
        authModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        switchAuthTab(tab);
    }
}

function hideAuthModal() {
    const authModal = document.getElementById('authModal');
    if (authModal) {
        authModal.classList.remove('show');
        authModal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function switchAuthTab(tabName) {
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    
    const activeTab = document.querySelector(`.auth-tab[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');
    
    document.querySelectorAll('.auth-content').forEach(content => {
        content.classList.remove('active');
        content.classList.add('hidden');
    });
    
    const targetContent = document.getElementById(`${tabName}Content`);
    if (targetContent) {
        targetContent.classList.add('active');
        targetContent.classList.remove('hidden');
    }
}

function toggleUserPanel() {
    const userPanel = document.getElementById('userPanel');
    if (userPanel) {
        userPanel.classList.contains('show') ? hideUserPanel() : showUserPanel();
    }
}

function showUserPanel() {
    // Cerrar notificaciones si está abierto
    const notificationsPanel = document.getElementById('notificationsPanel');
    if (notificationsPanel) {
        notificationsPanel.classList.remove('block');
        notificationsPanel.classList.add('hidden');
    }
    
    const userPanel = document.getElementById('userPanel');
    if (userPanel && AppState.currentUser) {
        userPanel.classList.add('show');
        userPanel.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideUserPanel() {
    const userPanel = document.getElementById('userPanel');
    if (userPanel) {
        userPanel.classList.remove('show');
        userPanel.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function showPageLoading(message = 'Cargando...') {
    hidePageLoading();
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'pageLoading';
    // Clases de Tailwind
    loadingOverlay.className = 'fixed inset-0 bg-[var(--overlay-darkest-opacity)] flex items-center justify-center z-[9999] backdrop-blur-[10px]';
    loadingOverlay.innerHTML = `
        <div class="text-center text-white flex flex-col items-center gap-[20px]">
            <div class="spinner w-[60px] h-[60px] border-[4px] border-[rgba(255,255,255,0.3)] rounded-full border-t-white animate-[spin_1s_linear_infinite]"></div>
            <p class="m-0 text-[1.1rem] font-medium tracking-[0.5px]">${message}</p>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
    document.body.style.overflow = 'hidden';
}

function hidePageLoading() {
    const loadingOverlay = document.getElementById('pageLoading');
    if (loadingOverlay) {
        loadingOverlay.remove();
        document.body.style.overflow = '';
    }
}

function shuffleGameCards() {
    if (AppState.filteredGames.length > 0) {
        const shuffled = [...AppState.filteredGames];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        AppState.filteredGames = shuffled;
        renderFilteredGames();
        api.showNotification('Juegos reorganizados aleatoriamente', 'info');
    } else {
        api.showNotification('No hay juegos para reorganizar', 'warning');
    }
}

async function showUserFavorites() {
    if (!AppState.currentUser) {
        api.showNotification('Debes iniciar sesión para ver tus favoritos', 'error');
        return;
    }
    
    if (AppState.favorites.length === 0) {
        api.showNotification('No tienes juegos favoritos aún', 'info');
        return;
    }
    
    const favoriteGames = AppState.games.filter(game => 
        AppState.favorites.includes(game.title)
    );
    
    if (favoriteGames.length === 0) {
        api.showNotification('No se encontraron juegos favoritos en la lista actual', 'info');
        return;
    }
    
    const originalFilteredGames = AppState.filteredGames;
    AppState.filteredGames = favoriteGames;
    renderFilteredGames();
    
    const backButton = document.createElement('button');
    backButton.className = 'btn btn-secondary m-[20px_auto] block';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Volver a todos los juegos';
    backButton.id = 'backToAllGamesBtn';
    
    backButton.addEventListener('click', async function() {
        AppState.filteredGames = originalFilteredGames;
        renderFilteredGames();
        backButton.remove();
    });
    
    const gamesGrid = document.getElementById('gamesGrid');
    if (gamesGrid) {
        gamesGrid.appendChild(backButton);
    }
    
    api.showNotification(`Mostrando ${favoriteGames.length} juegos favoritos`, 'success');
}

function showEditProfileModal() {
    api.showNotification('Función de editar perfil en desarrollo', 'info');
}

function showChangePasswordModal() {
    closeAllModals(); // Cerrar otros modales primero
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
        changePasswordModal.classList.add('show');
        changePasswordModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function hideChangePasswordModal() {
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) {
        changePasswordModal.classList.remove('show');
        changePasswordModal.classList.add('hidden');
        document.body.style.overflow = '';
        const form = document.getElementById('changePasswordForm');
        if (form) form.reset();
    }
}
let currentProfileImageFile = null;
let currentProfileImageData = null;

// Avatares genéricos predefinidos
const GENERIC_AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Midnight&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/micah/svg?seed=Shadow&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/micah/svg?seed=Nova&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Bolt&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sky&backgroundColor=ffdfbf'
];

function showEditProfileModal() {
    closeAllModals(); // Cerrar otros modales primero
    const editProfileModal = document.getElementById('editProfileModal');
    if (!editProfileModal) return;
    
    
    // Cargar datos actuales del usuario
    if (AppState.currentUser) {
        const usernameInput = document.getElementById('editProfileUsername');
        const firstNameInput = document.getElementById('editProfileFirstName');
        const lastNameInput = document.getElementById('editProfileLastName');
        const nameInput = document.getElementById('editProfileName');
        const emailInput = document.getElementById('editProfileEmail');
        const avatarPreview = document.getElementById('editProfileAvatarPreview');
        const avatarImage = document.getElementById('editProfileAvatarImage');
        const avatarIcon = document.getElementById('editProfileAvatarIcon');
        const removePhotoBtn = document.getElementById('removeProfilePhoto');
        
        // Cargar username - usar el del usuario o generar uno del email
        const username = AppState.currentUser.username || AppState.currentUser.email.split('@')[0];
        if (usernameInput) usernameInput.value = username;
        
        // Cargar nombre y apellido si existen separados, sino partir el nombre completo
        if (AppState.currentUser.firstName && AppState.currentUser.lastName) {
            if (firstNameInput) firstNameInput.value = AppState.currentUser.firstName;
            if (lastNameInput) lastNameInput.value = AppState.currentUser.lastName;
            if (nameInput) nameInput.value = `${AppState.currentUser.firstName} ${AppState.currentUser.lastName}`;
        } else {
            // Intentar partir el nombre completo
            const fullName = AppState.currentUser.name || '';
            const nameParts = fullName.trim().split(' ');
            if (firstNameInput) firstNameInput.value = nameParts[0] || '';
            if (lastNameInput) lastNameInput.value = nameParts.slice(1).join(' ') || '';
            if (nameInput) nameInput.value = fullName;
        }
        
        if (emailInput) emailInput.value = AppState.currentUser.email || '';
        
        // Obtener avatar de cualquiera de las dos ubicaciones posibles
        const currentAvatar = AppState.currentUser.avatar || 
                             (AppState.currentUser.profile && AppState.currentUser.profile.avatar);
        
        // Mostrar avatar actual si existe
        if (currentAvatar) {
            if (avatarImage) {
                avatarImage.src = currentAvatar;
                avatarImage.classList.add('show');
                avatarImage.classList.remove('hidden');
            }
            if (avatarIcon) avatarIcon.classList.add('hide');
            if (avatarPreview) avatarPreview.classList.add('has-image');
            if (removePhotoBtn) removePhotoBtn.classList.add('show');
            currentProfileImageData = currentAvatar;
        } else {
            if (avatarImage) {
                avatarImage.classList.remove('show');
                avatarImage.classList.add('hidden');
            }
            if (avatarIcon) avatarIcon.classList.remove('hide');
            if (avatarPreview) avatarPreview.classList.remove('has-image');
            if (removePhotoBtn) removePhotoBtn.classList.remove('show');
            currentProfileImageData = null;
        }
    }
    
    // Renderizar galería de avatares genéricos
    renderGenericAvatars();
    
    editProfileModal.classList.add('show');
    editProfileModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Setup drag & drop
    setupProfileImageUpload();
}

function renderGenericAvatars() {
    const container = document.getElementById('genericAvatarsGrid');
    if (!container) return;
    
    let html = '';
    GENERIC_AVATARS.forEach((avatarUrl, index) => {
        const isSelected = currentProfileImageData === avatarUrl;
        html += `
            <div class="generic-avatar-option ${isSelected ? 'selected' : ''}" 
                 data-avatar-url="${avatarUrl}"
                 title="Avatar ${index + 1}">
                <img src="${avatarUrl}" alt="Avatar ${index + 1}">
                ${isSelected ? '<i class="fas fa-check-circle selected-badge"></i>' : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add click listeners
    container.querySelectorAll('.generic-avatar-option').forEach(option => {
        option.addEventListener('click', function() {
            selectGenericAvatar(this.getAttribute('data-avatar-url'));
        });
    });
}

function selectGenericAvatar(avatarUrl) {
    const avatarImage = document.getElementById('editProfileAvatarImage');
    const avatarIcon = document.getElementById('editProfileAvatarIcon');
    const avatarPreview = document.getElementById('editProfileAvatarPreview');
    const removePhotoBtn = document.getElementById('removeProfilePhoto');
    
    // Update preview
    if (avatarImage) {
        avatarImage.src = avatarUrl;
        avatarImage.classList.add('show');
    }
    if (avatarIcon) avatarIcon.classList.add('hide');
    if (avatarPreview) avatarPreview.classList.add('has-image');
    if (removePhotoBtn) removePhotoBtn.classList.add('show');
    
    // Update current data
    currentProfileImageData = avatarUrl;
    currentProfileImageFile = null; // Clear file if any
    
    // Update selection in grid
    renderGenericAvatars();
    
    api.showNotification('Avatar seleccionado', 'success');
}
function hideEditProfileModal() {
    const editProfileModal = document.getElementById('editProfileModal');
    if (editProfileModal) {
        editProfileModal.classList.remove('show');
        editProfileModal.classList.add('hidden');
        document.body.style.overflow = '';
        
        const form = document.getElementById('editProfileForm');
        if (form) form.reset();
        
        // Reset image
        currentProfileImageFile = null;
        const avatarImage = document.getElementById('editProfileAvatarImage');
        const avatarIcon = document.getElementById('editProfileAvatarIcon');
        const removePhotoBtn = document.getElementById('removeProfilePhoto');
        
        if (avatarImage) avatarImage.classList.remove('show');
        if (avatarIcon) avatarIcon.classList.remove('hide');
        if (removePhotoBtn) removePhotoBtn.classList.remove('show');
    }
}

function setupProfileImageUpload() {
    const dropzone = document.getElementById('profileDropzone');
    const fileInput = document.getElementById('profileImageInput');
    const avatarPreview = document.getElementById('editProfileAvatarPreview');
    const removePhotoBtn = document.getElementById('removeProfilePhoto');
    
    if (!dropzone || !fileInput) return;
    
    // Remover listeners antiguos si existen (clonar y reemplazar el elemento)
    const newDropzone = dropzone.cloneNode(true);
    dropzone.parentNode.replaceChild(newDropzone, dropzone);
    
    const newAvatarPreview = avatarPreview.cloneNode(true);
    avatarPreview.parentNode.replaceChild(newAvatarPreview, avatarPreview);
    
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    // Actualizar referencias
    const finalDropzone = document.getElementById('profileDropzone');
    const finalFileInput = document.getElementById('profileImageInput');
    const finalAvatarPreview = document.getElementById('editProfileAvatarPreview');
    const finalRemovePhotoBtn = document.getElementById('removeProfilePhoto');
    
    // Click to select file
    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        finalFileInput.click();
    };
    
    finalDropzone.addEventListener('click', handleClick);
    finalAvatarPreview.addEventListener('click', handleClick);
    
    // File input change
    finalFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleProfileImageFile(file);
        }
    });
    
    // Drag & Drop events
    finalDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        finalDropzone.classList.add('dragover');
    });
    
    finalDropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        finalDropzone.classList.remove('dragover');
    });
    
    finalDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        finalDropzone.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleProfileImageFile(file);
        } else {
            api.showNotification('Por favor, sube solo archivos de imagen', 'error');
        }
    });
    
    // Remove photo button
    if (finalRemovePhotoBtn) {
        // Remover listeners antiguos
        const newRemoveBtn = finalRemovePhotoBtn.cloneNode(true);
        finalRemovePhotoBtn.parentNode.replaceChild(newRemoveBtn, finalRemovePhotoBtn);
        
        const refreshedRemoveBtn = document.getElementById('removeProfilePhoto');
        refreshedRemoveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeProfilePhoto();
        });
    }
}

function handleProfileImageFile(file) {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        api.showNotification('La imagen es demasiado grande (máx. 5MB)', 'error');
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        api.showNotification('Por favor, sube solo archivos de imagen', 'error');
        return;
    }
    
    currentProfileImageFile = file;
    
    // Read and preview image
    const reader = new FileReader();
    reader.onload = (e) => {
        const avatarImage = document.getElementById('editProfileAvatarImage');
        const avatarIcon = document.getElementById('editProfileAvatarIcon');
        const avatarPreview = document.getElementById('editProfileAvatarPreview');
        const removePhotoBtn = document.getElementById('removeProfilePhoto');
        
        if (avatarImage) {
            avatarImage.src = e.target.result;
            avatarImage.classList.add('show');
            currentProfileImageData = e.target.result;
        }
        if (avatarIcon) avatarIcon.classList.add('hide');
        if (avatarPreview) avatarPreview.classList.add('has-image');
        if (removePhotoBtn) removePhotoBtn.classList.add('show');
        
        api.showNotification('Imagen cargada correctamente', 'success');
    };
    reader.readAsDataURL(file);
}

function removeProfilePhoto() {
    currentProfileImageFile = null;
    currentProfileImageData = null;
    
    const avatarImage = document.getElementById('editProfileAvatarImage');
    const avatarIcon = document.getElementById('editProfileAvatarIcon');
    const avatarPreview = document.getElementById('editProfileAvatarPreview');
    const removePhotoBtn = document.getElementById('removeProfilePhoto');
    const fileInput = document.getElementById('profileImageInput');
    
    if (avatarImage) {
        avatarImage.src = '';
        avatarImage.classList.remove('show');
    }
    if (avatarIcon) avatarIcon.classList.remove('hide');
    if (avatarPreview) avatarPreview.classList.remove('has-image');
    if (removePhotoBtn) removePhotoBtn.classList.remove('show');
    if (fileInput) fileInput.value = '';
    
    api.showNotification('Foto de perfil eliminada', 'info');
}

async function handleEditProfileSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('editProfileUsername').value.trim();
    const firstName = document.getElementById('editProfileFirstName').value.trim();
    const lastName = document.getElementById('editProfileLastName').value.trim();
    const email = document.getElementById('editProfileEmail').value.trim();
    
    if (!username || !firstName || !lastName || !email) {
        api.showNotification('Por favor, completa todos los campos', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        api.showNotification('Por favor, ingresa un email válido', 'error');
        return;
    }
    
    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        api.showNotification('El nombre de usuario debe tener 3-20 caracteres (solo letras, números y guión bajo)', 'error');
        return;
    }
    
    showPageLoading('Actualizando perfil...');
    
    try {
        // Prepare data - keep existing avatar if no new one was uploaded
        const fullName = `${firstName} ${lastName}`;
        const profileData = {
            username: username,
            firstName: firstName,
            lastName: lastName,
            name: fullName,
            email: email,
            avatar: currentProfileImageData || AppState.currentUser.avatar // Use current upload or keep existing
        };
        
        const response = await api.updateProfile(profileData);
        
        if (response.success) {
            // Update AppState with all new values
            AppState.currentUser.username = username;
            AppState.currentUser.firstName = firstName;
            AppState.currentUser.lastName = lastName;
            AppState.currentUser.name = fullName;
            AppState.currentUser.email = email;
            // Update avatar with the one sent (either new upload or existing)
            if (profileData.avatar) {
                AppState.currentUser.avatar = profileData.avatar;
                // También actualizar en profile.avatar para compatibilidad
                if (!AppState.currentUser.profile) {
                    AppState.currentUser.profile = {};
                }
                AppState.currentUser.profile.avatar = profileData.avatar;
            }
            
            // Update UI
            updateUserDisplay();
            
            api.showNotification(response.message || 'Perfil actualizado con éxito', 'success');
            hideEditProfileModal();
        } else {
            api.showNotification(response.error || 'Error al actualizar perfil', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        api.showNotification('Error de conexión al actualizar perfil', 'error');
    } finally {
        hidePageLoading();
    }
}

// ==========================================
// END EDIT PROFILE MODAL FUNCTIONS
// ==========================================

function setupEventListeners() {
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    const sidebarToggleBtn = document.getElementById('sidebarToggle');
    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            AppState.currentUser ? toggleUserPanel() : showAuthModal('login');
        });
    }

    const notificationsBtn = document.getElementById('notificationsBtn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleNotificationsPanel();
        });
    }

    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            markAllNotificationsAsRead();
        });
    }

    const clearNotificationsBtn = document.getElementById('clearNotificationsBtn');
    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            clearAllNotifications();
        });
    }

    // Formularios Login/Registro/Etc (Sin cambios en lógica, solo asegurando selectores)
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                api.showNotification('Por favor completa todos los campos', 'error');
                return;
            }

            showPageLoading('Iniciando sesión...');
            
            try {
                const response = await api.login(email, password);
                
                if (response.success) {
                    AppState.currentUser = response.user;
                    AppState.favorites = response.favorites || [];
                    updateUserUI();
                    renderFilteredGames();
                    startSessionRefresh(); 
                    addNotification(`¡Bienvenido de nuevo, ${response.user.name}!`, 'Esperamos que disfrutes de nuestros juegos.', 'welcome');
                    api.showNotification(response.message || '¡Bienvenido!', 'success');
                    hideAuthModal();
                } else {
                    api.showNotification(response.error || 'Error al iniciar sesión', 'error');
                }
            } catch (error) {
                api.showNotification('Error de conexión', 'error');
            } finally {
                hidePageLoading();
            }
        });
    }

    // Registration Step 1 form
    const registerFormStep1 = document.getElementById('registerFormStep1');
    if (registerFormStep1) {
        registerFormStep1.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('registerFirstName').value.trim();
            const lastName = document.getElementById('registerLastName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            // Validations
            if (!firstName || !lastName || !email || !password || !confirmPassword) {
                api.showNotification('Por favor completa todos los campos', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                api.showNotification('Las contraseñas no coinciden', 'error');
                return;
            }
            
            if (password.length < 6) {
                api.showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                api.showNotification('El formato del email no es válido', 'error');
                return;
            }
            
            // Move to step 2
            goToRegisterStep2();
        });
    }
    
    // Registration Step 2 form
    const registerFormStep2 = document.getElementById('registerFormStep2');
    if (registerFormStep2) {
        registerFormStep2.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('registerFirstName').value.trim();
            const lastName = document.getElementById('registerLastName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            const username = document.getElementById('registerUsername').value.trim();
            const selectedAvatar = document.getElementById('selectedAvatar').value;
            
            // Validations
            if (!username) {
                api.showNotification('Por favor ingresa un nombre de usuario', 'error');
                return;
            }
            
            if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                api.showNotification('El nombre de usuario debe tener 3-20 caracteres (solo letras, números y guión bajo)', 'error');
                return;
            }
            
            if (!selectedAvatar) {
                api.showNotification('Por favor selecciona un avatar', 'error');
                return;
            }
            
            showPageLoading('Creando cuenta...');
            
            try {
                const fullName = `${firstName} ${lastName}`;
                const response = await api.register(fullName, email, password, confirmPassword, username, selectedAvatar);
                
                if (response.success) {
                    AppState.currentUser = response.user;
                    AppState.favorites = response.favorites || [];
                    updateUserUI();
                    renderFilteredGames();
                    startSessionRefresh(); 
                    addNotification(`¡Bienvenido a SNAPP, ${firstName}!`, 'Tu cuenta ha sido creada exitosamente.', 'success');
                    api.showNotification(response.message || '¡Cuenta creada!', 'success');
                    hideAuthModal();
                    resetRegisterForm();
                } else {
                    api.showNotification(response.error || 'Error al registrarse', 'error');
                }
            } catch (error) {
                api.showNotification('Error de conexión', 'error');
            } finally {
                hidePageLoading();
            }
        });
    }
    
    // Back button to step 1
    const backToStep1Btn = document.getElementById('backToStep1');
    if (backToStep1Btn) {
        backToStep1Btn.addEventListener('click', function() {
            goToRegisterStep1();
        });
    }
    
    // Load avatars when opening register
    function loadAvatarSelection() {
        const avatarGrid = document.getElementById('avatarSelectionGrid');
        if (!avatarGrid) return;
        
        const avatars = [
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
            'https://api.dicebear.com/7.x/bottts/svg?seed=Midnight&backgroundColor=d1d4f9',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ffd5dc',
            'https://api.dicebear.com/7.x/micah/svg?seed=Shadow&backgroundColor=ffdfbf',
            'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel&backgroundColor=b6e3f4',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=c0aede',
            'https://api.dicebear.com/7.x/micah/svg?seed=Nova&backgroundColor=d1d4f9',
            'https://api.dicebear.com/7.x/bottts/svg?seed=Bolt&backgroundColor=ffd5dc',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=Sky&backgroundColor=ffdfbf'
        ];
        
        avatarGrid.innerHTML = '';
        avatars.forEach((avatarUrl, index) => {
            const avatarOption = document.createElement('div');
            avatarOption.className = 'avatar-option';
            avatarOption.innerHTML = `<img src="${avatarUrl}" alt="Avatar ${index + 1}">`;
            avatarOption.dataset.avatar = avatarUrl;
            
            avatarOption.addEventListener('click', function() {
                document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                document.getElementById('selectedAvatar').value = avatarUrl;
            });
            
            avatarGrid.appendChild(avatarOption);
        });
    }
    
    // Functions to switch between steps
    function goToRegisterStep2() {
        const step1 = document.getElementById('registerFormStep1');
        const step2 = document.getElementById('registerFormStep2');
        
        if (step1 && step2) {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            loadAvatarSelection();
            
            // Generate username suggestion
            const firstName = document.getElementById('registerFirstName').value.trim().toLowerCase();
            const lastName = document.getElementById('registerLastName').value.trim().toLowerCase();
            const usernameSuggestion = `${firstName}${lastName}`.replace(/[^a-z0-9_]/g, '').substring(0, 20);
            document.getElementById('registerUsername').value = usernameSuggestion;
        }
    }
    
    function goToRegisterStep1() {
        const step1 = document.getElementById('registerFormStep1');
        const step2 = document.getElementById('registerFormStep2');
        
        if (step1 && step2) {
            step2.classList.add('hidden');
            step1.classList.remove('hidden');
        }
    }
    
    function resetRegisterForm() {
        // Reset step 1
        document.getElementById('registerFirstName').value = '';
        document.getElementById('registerLastName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
        
        // Reset step 2
        document.getElementById('registerUsername').value = '';
        document.getElementById('selectedAvatar').value = '';
        document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
        
        // Go back to step 1
        goToRegisterStep1();
    }

    const favoritesBtn = document.getElementById('favoritesBtn');
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', async function() {
            showFavoritesInPanel();
        });
    }

    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            showEditProfileModal();
            hideUserPanel();
        });
    }

    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            showChangePasswordModal();
            hideUserPanel();
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            showPageLoading('Cerrando sesión...');
            try {
                const response = await api.logout();
                if (response.success) {
                    AppState.currentUser = null;
                    AppState.favorites = [];
                    resetUserUI();
                    renderFilteredGames();
                    stopSessionRefresh(); 
                    api.showNotification(response.message || 'Sesión cerrada', 'info');
                }
            } catch (error) {
                api.showNotification('Error al cerrar sesión', 'error');
            } finally {
                hidePageLoading();
            }
        });
    }

    const closeAuthBtn = document.getElementById('closeAuth');
    if (closeAuthBtn) {
        closeAuthBtn.addEventListener('click', hideAuthModal);
    }

    const closeUserPanelBtn = document.getElementById('closeUserPanel');
    if (closeUserPanelBtn) {
        closeUserPanelBtn.addEventListener('click', hideUserPanel);
    }

    const closeChangePasswordBtn = document.getElementById('closeChangePassword');
    if (closeChangePasswordBtn) {
        closeChangePasswordBtn.addEventListener('click', hideChangePasswordModal);
    }

    // Edit Profile Modal listeners
    const closeEditProfileBtn = document.getElementById('closeEditProfile');
    if (closeEditProfileBtn) {
        closeEditProfileBtn.addEventListener('click', hideEditProfileModal);
    }

    const cancelEditProfileBtn = document.getElementById('cancelEditProfile');
    if (cancelEditProfileBtn) {
        cancelEditProfileBtn.addEventListener('click', hideEditProfileModal);
    }

    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', handleEditProfileSubmit);
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            
            if (newPassword !== confirmNewPassword) {
                api.showNotification('Las contraseñas no coinciden', 'error');
                return;
            }
            
            if (newPassword.length < 6) {
                api.showNotification('La nueva contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }

            showPageLoading('Cambiando contraseña...');
            try {
                const response = await api.changePassword(currentPassword, newPassword, confirmNewPassword);
                
                if (response.success) {
                    api.showNotification(response.message || 'Contraseña cambiada con éxito', 'success');
                    hideChangePasswordModal();
                    changePasswordForm.reset();
                } else {
                    api.showNotification(response.error || 'Error al cambiar contraseña', 'error');
                }
            } catch (error) {
                api.showNotification('Error de conexión', 'error');
            } finally {
                hidePageLoading();
            }
        });
    }

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchAuthTab(this.getAttribute('data-tab'));
        });
    });

    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-category').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const category = this.getAttribute('data-category');
            filterGamesLocally(category, '');
            hideSearchSuggestions();
        });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            const search = this.value.trim();
            
            searchTimeout = setTimeout(() => {
                if (search.length > 0) {
                    showSearchSuggestions(search);
                } else {
                    hideSearchSuggestions();
                }
            }, 150);
        });

        searchInput.addEventListener('focus', function() {
            const search = this.value.trim();
            if (search.length > 0) {
                setTimeout(() => {
                    showSearchSuggestions(search);
                }, 100);
            }
        });

        document.addEventListener('click', function(e) {
            const searchContainer = document.getElementById('searchContainer');
            const suggestions = document.getElementById('searchSuggestions');
            const notificationsPanel = document.getElementById('notificationsPanel');
            
            if (searchContainer && suggestions && 
                !searchContainer.contains(e.target) && 
                suggestions.classList.contains('show')) {
                setTimeout(() => {
                    hideSearchSuggestions();
                }, 200);
            }
            
            if (notificationsPanel && notificationsPanel.classList.contains('show') && 
                !notificationsPanel.contains(e.target) && 
                (!notificationsBtn || !notificationsBtn.contains(e.target))) {
                notificationsPanel.classList.remove('show');
                notificationsPanel.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });

        setupKeyboardNavigation();
    }

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            AppState.theme = newTheme;
            localStorage.setItem('theme', newTheme);
            updateThemeIcon();
            
            if (AppState.currentUser) {
                api.updateSettings({ theme: newTheme });
            }
            
            addNotification(`Tema cambiado a ${newTheme === 'dark' ? 'oscuro' : 'claro'}`, 'El tema de la interfaz ha sido actualizado.', 'info');
        });
    }

    const randomGameBtn = document.getElementById('randomGameBtn');
    if (randomGameBtn) {
        randomGameBtn.addEventListener('click', async function() {
            try {
                const response = await api.getRandomGame();
                if (response.success && response.redirect_url) {
                    showPageLoading('Cargando juego aleatorio...');
                    
                    const loadingTimeout = setTimeout(() => {
                        hidePageLoading();
                    }, 5000);
                    
                    try {
                        window.location.href = response.redirect_url;
                    } catch (error) {
                        clearTimeout(loadingTimeout);
                        hidePageLoading();
                        api.showNotification('Error al cargar el juego', 'error');
                    }
                } else {
                    api.showNotification('No hay juegos disponibles', 'error');
                }
            } catch (error) {
                hidePageLoading();
                api.showNotification('Error al obtener juego aleatorio', 'error');
            }
        });
    }

    const backToTopBtn = document.getElementById('backToTopBtn');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const closeFavoritesSectionBtn = document.getElementById('closeFavoritesSection');
    if (closeFavoritesSectionBtn) {
        closeFavoritesSectionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            hideFavoritesInPanel();
        });
    }

    document.addEventListener('click', function(e) {
        const authModal = document.getElementById('authModal');
        const userPanel = document.getElementById('userPanel');
        const createGameContainer = document.getElementById('createGameContainer');
        const changePasswordModal = document.getElementById('changePasswordModal');
        const editProfileModal = document.getElementById('editProfileModal');
        const notificationsPanel = document.getElementById('notificationsPanel');
        const notificationsBtn = document.getElementById('notificationsBtn');
        
        if (authModal && e.target === authModal) hideAuthModal();
        if (userPanel && e.target === userPanel) hideUserPanel();
        if (createGameContainer && e.target === createGameContainer) {
            saveCreateGameFormData(); // Guardar antes de cerrar
            createGameContainer.classList.remove('show');
            createGameContainer.classList.add('hidden');
            document.body.style.overflow = '';
        }
        if (changePasswordModal && e.target === changePasswordModal) hideChangePasswordModal();
        if (editProfileModal && e.target === editProfileModal) hideEditProfileModal();
        
        if (notificationsPanel && e.target === notificationsPanel && 
            (!notificationsBtn || !notificationsBtn.contains(e.target))) {
            notificationsPanel.classList.remove('block');
            notificationsPanel.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAuthModal();
            hideUserPanel();
            hideChangePasswordModal();
            hideEditProfileModal();
            const createGameContainer = document.getElementById('createGameContainer');
            if (createGameContainer && createGameContainer.classList.contains('show')) {
                saveCreateGameFormData(); // Guardar antes de cerrar con ESC
                createGameContainer.classList.remove('show');
                createGameContainer.classList.add('hidden');
                document.body.style.overflow = '';
            }
            const notificationsPanel = document.getElementById('notificationsPanel');
            if (notificationsPanel && notificationsPanel.classList.contains('show')) {
                notificationsPanel.classList.remove('show');
                notificationsPanel.classList.add('hidden');
                document.body.style.overflow = '';
            }
        }
    });

    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggleSidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        // Solo cerrar sidebar en móvil cuando el click fue en el overlay
        if (window.innerWidth <= 1024 && sidebar && !sidebar.classList.contains('hidden')) {
            // Elementos del header y paneles que NO deben cerrar el sidebar
            const userBtn = document.getElementById('userBtn');
            const notificationsBtn = document.getElementById('notificationsBtn');
            const createGameBtn = document.getElementById('createGameBtn');
            const mobileSearchBtn = document.getElementById('mobileSearchBtn');
            const themeToggle = document.getElementById('themeToggle');
            const userPanel = document.getElementById('userPanel');
            const notificationsPanel = document.getElementById('notificationsPanel');
            const authModal = document.getElementById('authModal');
            const createGameContainer = document.getElementById('createGameContainer');
            
            // Verificar si el click fue en elementos que NO deben cerrar el sidebar
            const isInSafeElement = 
                sidebar.contains(e.target) ||
                (toggleBtn && toggleBtn.contains(e.target)) ||
                (userBtn && userBtn.contains(e.target)) ||
                (notificationsBtn && notificationsBtn.contains(e.target)) ||
                (createGameBtn && createGameBtn.contains(e.target)) ||
                (mobileSearchBtn && mobileSearchBtn.contains(e.target)) ||
                (themeToggle && themeToggle.contains(e.target)) ||
                (userPanel && userPanel.contains(e.target)) ||
                (notificationsPanel && notificationsPanel.contains(e.target)) ||
                (authModal && authModal.contains(e.target)) ||
                (createGameContainer && createGameContainer.contains(e.target));
            
            // Solo cerrar si el click fue en el overlay
            if (!isInSafeElement && overlay && overlay.contains(e.target)) {
                toggleSidebar();
            }
        }
    });

    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.addEventListener('click', function() {
            hideSearchSuggestions();
        });
    });

    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            hideSearchSuggestions();
        }
    });
}

// Funciones para guardar y restaurar el progreso del formulario de crear juego
function saveCreateGameFormData() {
    const formFields = [
        'gameName', 'gameDescription', 'gameURL', 'gameCategory',
        'creatorName', 'creatorEmail', 'termsAccepted', 'privacyAccepted'
    ];
    
    const formData = {};
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.type === 'checkbox') {
                formData[fieldId] = field.checked;
            } else {
                formData[fieldId] = field.value;
            }
        }
    });
    
    // Guardar imagen preview si existe
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview && imagePreview.src && !imagePreview.src.includes('placeholder')) {
        formData.imagePreviewSrc = imagePreview.src;
    }
    
    // Guardar en AppState
    AppState.createGameFormData = formData;
}

function restoreCreateGameFormData() {
    if (!AppState.createGameFormData || Object.keys(AppState.createGameFormData).length === 0) {
        return; // No hay datos guardados
    }
    
    const formData = AppState.createGameFormData;
    
    // Restaurar cada campo
    Object.keys(formData).forEach(fieldId => {
        if (fieldId === 'imagePreviewSrc') {
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) {
                imagePreview.src = formData[fieldId];
                imagePreview.classList.remove('hidden');
            }
            return;
        }
        
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.type === 'checkbox') {
                field.checked = formData[fieldId];
            } else {
                field.value = formData[fieldId];
            }
        }
    });
    
    // Restaurar categoría seleccionada visualmente
    if (formData.gameCategory) {
        const categoryOptions = document.querySelectorAll('.category-option');
        categoryOptions.forEach(option => {
            if (option.getAttribute('data-value') === formData.gameCategory) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }
    
}

function clearCreateGameFormData() {
    AppState.createGameFormData = {};
    const gameForm = document.getElementById('gameForm');
    if (gameForm) gameForm.reset();
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
    }
}

function setupGameForm() {
    const createGameBtn = document.getElementById('createGameBtn');
    const createGameContainer = document.getElementById('createGameContainer');
    const cancelCreateGameBtn = document.getElementById('cancelCreateGame');
    const closeCreateGameBtn = document.getElementById('closeCreateGame');
    const gameForm = document.getElementById('gameForm');
    const categoryOptions = document.querySelectorAll('.category-option');
    const gameImageInput = document.getElementById('gameImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewGameBtn = document.getElementById('previewGame');
    const submitGameBtn = document.getElementById('submitGame');
    const termsAccepted = document.getElementById('termsAccepted');
    const privacyAccepted = document.getElementById('privacyAccepted');

    if (createGameBtn) {
        createGameBtn.addEventListener('click', function() {
            closeAllModals(); // Cerrar otros modales
            if (!AppState.currentUser) {
                api.showNotification('Debes iniciar sesión para crear juegos', 'error');
                showAuthModal('login');
                return;
            }
            createGameContainer.classList.add('show');
            createGameContainer.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Hacer scroll al inicio del formulario (Información Básica)
            // El elemento que tiene el scroll es create-game-form, no el container
            setTimeout(() => {
                const formElement = createGameContainer.querySelector('.create-game-form');
                if (formElement) {
                    formElement.scrollTop = 0;
                }
                // También resetear el container por si acaso
                createGameContainer.scrollTop = 0;
            }, 100);
            
            // Restaurar datos guardados si existen
            restoreCreateGameFormData();
            
            if (AppState.currentUser) {
                const creatorName = document.getElementById('creatorName');
                const creatorEmail = document.getElementById('creatorEmail');
                if (creatorName && !creatorName.value) creatorName.value = AppState.currentUser.name;
                if (creatorEmail && !creatorEmail.value) creatorEmail.value = AppState.currentUser.email;
            }
        });
    }

    function closeGameForm() {
        saveCreateGameFormData(); // Guardar antes de cerrar
        createGameContainer.classList.remove('show');
        createGameContainer.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (cancelCreateGameBtn) {
        cancelCreateGameBtn.addEventListener('click', closeGameForm);
    }
    
    if (closeCreateGameBtn) {
        closeCreateGameBtn.addEventListener('click', closeGameForm);
    }

    if (createGameContainer) {
        createGameContainer.addEventListener('click', function(e) {
            if (e.target === createGameContainer) {
                closeGameForm();
            }
        });
    }

    categoryOptions.forEach(option => {
        option.addEventListener('click', function() {
            categoryOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            const categorySelect = document.getElementById('gameCategory');
            categorySelect.value = this.getAttribute('data-value');
        });
    });

    if (gameImageInput && imagePreview) {
        gameImageInput.addEventListener('input', function() {
            const url = this.value.trim();
            if (url && isValidURL(url)) {
                const img = document.createElement('img');
                img.src = url;
                img.onload = function() {
                    imagePreview.innerHTML = '';
                    imagePreview.appendChild(img);
                };
                img.onerror = function() {
                    imagePreview.innerHTML = '<span>❌ Error al cargar imagen</span>';
                };
            } else {
                imagePreview.innerHTML = '<span>Vista previa aparecerá aquí</span>';
            }
        });
    }

    if (gameForm) {
        gameForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!validateAllSteps()) {
                api.showNotification('Por favor corrige los errores en el formulario', 'error');
                return;
            }
            
            if (!termsAccepted.checked || !privacyAccepted.checked) {
                api.showNotification('Debes aceptar los términos y condiciones', 'error');
                return;
            }

            showFormLoading(true);
            
            try {
                const formData = getFormData();
                const response = await api.submitGameForm(formData);
                
                if (response.success) {
                    api.showNotification(response.message || '¡Juego enviado con éxito! Te contactaremos pronto.', 'success');
                    clearCreateGameFormData(); // Limpiar datos guardados después de envío exitoso
                    closeGameForm();
                    addNotification('Juego enviado para revisión', 'Tu juego será revisado por nuestro equipo.', 'success');
                    await loadAllGames();
                } else {
                    throw new Error(response.error || 'Error en el envío');
                }
            } catch (error) {
                api.showNotification('Error al enviar el juego. Por favor intenta de nuevo.', 'error');
            } finally {
                showFormLoading(false);
            }
        });
    }

    function isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function showFieldError(field, message) {
        let errorDiv = field.parentNode.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            field.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        field.parentNode.classList.add('error');
    }

    function hideFieldError(field) {
        const errorDiv = field.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.remove();
        }
        field.parentNode.classList.remove('error');
    }

    function validateAllSteps() {
        let isValid = true;
        const requiredFields = gameForm.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                const section = field.closest('.form-section');
                if (section) {
                    section.classList.add('highlight-error');
                }
                isValid = false;
            }
        });
        
        return isValid;
    }

    function getFormData() {
        const formData = {};
        const formElements = gameForm.elements;
        
        for (let element of formElements) {
            if (element.name && element.type !== 'button' && element.type !== 'submit') {
                if (element.type === 'checkbox' && element.name.includes('[]')) {
                    if (!formData[element.name]) {
                        formData[element.name] = [];
                    }
                    if (element.checked) {
                        formData[element.name].push(element.value);
                    }
                } else if (element.type === 'checkbox') {
                    formData[element.name] = element.checked;
                } else if (element.type === 'file') {
                    formData[element.name] = element.files[0];
                } else {
                    formData[element.name] = element.value;
                }
            }
        }
        return formData;
    }

    function showGamePreview(data) {
        // Preview usando Tailwind
        const preview = `
            <div class="game-preview bg-[var(--bg-main)] rounded-[12px] p-[1.5rem] mb-[1.5rem]">
                <h3 class="flex items-center gap-[0.5rem] text-[var(--accent)]"><i class="fas fa-eye"></i> Vista Previa del Juego</h3>
                <div class="preview-content">
                    <div class="preview-header border-b border-[var(--text-muted)] pb-[1rem] mb-[1rem]">
                        <h4 class="text-[1.2rem] font-semibold">${data.game_title || 'Sin título'}</h4>
                        <p><strong>Categoría:</strong> ${data.game_category || 'No especificada'}</p>
                        <p><strong>Desarrollador:</strong> ${data.game_developer || 'No especificado'}</p>
                    </div>
                    <div class="preview-image mb-[1rem]">
                        <img src="${data.game_image || 'https://via.placeholder.com/300x200'}" alt="Vista previa" class="w-full max-h-[300px] object-cover rounded-[12px]">
                    </div>
                    <div class="preview-details space-y-2">
                        <p><strong>Descripción:</strong> ${data.game_description?.substring(0, 200) || 'Sin descripción'}...</p>
                        <p><strong>Dificultad:</strong> ${data.game_difficulty || 'Media'}</p>
                        <p><strong>Jugadores:</strong> ${data.game_players || '1'}</p>
                    </div>
                    <div class="preview-creator mt-4 pt-4 border-t border-[var(--text-muted)]">
                        <p><strong>Creador:</strong> ${data.creator_name || 'Anónimo'}</p>
                        <p><strong>Email:</strong> ${data.creator_email || 'No especificado'}</p>
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.className = 'preview-modal fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-[4000] animate-[fadeIn_0.3s_ease]';
        modal.innerHTML = `
            <div class="preview-container bg-[var(--bg-card)] rounded-[12px] w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto p-[2rem] shadow-[var(--shadow-xlarge)]">
                <div class="preview-header flex justify-between items-center mb-[1.5rem] pb-[1rem] border-b border-[var(--text-muted)]">
                    <h3 class="text-[var(--accent)] m-0">Confirmación</h3>
                    <button class="close-preview bg-transparent border-none text-[var(--text-muted)] text-[1.2rem] cursor-pointer hover:text-[var(--accent)]"><i class="fas fa-times"></i></button>
                </div>
                ${preview}
                <div class="preview-actions flex justify-end gap-[1rem] mt-[1.5rem]">
                    <button class="btn btn-secondary close-preview">Cerrar</button>
                    <button class="btn btn-primary" id="confirmSubmit">Confirmar Envío</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelectorAll('.close-preview').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        const confirmBtn = modal.querySelector('#confirmSubmit');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                modal.remove();
                gameForm.dispatchEvent(new Event('submit'));
            });
        }
    }

    function showFormLoading(show) {
        const progressBar = document.querySelector('.form-progress');
        const progressFill = document.querySelector('.progress-fill');
        const submitBtn = document.getElementById('submitGame');
        
        if (show) {
            if (progressBar) progressBar.style.display = 'block';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');
            }
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                }
                if (progressFill) {
                    progressFill.style.width = `${progress}%`;
                }
            }, 200);
        } else {
            if (progressBar) progressBar.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
            if (progressFill) {
                progressFill.style.width = '0%';
            }
        }
    }

    function resetForm() {
        categoryOptions.forEach(opt => opt.classList.remove('selected'));
        const categorySelect = document.getElementById('gameCategory');
        if (categorySelect) categorySelect.value = '';
        
        if (imagePreview) {
            imagePreview.innerHTML = '<span>Vista previa aparecerá aquí</span>';
        }
        
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.form-section.highlight-error').forEach(el => el.classList.remove('highlight-error'));
    }

    if (previewGameBtn) {
        previewGameBtn.addEventListener('click', function() {
            if (validateAllSteps()) {
                const formData = getFormData();
                showGamePreview(formData);
            }
        });
    }
}

function addGameEventListeners() {
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('.favorite-btn')) return;
            const gameId = this.getAttribute('data-id');
            const gameTitle = this.getAttribute('data-title');
            const game = AppState.filteredGames.find(g => g.id == gameId || g.title === gameTitle);
            
            if (game && game.gameUrl) {
                showPageLoading('Cargando juego...');
                
                // Timeout de seguridad para ocultar loading si algo falla
                const loadingTimeout = setTimeout(() => {
                    hidePageLoading();
                }, 5000);
                
                // Intentar navegar
                try {
                    window.location.href = game.gameUrl;
                } catch (error) {
                    clearTimeout(loadingTimeout);
                    hidePageLoading();
                    api.showNotification('Error al cargar el juego', 'error');
                }
            } else {
                api.showNotification('Juego no disponible', 'error');
            }
        });
    });

    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            e.preventDefault();
            const gameTitle = this.getAttribute('data-game');
            
            if (!AppState.currentUser) {
                api.showNotification('Debes iniciar sesión para guardar favoritos', 'error');
                showAuthModal('login');
                return;
            }

            try {
                const originalHtml = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                this.disabled = true;
                
                const response = await api.toggleFavorite(gameTitle);
                this.disabled = false;
                
                if (response.success) {
                    AppState.favorites = response.favorites || [];
                    
                    if (response.action === 'added') {
                        this.classList.add('favorited');
                        this.innerHTML = '<i class="fas fa-heart"></i>';
                        this.setAttribute('title', 'Quitar de favoritos');
                        addNotification('Añadido a favoritos', `"${gameTitle}" ha sido añadido a tus favoritos.`, 'favorite');
                        api.showNotification('Añadido a favoritos', 'success');
                    } else {
                        this.classList.remove('favorited');
                        this.innerHTML = '<i class="fas fa-heart"></i>';
                        this.setAttribute('title', 'Añadir a favoritos');
                        api.showNotification('Removido de favoritos', 'info');
                    }
                    
                    updateUserStats();
                    updateFavoriteButtons();
                    
                    const favoritesSection = document.getElementById('favoritesSection');
                    if (favoritesSection && favoritesSection.style.display === 'block') {
                        showFavoritesInPanel();
                    }
                } else {
                    this.innerHTML = originalHtml;
                    if (response.requiresLogin || response.error?.includes('Authentication') || response.error?.includes('Session')) {
                        api.showNotification('Sesión expirada. Por favor, inicia sesión nuevamente', 'error');
                        showAuthModal('login');
                        AppState.currentUser = null;
                        AppState.favorites = [];
                        resetUserUI();
                    } else {
                        api.showNotification(response.error || 'Error al guardar favorito', 'error');
                    }
                }
            } catch (error) {
                this.innerHTML = '<i class="fas fa-heart"></i>';
                api.showNotification('Error de conexión', 'error');
            }
        });
    });
}

window.loadAllGames = loadAllGames;
window.toggleSidebar = toggleSidebar;
window.showGameForm = function() {
    const createGameBtn = document.getElementById('createGameBtn');
    if (createGameBtn) createGameBtn.click();
};
window.testNotification = function(type = 'info') {
    const titles = {
        'welcome': '¡Nueva función!',
        'new_game': 'Juego agregado',
        'update': 'Actualización disponible',
        'favorite': 'Nuevo seguidor',
        'info': 'Información importante',
        'warning': 'Atención requerida',
        'error': 'Error detectado',
        'success': '¡Operación exitosa!'
    };

    const messages = {
        'welcome': 'El sistema de notificaciones ya está disponible.',
        'new_game': 'Un desarrollador ha subido un nuevo juego.',
        'update': 'La plataforma ha sido actualizada.',
        'favorite': 'A alguien le gustó tu juego.',
        'info': 'Revisa las novedades de esta semana.',
        'warning': 'Tu sesión expirará pronto.',
        'error': 'No se pudo guardar tu progreso.',
        'success': 'Tu juego ha sido publicado exitosamente.'
    };

    addNotification(
        titles[type] || 'Nueva notificación',
        messages[type] || 'Esta es una notificación de prueba.',
        type
    );
};
// Mobile Search Modal Functions
function showMobileSearchModal() {
    const modal = document.getElementById('mobileSearchModal');
    const input = document.getElementById('mobileSearchInput');
    const resultsContainer = document.getElementById('mobileSearchResults');
    
    if (!modal) return;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Hide results container initially
    if (resultsContainer) {
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
    }
    
    // Show categories initially
    renderMobileSearchCategories();
    
    // Focus input
    setTimeout(() => {
        if (input) input.focus();
    }, 100);
}

function hideMobileSearchModal() {
    const modal = document.getElementById('mobileSearchModal');
    const input = document.getElementById('mobileSearchInput');
    const resultsContainer = document.getElementById('mobileSearchResults');
    const categoriesContainer = document.getElementById('mobileSearchCategories');
    
    if (!modal) return;
    
    modal.classList.remove('show');
    document.body.style.overflow = '';
    
    // Clear search
    if (input) input.value = '';
    if (resultsContainer) {
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
    }
    if (categoriesContainer) {
        categoriesContainer.classList.add('hidden');
        categoriesContainer.innerHTML = '';
    }
}

function renderMobileSearchCategories() {
    const container = document.getElementById('mobileSearchCategories');
    if (!container) return;
    
    const categories = [
        { name: 'Todos', icon: 'fas fa-gamepad' },
        { name: 'Aventura', icon: 'fas fa-mountain' },
        { name: 'Puzzle', icon: 'fas fa-puzzle-piece' },
        { name: 'Deportes', icon: 'fas fa-running' },
        { name: 'Acción', icon: 'fas fa-fire' },
        { name: 'Multijugador', icon: 'fas fa-users' },
        { name: 'Estrategia', icon: 'fas fa-chess' },
        { name: 'RPG', icon: 'fas fa-dragon' },
        { name: 'Simulación', icon: 'fas fa-car' },
        { name: 'Carreras', icon: 'fas fa-flag-checkered' },
        { name: 'Terror', icon: 'fas fa-ghost' },
        { name: 'Plataformas', icon: 'fas fa-shoe-prints' },
        { name: 'Disparos', icon: 'fas fa-crosshairs' },
        { name: 'Lucha', icon: 'fas fa-hand-fist' },
        { name: 'Musical', icon: 'fas fa-music' },
        { name: 'Educativo', icon: 'fas fa-graduation-cap' },
        { name: 'Arcade', icon: 'fas fa-gamepad' },
        { name: 'Survival', icon: 'fas fa-campground' },
        { name: 'Mundo Abierto', icon: 'fas fa-globe' },
        { name: 'VR', icon: 'fas fa-vr-cardboard' }
    ];
    
    // Obtener la categoría activa actual
    const currentCategory = AppState.currentCategory || 'Todos';
    
    let html = '';
    categories.forEach(cat => {
        // Marcar como active si es la categoría actual
        const activeClass = cat.name === currentCategory ? 'active' : '';
        html += `
            <div class="search-category-card ${activeClass}" data-category="${cat.name}">
                <div class="search-category-icon">
                    <i class="${cat.icon}"></i>
                </div>
                <div class="search-category-name">${cat.name}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.classList.remove('hidden');
    
    // Add click listeners
    container.querySelectorAll('.search-category-card').forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            
            // Remover active de todas las categorías móviles
            document.querySelectorAll('.search-category-card').forEach(c => c.classList.remove('active'));
            // Agregar active a la categoría seleccionada
            this.classList.add('active');
            
            // Actualizar las categorías del sidebar
            document.querySelectorAll('.sidebar-category').forEach(c => c.classList.remove('active'));
            const sidebarBtn = document.querySelector(`.sidebar-category[data-category="${category}"]`);
            if (sidebarBtn) {
                sidebarBtn.classList.add('active');
            }
            
            // Filtrar juegos
            filterGamesLocally(category, '');
            
            // Pequeño delay para mostrar el feedback visual antes de cerrar
            setTimeout(() => {
                hideMobileSearchModal();
            }, 200);
        });
    });
}

function handleMobileSearch(query) {
    const resultsContainer = document.getElementById('mobileSearchResults');
    const categoriesContainer = document.getElementById('mobileSearchCategories');
    
    if (!resultsContainer || !categoriesContainer) return;
    
    query = query.trim().toLowerCase();
    
    if (query === '') {
        categoriesContainer.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        return;
    }
    
    categoriesContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    
    const filteredGames = AppState.games.filter(game => {
        const titleMatch = game.title.toLowerCase().includes(query);
        const categoryMatch = game.category.toLowerCase().includes(query);
        const descriptionMatch = game.description && game.description.toLowerCase().includes(query);
        return titleMatch || categoryMatch || descriptionMatch;
    });
    
    if (filteredGames.length === 0) {
        resultsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-muted);">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p>No se encontraron juegos</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredGames.slice(0, 20).forEach(game => {
        const imageUrl = game.thumb || `https://via.placeholder.com/150x200/cccccc/333333?text=${encodeURIComponent(game.title.substring(0, 1))}`;
        const categoryIcon = getCategoryIcon(game.category);
        
        html += `
            <div class="game-card-mobile" data-game-url="${game.gameUrl}" style="
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                overflow: hidden;
                cursor: pointer;
                transition: all 0.25s ease;
            ">
                <div style="position: relative; padding-bottom: 75%; overflow: hidden; background: var(--bg-main);">
                    <img src="${imageUrl}" 
                         alt="${game.title}"
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;"
                         onerror="this.src='https://via.placeholder.com/150x200/cccccc/333333?text=G'">
                </div>
                <div style="padding: 0.5rem;">
                    <h3 style="margin: 0 0 0.15rem 0; font-size: 0.8rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${game.title}</h3>
                    <p style="margin: 0; font-size: 0.65rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.2rem;">
                        <i class="${categoryIcon}" style="font-size: 0.6rem;"></i> ${game.category}
                    </p>
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
    
    resultsContainer.querySelectorAll('.game-card-mobile').forEach(card => {
        card.addEventListener('click', function() {
            const gameUrl = this.getAttribute('data-game-url');
            if (gameUrl) {
                hideMobileSearchModal();
                showPageLoading('Cargando juego...');
                setTimeout(() => {
                    window.location.href = gameUrl;
                }, 300);
            }
        });
    });
}

// Setup mobile search when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showMobileSearchModal();
        });
    }

    const closeMobileSearch = document.getElementById('closeMobileSearch');
    if (closeMobileSearch) {
        closeMobileSearch.addEventListener('click', function(e) {
            e.stopPropagation();
            hideMobileSearchModal();
        });
    }

    const mobileSearchInput = document.getElementById('mobileSearchInput');
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('input', function(e) {
            handleMobileSearch(e.target.value);
        });

        mobileSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideMobileSearchModal();
            }
        });
    }

    const closeNotificationsPanel = document.getElementById('closeNotificationsPanel');
    if (closeNotificationsPanel) {
        closeNotificationsPanel.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleNotificationsPanel();
        });
    }
});

window.showMobileSearchModal = showMobileSearchModal;
window.hideMobileSearchModal = hideMobileSearchModal;
window.handleMobileSearch = handleMobileSearch;