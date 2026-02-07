// ==========================================
// AUTHENTICATION & SESSION MANAGEMENT
// ==========================================

function startSessionRefresh() {
    if (sessionRefreshInterval) {
        clearInterval(sessionRefreshInterval);
    }
    sessionRefreshInterval = setInterval(async () => {
        if (AppState.currentUser) {
            try {
                const response = await fetch('/api/auth/check');
                if (response.ok) {
                    const data = await response.json();
                    if (data.authenticated) {
                        // Sesión activa
                    }
                }
            } catch (error) {
                // Silently fail
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
                
                if (response.user.avatar && !response.user.profile?.avatar) {
                    if (!AppState.currentUser.profile) AppState.currentUser.profile = {};
                    AppState.currentUser.profile.avatar = response.user.avatar;
                } else if (response.user.profile?.avatar && !response.user.avatar) {
                    AppState.currentUser.avatar = response.user.profile.avatar;
                }
                
                AppState.favorites = response.favorites || [];
                
                loadUserSettings(response.settings);
                
                updateUserUI();
                updateUserStats();
                startSessionRefresh();
                loadNotifications();

                if (AppState.games.length > 0) {
                    renderFilteredGames();
                }
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
        // Silently fail
    }
}

async function checkAuth() {
    try {
        const response = await api.checkAuth();
        if (response.authenticated) {
            AppState.currentUser = response.user;
            AppState.favorites = response.favorites || [];
            
            if (!AppState.currentUser.username && AppState.currentUser.email) {
                AppState.currentUser.username = AppState.currentUser.email.split('@')[0];
            }
            
            if (!AppState.currentUser.firstName || !AppState.currentUser.lastName) {
                const nameParts = (AppState.currentUser.name || '').trim().split(' ');
                if (!AppState.currentUser.firstName) AppState.currentUser.firstName = nameParts[0] || '';
                if (!AppState.currentUser.lastName) AppState.currentUser.lastName = nameParts.slice(1).join(' ') || '';
            }
            
            if (!AppState.currentUser.profile) AppState.currentUser.profile = {};
            
            const hasAvatar = AppState.currentUser.avatar || AppState.currentUser.profile.avatar;
            if (!hasAvatar) {
                const emailHash = md5(AppState.currentUser.email);
                const avatarStyles = ['identicon', 'bottts', 'avataaars', 'jdenticon', 'micah'];
                const styleIndex = Array.from(AppState.currentUser.email).reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarStyles.length;
                const style = avatarStyles[styleIndex];
                const generatedAvatar = `https://api.dicebear.com/7.x/${style}/png?seed=${emailHash}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
                AppState.currentUser.avatar = generatedAvatar;
                AppState.currentUser.profile.avatar = generatedAvatar;
            } else {
                if (AppState.currentUser.avatar && !AppState.currentUser.profile.avatar) {
                    AppState.currentUser.profile.avatar = AppState.currentUser.avatar;
                } else if (AppState.currentUser.profile.avatar && !AppState.currentUser.avatar) {
                    AppState.currentUser.avatar = AppState.currentUser.profile.avatar;
                }
            }
            
            updateUserUI();
            updateUserStats();

            if (AppState.games.length > 0) {
                renderFilteredGames();
            }

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

function updateUserStats() {
    const userFavoritesCount = document.getElementById('userFavoritesCount');
    if (userFavoritesCount) userFavoritesCount.textContent = AppState.favorites.length;
    
    const userGamesCount = document.getElementById('userGamesCount');
    if (userGamesCount && AppState.currentUser) {
        const userGames = AppState.games.filter(game => game.created_by === AppState.currentUser.email);
        userGamesCount.textContent = userGames.length;
    }
}

async function updateUserUI() {
    if (!AppState.currentUser) { 
        resetUserUI(); 
        return; 
    }
    
    const userBtn = document.getElementById('userBtn');
    const avatarUrl = AppState.currentUser.avatar || 
                     (AppState.currentUser.profile && AppState.currentUser.profile.avatar);
    
    if (userBtn) {
        if (avatarUrl) {
            userBtn.innerHTML = `<img src="${avatarUrl}" alt="${AppState.currentUser.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
            const initials = AppState.currentUser.name.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
            userBtn.innerHTML = `<span style="font-size: 1.1rem; font-weight: 600;">${initials}</span>`;
        }
        userBtn.title = 'Mi cuenta';
        userBtn.classList.add('user-logged-in');
    }

    const createGameBtn = document.getElementById('createGameBtn');
    if (createGameBtn) {
        createGameBtn.style.display = 'none';
        try {
            const status = await api.getGameStatus();
            if (status.success && status.can_create_game) {
                createGameBtn.style.display = ''; 
            } else {
                createGameBtn.style.display = 'none';
            }
        } catch (e) {
            console.error("Error checking game status", e);
        }
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
    
    if (userEmailElement) {
        userEmailElement.textContent = truncateEmail(AppState.currentUser.email);
    }
    
    if (userAvatarElement) {
        if (avatarUrl) {
            userAvatarElement.innerHTML = `<img src="${avatarUrl}" alt="${AppState.currentUser.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else { 
            const initials = AppState.currentUser.name.split(' ')
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
    
    if (createGameBtn) createGameBtn.style.display = 'none';
    
    const userFavoritesCount = document.getElementById('userFavoritesCount');
    const userGamesCount = document.getElementById('userGamesCount');
    
    if (userFavoritesCount) userFavoritesCount.textContent = '0';
    if (userGamesCount) userGamesCount.textContent = '0';
    
    hideUserPanel();
}