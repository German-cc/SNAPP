// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================

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
    }).slice(0, 8); // Limitar a 8 sugerencias

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
    
    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
    if (hasHalfStar) stars += '<i class="fas fa-star-half-alt"></i>';
    
    return `<span class="suggestion-rating text-[var(--star-color)] flex items-center gap-[2px] text-[0.7rem]">${stars}</span>`;
}

function highlightMatches(text, searchTerm) {
    if (!searchTerm.trim()) return text;
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
                const loadingTimeout = setTimeout(() => { hidePageLoading(); }, 5000);
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
            if (searchInput) searchInput.value = '';
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
                        const loadingTimeout = setTimeout(() => { hidePageLoading(); }, 5000);
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

// Mobile search functions
function showMobileSearchModal() {
    const modal = document.getElementById('mobileSearchModal');
    const input = document.getElementById('mobileSearchInput');
    const resultsContainer = document.getElementById('mobileSearchResults');
    
    if (!modal) return;
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    if (resultsContainer) {
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
    }
    
    renderMobileSearchCategories();
    
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
    
    const currentCategory = AppState.currentCategory || 'Todos';
    let html = '';
    
    categories.forEach(cat => {
        const activeClass = cat.name === currentCategory ? 'active' : '';
        html += `
            <div class="search-category-card ${activeClass}" data-category="${cat.name}">
                <div class="search-category-icon"><i class="${cat.icon}"></i></div>
                <div class="search-category-name">${cat.name}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    container.classList.remove('hidden');
    
    container.querySelectorAll('.search-category-card').forEach(card => {
        card.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            document.querySelectorAll('.search-category-card').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.sidebar-category').forEach(c => c.classList.remove('active'));
            const sidebarBtn = document.querySelector(`.sidebar-category[data-category="${category}"]`);
            if (sidebarBtn) sidebarBtn.classList.add('active');
            
            filterGamesLocally(category, '');
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
    
    const cleanQuery = query.trim().toLowerCase();
    
    if (cleanQuery === '') {
        categoriesContainer.classList.remove('hidden');
        categoriesContainer.style.removeProperty('display');
        resultsContainer.classList.add('hidden');
        resultsContainer.style.setProperty('display', 'none', 'important');
        resultsContainer.innerHTML = '';
        return;
    }
    
    categoriesContainer.classList.add('hidden');
    categoriesContainer.style.setProperty('display', 'none', 'important');
    resultsContainer.classList.remove('hidden');
    resultsContainer.style.setProperty('display', 'grid', 'important');
    
    const filteredGames = AppState.games.filter(game => {
        return game.title.toLowerCase().includes(cleanQuery) || 
               game.category.toLowerCase().includes(cleanQuery);
    });
    
    if (filteredGames.length === 0) {
        resultsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-muted); display: flex; flex-direction: column; align-items: center;">
                <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.5;"></i>
                <p style="margin: 0;">No encontramos juegos para "${query}"</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredGames.slice(0, 20).forEach(game => {
        const imageUrl = game.thumb || 'https://via.placeholder.com/150';
        html += `
            <div class="game-card-mobile animate-[fadeIn_0.2s_ease]" 
                 data-game-url="${game.gameUrl}" 
                 style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s ease;">
                <div style="position: relative; padding-bottom: 75%; overflow: hidden; background: var(--bg-main);">
                    <img src="${imageUrl}" 
                         alt="${game.title}" 
                         loading="lazy" 
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;">
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
    
    resultsContainer.querySelectorAll('.game-card-mobile').forEach(card => {
        card.addEventListener('click', function() {
            const gameUrl = this.getAttribute('data-game-url');
            if (gameUrl) {
                document.getElementById('mobileSearchInput')?.blur();
                hideMobileSearchModal();
                if (typeof showPageLoading === 'function') {
                    showPageLoading('Cargando juego...');
                }
                setTimeout(() => window.location.href = gameUrl, 100);
            }
        });
    });
}

window.showMobileSearchModal = showMobileSearchModal;
window.hideMobileSearchModal = hideMobileSearchModal;
window.handleMobileSearch = handleMobileSearch;