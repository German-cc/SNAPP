// ==========================================
// PERFORMANCE MODE
// ==========================================

class PerformanceMode {
    constructor() {
        this.bodyClass = 'performance-mode';
        this.toggleBtn = null;
        this.statusIcon = null;
        this.isEnabled = false;
        this.backendLoaded = false;
    }
    
    async init(userSettings = null) {
        console.log('🔧 Performance.js inicializando...', userSettings);
        
        if (userSettings && userSettings.performance_mode !== undefined) {
            this.isEnabled = userSettings.performance_mode;
            this.backendLoaded = true;
            
            if (this.isEnabled) {
                this.enable(false);
            } else {
                this.disable(false);
            }
            
            console.log('✅ Modo rendimiento cargado desde configuración del usuario:', this.isEnabled);
        } else if (!userSettings) {
            console.log('👤 Usuario no autenticado, ejecutando auto-detección');
            this.autoDetectPerformance();
        }
        
        this.setupUI();
    }
    
    setupUI() {
        this.toggleBtn = document.getElementById('performanceToggle');
        this.statusIcon = document.getElementById('perfStatusIcon');

        if (this.toggleBtn) {
            const newBtn = this.toggleBtn.cloneNode(true);
            this.toggleBtn.parentNode.replaceChild(newBtn, this.toggleBtn);
            this.toggleBtn = newBtn;
            
            this.toggleBtn.addEventListener('click', (e) => {
                this.toggle();
            });
            
            this.updateUI();
        }
    }
    
    async saveToBackend() {
        const isAuthenticated = window.AppState && window.AppState.currentUser;
        if (!isAuthenticated) return;
        
        try {
            const response = await fetch('/api/settings/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    performance_mode: this.isEnabled
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.backendLoaded = true;
                }
            }
        } catch (error) {
            console.error('❌ Error guardando configuración en el backend:', error);
        }
    }
    
    autoDetectPerformance() {
        let isLowEnd = false;
        
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    const lowEndKeywords = /Intel|HD Graphics|UHD|Iris|Radeon.*Graphics|Adreno|Mali|PowerVR|SwiftShader|llvmpipe|Microsoft Basic Render/i;
                    
                    if (lowEndKeywords.test(renderer)) {
                        isLowEnd = true;
                    }
                }
            }
        } catch (e) {
            // Silently fail
        }
        
        if ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || 
            (navigator.deviceMemory && navigator.deviceMemory <= 4)) {
            isLowEnd = true;
        }
        
        if (isLowEnd) {
            this.enable(true, 'Modo Rendimiento activado automáticamente por hardware limitado');
        }
    }
    
    savePreference() {
        this.saveToBackend();
    }
    
    enable(showNotify = true, customMsg = null) {
        this.isEnabled = true;
        document.body.classList.add(this.bodyClass);
        this.savePreference();
        this.updateUI();
        
        // Forzar reflow para animaciones
        document.body.style.display = 'none';
        document.body.offsetHeight; 
        document.body.style.display = '';

        if (showNotify) {
            const msg = customMsg || 'Modo Rendimiento: ACTIVADO 🚀';
            this.showNotification(msg, 'success');
        }
    }
    
    disable(showNotify = true) {
        this.isEnabled = false;
        document.body.classList.remove(this.bodyClass);
        this.savePreference();
        this.updateUI();
        
        if (showNotify) {
            this.showNotification('Modo Rendimiento: DESACTIVADO ✨', 'info');
        }
    }
    
    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }
    
    updateUI() {
        if (!this.toggleBtn || !this.statusIcon) return;
        
        if (this.isEnabled) {
            this.toggleBtn.classList.add('active-performance');
            this.toggleBtn.style.color = 'var(--success-color)';
            this.statusIcon.classList.remove('hidden');
        } else {
            this.toggleBtn.classList.remove('active-performance');
            this.toggleBtn.style.color = ''; 
            this.statusIcon.classList.add('hidden');
        }
    }

    showNotification(msg, type) {
        if (typeof api !== 'undefined' && api.showNotification) {
            api.showNotification(msg, type);
        } else {
            console.log(msg);
        }
    }
}

window.performanceMode = new PerformanceMode();