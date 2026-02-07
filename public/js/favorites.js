// ==========================================
// FAVORITES MANAGEMENT
// ==========================================

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
                            data-game="${game.title.replace(/"/g, '&quot;')}"
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