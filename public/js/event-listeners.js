// ==========================================
// EVENT LISTENERS SETUP
// ==========================================

function setupEventListeners() {
    // Sidebar toggle
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
    
    // User button
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
        userBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            AppState.currentUser ? toggleUserPanel() : showAuthModal('login');
        });
    }
    
    // Notifications button
    const notificationsBtn = document.getElementById('notificationsBtn');
    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleNotificationsPanel();
        });
    }
    
    // Notifications panel buttons
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
    
    // Login form
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
                    loadUserSettings(response.settings); 
                    updateUserUI(); 
                    renderFilteredGames(); 
                    startSessionRefresh();
                    loadNotifications();
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
    
    // Register forms
    const registerFormStep1 = document.getElementById('registerFormStep1');
    if (registerFormStep1) {
        registerFormStep1.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('registerFirstName').value.trim();
            const lastName = document.getElementById('registerLastName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
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
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                api.showNotification('El formato del email no es válido', 'error');
                return;
            }
            
            goToRegisterStep2();
        });
    }
    
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
                    loadNotifications();
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
    
    const backToStep1Btn = document.getElementById('backToStep1');
    if (backToStep1Btn) {
        backToStep1Btn.addEventListener('click', function() {
            goToRegisterStep1();
        });
    }
    
    function loadAvatarSelection() {
        const avatarGrid = document.getElementById('avatarSelectionGrid');
        if (!avatarGrid) return;
        
        const avatars = GENERIC_AVATARS;
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
    
    function goToRegisterStep2() {
        const step1 = document.getElementById('registerFormStep1');
        const step2 = document.getElementById('registerFormStep2');
        
        if (step1 && step2) {
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            loadAvatarSelection();
            
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
        document.getElementById('registerFirstName').value = '';
        document.getElementById('registerLastName').value = '';
        document.getElementById('registerEmail').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('registerConfirmPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('selectedAvatar').value = '';
        document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
        goToRegisterStep1();
    }
    
    // Favorites button
    const favoritesBtn = document.getElementById('favoritesBtn');
    if (favoritesBtn) {
        favoritesBtn.addEventListener('click', async function() {
            showFavoritesInPanel();
        });
    }
    
    // Edit profile button
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            showEditProfileModal();
            hideUserPanel();
        });
    }
    
    // Change password button
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', function() {
            showChangePasswordModal();
            hideUserPanel();
        });
    }
    
    // Logout button
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
    
    // Close buttons
    const closeAuthBtn = document.getElementById('closeAuth');
    if (closeAuthBtn) closeAuthBtn.addEventListener('click', hideAuthModal);
    
    const closeUserPanelBtn = document.getElementById('closeUserPanel');
    if (closeUserPanelBtn) closeUserPanelBtn.addEventListener('click', hideUserPanel);
    
    const closeChangePasswordBtn = document.getElementById('closeChangePassword');
    if (closeChangePasswordBtn) closeChangePasswordBtn.addEventListener('click', hideChangePasswordModal);
    
    const closeEditProfileBtn = document.getElementById('closeEditProfile');
    if (closeEditProfileBtn) closeEditProfileBtn.addEventListener('click', hideEditProfileModal);
    
    const cancelEditProfileBtn = document.getElementById('cancelEditProfile');
    if (cancelEditProfileBtn) cancelEditProfileBtn.addEventListener('click', hideEditProfileModal);
    
    // Forms
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) editProfileForm.addEventListener('submit', handleEditProfileSubmit);
    
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
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchAuthTab(this.getAttribute('data-tab'));
        });
    });
    
    // Category buttons
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sidebar-category').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.getAttribute('data-category');
            filterGamesLocally(category, '');
            hideSearchSuggestions();
        });
    });
    
    // Search input
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
            
            if (notificationsPanel && 
                notificationsPanel.classList.contains('show') && 
                !notificationsPanel.contains(e.target) && 
                (!notificationsBtn || !notificationsBtn.contains(e.target))) {
                notificationsPanel.classList.remove('show');
                notificationsPanel.classList.add('hidden');
                document.body.style.overflow = '';
            }
        });
        
        setupKeyboardNavigation();
    }
    
    // Theme toggle
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
            
            addNotification(
                `Tema cambiado a ${newTheme === 'dark' ? 'oscuro' : 'claro'}`,
                'El tema de la interfaz ha sido actualizado.',
                'info'
            );
        });
    }
    
    // Random game button
    const randomGameBtn = document.getElementById('randomGameBtn');
    if (randomGameBtn) {
        randomGameBtn.addEventListener('click', async function() {
            try {
                const response = await api.getRandomGame();
                if (response.success && response.redirect_url) {
                    showPageLoading('Cargando juego aleatorio...');
                    const loadingTimeout = setTimeout(() => { hidePageLoading(); }, 5000);
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
    
    // Back to top button
    const backToTopBtn = document.getElementById('backToTopBtn');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // Close favorites section button
    const closeFavoritesSectionBtn = document.getElementById('closeFavoritesSection');
    if (closeFavoritesSectionBtn) {
        closeFavoritesSectionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            hideFavoritesInPanel();
        });
    }
    
    // Close modals on overlay click
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
            saveCreateGameFormData();
            createGameContainer.classList.remove('show');
            createGameContainer.classList.add('hidden');
            document.body.style.overflow = '';
        }
        
        if (changePasswordModal && e.target === changePasswordModal) hideChangePasswordModal();
        if (editProfileModal && e.target === editProfileModal) hideEditProfileModal();
        
        if (notificationsPanel && 
            e.target === notificationsPanel && 
            (!notificationsBtn || !notificationsBtn.contains(e.target))) {
            notificationsPanel.classList.remove('block');
            notificationsPanel.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });
    
    // Close modals on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideAuthModal();
            hideUserPanel();
            hideChangePasswordModal();
            hideEditProfileModal();
            
            const createGameContainer = document.getElementById('createGameContainer');
            if (createGameContainer && createGameContainer.classList.contains('show')) {
                saveCreateGameFormData();
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
    
    // Mobile sidebar overlay click
    document.addEventListener('click', function(e) {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('toggleSidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        
        if (window.innerWidth <= 1024 && sidebar && !sidebar.classList.contains('hidden')) {
            const userBtn = document.getElementById('userBtn');
            const notificationsBtn = document.getElementById('notificationsBtn');
            const createGameBtn = document.getElementById('createGameBtn');
            const mobileSearchBtn = document.getElementById('mobileSearchBtn');
            const themeToggle = document.getElementById('themeToggle');
            const userPanel = document.getElementById('userPanel');
            const notificationsPanel = document.getElementById('notificationsPanel');
            const authModal = document.getElementById('authModal');
            const createGameContainer = document.getElementById('createGameContainer');
            
            const isInSafeElement = sidebar.contains(e.target) ||
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
            
            if (!isInSafeElement && overlay && overlay.contains(e.target)) {
                toggleSidebar();
            }
        }
    });
    
    // Hide search suggestions on category click
    document.querySelectorAll('.sidebar-category').forEach(btn => {
        btn.addEventListener('click', function() {
            hideSearchSuggestions();
        });
    });
    
    // Hide search suggestions on scroll
    window.addEventListener('scroll', function() {
        if (window.scrollY > 100) {
            hideSearchSuggestions();
        }
    });
    
    // Mobile search setup
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
}