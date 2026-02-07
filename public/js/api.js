// ==========================================
// API FUNCTIONS
// ==========================================

const api = {
    async checkAuth() {
        try { 
            const response = await fetch('/api/auth/check'); 
            return response.json(); 
        } catch { 
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
        } catch { 
            return { success: false, error: 'Network error' }; 
        }
    },
    
    async logout() {
        try { 
            const response = await fetch('/api/auth/logout', { method: 'POST' }); 
            return response.json(); 
        } catch { 
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
        } catch { 
            return { success: false, error: 'Network error' }; 
        }
    },
    
    async refreshSession() {
        try { 
            const response = await fetch('/api/auth/refresh'); 
            return response.json(); 
        } catch { 
            return { success: false, error: 'Network error' }; 
        }
    },
    
    async getGames(category = 'Todos', search = '') {
        try { 
            let url = `/api/games?category=${encodeURIComponent(category)}`; 
            if (search) url += `&search=${encodeURIComponent(search)}`; 
            const response = await fetch(url); 
            return response.json(); 
        } catch { 
            return { success: false, error: 'Network error' }; 
        }
    },
    
    async getRandomGame() {
        try { 
            const response = await fetch('/api/games/random'); 
            return response.json(); 
        } catch { 
            return { success: false, error: 'Network error' }; 
        }
    },
    
    async toggleFavorite(gameTitle) {
        if (!AppState.currentUser) {
            return { success: false, error: 'Authentication required', requiresLogin: true };
        }
        try { 
            const response = await fetch('/api/favorites/toggle', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ game_title: gameTitle }) 
            }); 
            return response.json(); 
        } catch { 
            return { success: false, error: 'Network error' }; 
        }
    },
    
    async updateSettings(settings) {
        if (!AppState.currentUser) return { success: false };
        try { 
            const response = await fetch('/api/settings/update', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(settings) 
            }); 
            return response.json(); 
        } catch { 
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
        } catch { 
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
        } catch { 
            return { success: false, error: 'Network error' }; 
        }
    },
    
    async updateProfile(profileData) {
        try { 
            const response = await fetch('/api/auth/update-profile', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(profileData) 
            }); 
            return response.json(); 
        } catch { 
            return { success: false, error: 'Network error' }; 
        }
    },
    
    async getGameStatus() {
        try {
            const response = await fetch('/api/user/game-status');
            return response.json();
        } catch (error) {
            return { success: false, error: 'Network error' };
        }
    },
    
    async submitGameForm(formData) {
        try {
           const form = new FormData();
           for (const key in formData) {
               form.append(key, formData[key]);
           }
           const response = await fetch('/api/games/submit', {
               method: 'POST',
               body: form
           });
           return response.json();
        } catch { 
            return { success: false, error: 'Network error' }; 
        }
    },
    
    async getNotifications() {
        if (!AppState.currentUser) return { success: false };
        try { 
            const response = await fetch('/api/notifications'); 
            return response.json(); 
        } catch { 
            return { success: false }; 
        }
    },
    
    async markRead(id = null) {
        if (!AppState.currentUser) return { success: false };
        try { 
            const response = await fetch('/api/notifications/read', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ id }) 
            }); 
            return response.json(); 
        } catch { 
            return { success: false }; 
        }
    },
    
    showNotification(message, type = 'info') {
        SoundManager.play(type);

        const notification = document.createElement('div');
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