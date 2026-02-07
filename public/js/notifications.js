// ==========================================
// NOTIFICATIONS SYSTEM
// ==========================================

function toggleNotificationsPanel() {
    const panel = document.getElementById('notificationsPanel');
    if (!panel) return;
    
    if (panel.classList.contains('hidden')) {
        const userPanel = document.getElementById('userPanel');
        if (userPanel) {
            userPanel.classList.remove('show');
            userPanel.classList.add('hidden');
        }
        
        panel.classList.remove('hidden');
        panel.classList.add('block');
        
        if (window.innerWidth <= 768) {
            document.body.style.overflow = 'hidden';
        }
        
        loadNotifications(); // Refrescar al abrir
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('block');
        document.body.style.overflow = '';
    }
}

async function loadNotifications() {
    if (!AppState.currentUser) return;
    
    const response = await api.getNotifications();
    if (response.success) {
        AppState.notifications = response.notifications;
        renderNotifications();
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
        const unreadClass = notification.read ? '' : 'bg-[rgba(130,102,90,0.05)] border-l-[3px] border-l-[var(--accent)]';
        const timeAgo = notification.time || 'Reciente';
        
        const iconMap = {
            'welcome': 'fas fa-gamepad',
            'success': 'fas fa-check-circle',
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle'
        };

        const icon = iconMap[notification.type] || notification.icon || 'fas fa-bell';
        
        html += `
            <div class="notification-item ${unreadClass} p-[1rem] border-b border-[rgba(130,102,90,0.1)] flex gap-[0.8rem] cursor-pointer transition-all duration-200 hover:bg-[var(--bg-sidebar-hover)]" data-id="${notification.id}">
                <div class="notification-icon w-[36px] h-[36px] min-w-[36px] rounded-full bg-[image:var(--gradient-accent)] flex items-center justify-center text-white text-[0.9rem]">
                    <i class="${icon}"></i>
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
        api.markRead(id);
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
        api.markRead(null); 
        renderNotifications();
        api.showNotification('Todas las notificaciones marcadas como leídas', 'success');
    }
}

function clearAllNotifications() {
    if (AppState.notifications.length === 0) return;
    
    if (confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?')) {
        AppState.notifications = []; 
        renderNotifications();
        api.showNotification('Notificaciones eliminadas de la vista', 'info');
    }
}