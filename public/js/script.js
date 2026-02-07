// ==========================================
// GESTOR DE SONIDOS
// ==========================================
const SoundManager = {
    sounds: {
        success: new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'),
        error: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
        info: new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'),
        warning: new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3')
    },
    
    play(type) {
        let soundType = 'info';
        if (type === 'success' || type === 'welcome') soundType = 'success';
        if (type === 'error') soundType = 'error';
        if (type === 'warning') soundType = 'warning';
        
        const sound = this.sounds[soundType];
        if (sound) {
            sound.currentTime = 0;
            sound.volume = 0.3; 
            sound.play().catch(e => {
                console.log('Sonido bloqueado hasta interacción');
            });
        }
    }
};

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
    notifications: [], 
    createGameFormData: {} 
};

// Importar módulos (serán agregados al final del archivo HTML)
let sessionRefreshInterval = null;

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
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hidden');
        }
    });
    
    panels.forEach(panelId => {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.remove('show', 'block');
            panel.classList.add('hidden');
        }
    });
    
    document.body.style.overflow = '';
}

function loadUserSettings(settings) {
    if (!settings) {
        console.log('⚠️ No hay configuraciones para cargar');
        if (window.performanceMode) {
            window.performanceMode.init(null);
        }
        return;
    }

    console.log('📥 Cargando configuraciones del usuario:', settings);
    
    if (settings.theme) {
        document.documentElement.setAttribute('data-theme', settings.theme);
        AppState.theme = settings.theme;
        localStorage.setItem('theme', settings.theme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                const baseClasses = 'w-[24px] text-center mr-[0.75rem]';
                const faClass = settings.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                icon.className = `${faClass} ${baseClasses}`;
            }
        }
    }
    
    if (window.performanceMode) {
        window.performanceMode.init(settings);
    } else {
        console.warn('⚠️ Performance.js no está disponible');
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

function truncateEmail(email, maxWidth = 250) {
    if (!email || typeof email !== 'string') return email;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return email;
    return email.length > 25 ? email.substring(0, 20) + '...' : email;
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

function showPageLoading(message = 'Cargando...') {
    hidePageLoading();
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'pageLoading';
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

function addNotification(title, message, type = 'info') {
    SoundManager.play(type);
    api.showNotification(title, type);
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

// Inicialización principal
document.addEventListener('DOMContentLoaded', async function() {
    loadLocalConfig();
    await checkAuth();
    
    if (AppState.currentUser) {
        startSessionRefresh();
        loadNotifications();
    }
    
    setInterval(checkAndRestoreSession, 60 * 1000);
    await loadAllGames();
    setupEventListeners();
    setupGameForm();
    renderNotifications();
    
    window.addEventListener('focus', function() { 
        checkAndRestoreSession(); 
    });
    
    document.addEventListener('visibilitychange', function() { 
        if (!document.hidden) { 
            setTimeout(checkAndRestoreSession, 1000); 
            hidePageLoading(); 
        } 
    });
    
    window.addEventListener('pageshow', function(event) { 
        if (event.persisted) hidePageLoading(); 
    });
    
    setTimeout(() => { 
        if (AppState.currentUser) {
            api.showNotification(
                `¡Bienvenido de nuevo, ${AppState.currentUser.name}!`, 
                'welcome'
            ); 
        }
    }, 2000);
    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
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
                if (sidebar) sidebar.classList.add('hidden');
                if (mainContent) { 
                    mainContent.classList.add('sidebar-hidden', 'ml-0', 'w-full'); 
                    mainContent.classList.remove('ml-[68px]', 'w-[calc(100vw-90px)]'); 
                }
            }

            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) overlay.remove();

            if (typeof hideMobileSearchModal === 'function') {
                hideMobileSearchModal();
            } else {
                const mobileSearchModal = document.getElementById('mobileSearchModal');
                const categoriesContainer = document.getElementById('mobileSearchCategories');
                const resultsContainer = document.getElementById('mobileSearchResults');
                
                if (mobileSearchModal) mobileSearchModal.classList.remove('show');
                if (categoriesContainer) {
                    categoriesContainer.classList.add('hidden');
                    categoriesContainer.innerHTML = ''; 
                }
                if (resultsContainer) {
                    resultsContainer.classList.add('hidden');
                    resultsContainer.innerHTML = '';
                }
                document.body.style.overflow = '';
            }

            updateSidebarIcon();
            
            if (!document.getElementById('authModal')?.classList.contains('show')) {
                document.body.style.overflow = '';
            }
        }
        
        if (AppState.currentUser) {
            const userEmailElement = document.getElementById('userEmail');
            if (userEmailElement) {
                userEmailElement.textContent = truncateEmail(AppState.currentUser.email);
            }
        }
    });
});

// Cargar módulos después del DOM
setTimeout(() => {
    if (!AppState.currentUser && window.performanceMode) {
        console.log('🎮 Inicializando Performance.js para usuario no autenticado');
        window.performanceMode.init(null);
    }
}, 100);