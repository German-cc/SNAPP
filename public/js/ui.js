// ==========================================
// UI MANAGEMENT
// ==========================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    if (!sidebar || !mainContent) return;
    
    const isHidden = sidebar.classList.contains('hidden');
    
    if (isHidden) {
        sidebar.classList.remove('hidden');
        mainContent.classList.remove('sidebar-hidden');
        
        if (window.innerWidth > 1024) { 
            mainContent.classList.remove('ml-0', 'w-full'); 
            mainContent.classList.add('ml-[68px]', 'w-[calc(100vw-90px)]'); 
        } else {
            let overlay = document.querySelector('.sidebar-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'sidebar-overlay fixed inset-0 bg-[var(--overlay-dark-opacity)] z-[1099] opacity-0 invisible transition-all duration-300';
                overlay.addEventListener('click', toggleSidebar);
                document.body.appendChild(overlay);
            }
            overlay.classList.remove('opacity-0', 'invisible');
            overlay.classList.add('opacity-100', 'visible');
            sidebar.classList.remove('-translate-x-full');
        }
        
        localStorage.setItem('sidebarHidden', 'false');
        AppState.sidebarVisible = true;
    } else {
        sidebar.classList.add('hidden');
        mainContent.classList.add('sidebar-hidden');
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
    if (AppState.filteredGames.length > 0) {
        setTimeout(() => { renderFilteredGames(); }, 400);
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
    setTimeout(() => { setupKeyboardNavigation(); }, 500);
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
    closeAllModals();
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
    
    const favoriteGames = AppState.games.filter(game => AppState.favorites.includes(game.title));
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
    if (gamesGrid) gamesGrid.appendChild(backButton);
    api.showNotification(`Mostrando ${favoriteGames.length} juegos favoritos`, 'success');
}