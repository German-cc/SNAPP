// ==========================================
// GAMES MANAGEMENT
// ==========================================

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
        const heartIconClass = isFavorite ? 'fas fa-heart' : 'far fa-heart';
        
        const hash = simpleHash(game.title);
        const gridSpan = (hash % 100) < 45 ? 'col-span-1 aspect-square' : 'col-span-2 aspect-[2/1]';
        const imageUrl = game.thumb || `https://via.placeholder.com/300x300/cccccc/333333?text=${encodeURIComponent(game.title.substring(0, 1))}`;
        
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
                        data-game="${game.title.replace(/"/g, '&quot;')}"
                        title="${favoriteTitle}"
                        aria-label="${favoriteTitle}">
                    <i class="${heartIconClass}"></i>
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

function filterGamesLocally(category = 'Todos', searchTerm = '') {
    AppState.currentCategory = category;
    AppState.currentSearch = ''; 
    
    if (category === 'Todos') {
        AppState.filteredGames = [...AppState.games];
    } else {
        AppState.filteredGames = AppState.games.filter(game => game.category === category);
    }
    
    renderFilteredGames();
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
        });
    });
    
    // Lógica optimista de favoritos
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', async function(e) {
            e.stopPropagation(); 
            e.preventDefault();
            
            const gameTitle = this.getAttribute('data-game');
            if (!AppState.currentUser) { 
                api.showNotification('Inicia sesión para guardar favoritos', 'warning'); 
                showAuthModal('login'); 
                return; 
            }

            // Lógica Optimista
            const icon = this.querySelector('i');
            const wasFavorite = this.classList.contains('favorited');
            const willBeFavorite = !wasFavorite;

            if (willBeFavorite) {
                this.classList.add('favorited', 'text-[var(--favorite-color)]', 'bg-[rgba(0,0,0,0.5)]');
                icon.className = 'fas fa-heart';
                api.showNotification('Añadido a favoritos', 'success');
                if (!AppState.favorites.includes(gameTitle)) {
                    AppState.favorites.push(gameTitle);
                }
            } else {
                this.classList.remove('favorited', 'text-[var(--favorite-color)]', 'bg-[rgba(0,0,0,0.5)]');
                icon.className = 'far fa-heart';
                api.showNotification('Quitado de favoritos', 'info');
                AppState.favorites = AppState.favorites.filter(t => t !== gameTitle);
            }
            
            updateUserStats();

            try {
                const response = await api.toggleFavorite(gameTitle);
                if (response.success) { 
                    AppState.favorites = response.favorites; 
                } else { 
                    throw new Error(response.error); 
                }
            } catch (error) {
                console.error("Rollback:", error);
                
                if (wasFavorite) {
                    this.classList.add('favorited', 'text-[var(--favorite-color)]', 'bg-[rgba(0,0,0,0.5)]');
                    icon.className = 'fas fa-heart';
                    if (!AppState.favorites.includes(gameTitle)) {
                        AppState.favorites.push(gameTitle);
                    }
                } else {
                    this.classList.remove('favorited', 'text-[var(--favorite-color)]', 'bg-[rgba(0,0,0,0.5)]');
                    icon.className = 'far fa-heart';
                    AppState.favorites = AppState.favorites.filter(t => t !== gameTitle);
                }
                
                updateUserStats();
                api.showNotification('No se pudo guardar el cambio', 'error');
            }
        });
    });
}

function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const gameTitle = btn.getAttribute('data-game');
        const isFavorite = AppState.favorites.includes(gameTitle);
        
        if (isFavorite) {
            btn.classList.add('favorited');
            btn.classList.add('text-[var(--favorite-color)]', 'bg-[rgba(255, 0, 0, 0.5)]');
            btn.innerHTML = '<i class="fas fa-heart"></i>';
            btn.setAttribute('title', 'Quitar de favoritos');
        } else {
            btn.classList.remove('favorited');
            btn.classList.remove('text-[var(--favorite-color)]', 'bg-[rgba(0,0,0,0.5)]');
            btn.innerHTML = '<i class="far fa-heart"></i>';
            btn.setAttribute('title', 'Añadir a favoritos');
        }
    });
}