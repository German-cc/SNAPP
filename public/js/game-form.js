// ==========================================
// GAME CREATION FORM
// ==========================================

function saveCreateGameFormData() {
    const formFields = [
        'gameName', 'gameDescription', 'gameURL', 'gameCategory', 
        'creatorName', 'creatorEmail', 'termsAccepted', 'privacyAccepted'
    ];
    
    const formData = {};
    
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.type === 'checkbox') {
                formData[fieldId] = field.checked;
            } else {
                formData[fieldId] = field.value;
            }
        }
    });
    
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview && imagePreview.src && !imagePreview.src.includes('placeholder')) {
        formData.imagePreviewSrc = imagePreview.src;
    }
    
    AppState.createGameFormData = formData;
}

function restoreCreateGameFormData() {
    if (!AppState.createGameFormData || Object.keys(AppState.createGameFormData).length === 0) {
        return;
    }
    
    const formData = AppState.createGameFormData;
    
    Object.keys(formData).forEach(fieldId => {
        if (fieldId === 'imagePreviewSrc') {
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview) {
                imagePreview.src = formData[fieldId];
                imagePreview.classList.remove('hidden');
            }
            return;
        }
        
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.type === 'checkbox') {
                field.checked = formData[fieldId];
            } else {
                field.value = formData[fieldId];
            }
        }
    });
    
    if (formData.gameCategory) {
        const categoryOptions = document.querySelectorAll('.category-option');
        categoryOptions.forEach(option => {
            if (option.getAttribute('data-value') === formData.gameCategory) {
                option.classList.add('selected');
            } else {
                option.classList.remove('selected');
            }
        });
    }
}

function clearCreateGameFormData() {
    AppState.createGameFormData = {};
    const gameForm = document.getElementById('gameForm');
    if (gameForm) gameForm.reset();
    
    const imagePreview = document.getElementById('imagePreview');
    if (imagePreview) {
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
    }
}

function setupGameForm() {
    const createGameBtn = document.getElementById('createGameBtn');
    const createGameContainer = document.getElementById('createGameContainer');
    const cancelCreateGameBtn = document.getElementById('cancelCreateGame');
    const closeCreateGameBtn = document.getElementById('closeCreateGame');
    const gameForm = document.getElementById('gameForm');
    const categoryOptions = document.querySelectorAll('.category-option');
    const gameImageInput = document.getElementById('gameImage');
    const imagePreview = document.getElementById('imagePreview');
    const previewGameBtn = document.getElementById('previewGame');
    const submitGameBtn = document.getElementById('submitGame');
    const termsAccepted = document.getElementById('termsAccepted');
    const privacyAccepted = document.getElementById('privacyAccepted');
    
    if (createGameBtn) {
        createGameBtn.addEventListener('click', function() {
            closeAllModals();
            
            if (!AppState.currentUser) {
                api.showNotification('Debes iniciar sesión para crear juegos', 'error');
                showAuthModal('login');
                return;
            }
            
            createGameContainer.classList.add('show');
            createGameContainer.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            setTimeout(() => {
                const formElement = createGameContainer.querySelector('.create-game-form');
                if (formElement) formElement.scrollTop = 0;
                createGameContainer.scrollTop = 0;
            }, 100);
            
            restoreCreateGameFormData();
            
            if (AppState.currentUser) {
                const creatorName = document.getElementById('creatorName');
                const creatorEmail = document.getElementById('creatorEmail');
                
                if (creatorName && !creatorName.value) {
                    creatorName.value = AppState.currentUser.name;
                }
                
                if (creatorEmail && !creatorEmail.value) {
                    creatorEmail.value = AppState.currentUser.email;
                }
            }
        });
    }
    
    function closeGameForm() {
        saveCreateGameFormData();
        createGameContainer.classList.remove('show');
        createGameContainer.classList.add('hidden');
        document.body.style.overflow = '';
    }
    
    if (cancelCreateGameBtn) {
        cancelCreateGameBtn.addEventListener('click', closeGameForm);
    }
    
    if (closeCreateGameBtn) {
        closeCreateGameBtn.addEventListener('click', closeGameForm);
    }
    
    if (createGameContainer) {
        createGameContainer.addEventListener('click', function(e) {
            if (e.target === createGameContainer) {
                closeGameForm();
            }
        });
    }
    
    categoryOptions.forEach(option => {
        option.addEventListener('click', function() {
            categoryOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            const categorySelect = document.getElementById('gameCategory');
            categorySelect.value = this.getAttribute('data-value');
        });
    });
    
    if (gameImageInput && imagePreview) {
        gameImageInput.addEventListener('input', function() {
            const url = this.value.trim();
            if (url && isValidURL(url)) {
                const img = document.createElement('img');
                img.src = url;
                
                img.onload = function() {
                    imagePreview.innerHTML = '';
                    imagePreview.appendChild(img);
                };
                
                img.onerror = function() {
                    imagePreview.innerHTML = '<span>❌ Error al cargar imagen</span>';
                };
            } else {
                imagePreview.innerHTML = '<span>Vista previa aparecerá aquí</span>';
            }
        });
    }
    
    if (gameForm) {
        gameForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!validateAllSteps()) {
                api.showNotification('Por favor corrige los errores en el formulario', 'error');
                return;
            }
            
            if (!termsAccepted.checked || !privacyAccepted.checked) {
                api.showNotification('Debes aceptar los términos y condiciones', 'error');
                return;
            }
            
            showFormLoading(true);
            
            try {
                const formData = getFormData();
                const response = await api.submitGameForm(formData);
                
                if (response.success) {
                    api.showNotification(
                        response.message || '¡Juego enviado con éxito! Te contactaremos pronto.', 
                        'success'
                    );
                    clearCreateGameFormData();
                    closeGameForm();
                    await loadAllGames();
                    updateUserUI();
                } else {
                    throw new Error(response.error || 'Error en el envío');
                }
            } catch (error) {
                api.showNotification('Error al enviar el juego. Por favor intenta de nuevo.', 'error');
            } finally {
                showFormLoading(false);
            }
        });
    }
    
    function isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    function showFieldError(field, message) {
        let errorDiv = field.parentNode.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            field.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        field.parentNode.classList.add('error');
    }
    
    function hideFieldError(field) {
        const errorDiv = field.parentNode.querySelector('.error-message');
        if (errorDiv) errorDiv.remove();
        field.parentNode.classList.remove('error');
    }
    
    function validateAllSteps() {
        let isValid = true;
        const requiredFields = gameForm.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                const section = field.closest('.form-section');
                if (section) section.classList.add('highlight-error');
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    function getFormData() {
        const formData = {};
        const formElements = gameForm.elements;
        
        for (let element of formElements) {
            if (element.name && element.type !== 'button' && element.type !== 'submit') {
                if (element.type === 'checkbox' && element.name.includes('[]')) {
                    if (!formData[element.name]) formData[element.name] = [];
                    if (element.checked) formData[element.name].push(element.value);
                } else if (element.type === 'checkbox') {
                    formData[element.name] = element.checked;
                } else if (element.type === 'file') {
                    formData[element.name] = element.files[0];
                } else {
                    formData[element.name] = element.value;
                }
            }
        }
        
        return formData;
    }
    
    function showGamePreview(data) {
        const preview = `
            <div class="game-preview bg-[var(--bg-main)] rounded-[12px] p-[1.5rem] mb-[1.5rem]">
                <h3 class="flex items-center gap-[0.5rem] text-[var(--accent)]">
                    <i class="fas fa-eye"></i> Vista Previa del Juego
                </h3>
                <div class="preview-content">
                    <div class="preview-header border-b border-[var(--text-muted)] pb-[1rem] mb-[1rem]">
                        <h4 class="text-[1.2rem] font-semibold">${data.game_title || 'Sin título'}</h4>
                        <p><strong>Categoría:</strong> ${data.game_category || 'No especificada'}</p>
                    </div>
                    <div class="preview-image mb-[1rem]">
                        <img src="${data.game_image || 'https://via.placeholder.com/300x200'}" 
                             alt="Vista previa" 
                             class="w-full max-h-[300px] object-cover rounded-[12px]">
                    </div>
                    <div class="preview-details space-y-2">
                        <p><strong>Descripción:</strong> ${data.game_description?.substring(0, 200) || 'Sin descripción'}...</p>
                    </div>
                </div>
            </div>`;
        
        const modal = document.createElement('div');
        modal.className = 'preview-modal fixed inset-0 bg-[var(--overlay)] flex items-center justify-center z-[4000] animate-[fadeIn_0.3s_ease]';
        modal.innerHTML = `
            <div class="preview-container bg-[var(--bg-card)] rounded-[12px] w-[90%] max-w-[600px] max-h-[90vh] overflow-y-auto p-[2rem] shadow-[var(--shadow-xlarge)]">
                <div class="preview-header flex justify-between items-center mb-[1.5rem] pb-[1rem] border-b border-[var(--text-muted)]">
                    <h3 class="text-[var(--accent)] m-0">Confirmación</h3>
                    <button class="close-preview bg-transparent border-none text-[var(--text-muted)] text-[1.2rem] cursor-pointer hover:text-[var(--accent)]">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                ${preview}
                <div class="preview-actions flex justify-end gap-[1rem] mt-[1.5rem]">
                    <button class="btn btn-secondary close-preview">Cerrar</button>
                    <button class="btn btn-primary" id="confirmSubmit">Confirmar Envío</button>
                </div>
            </div>`;
        
        document.body.appendChild(modal);
        
        modal.querySelectorAll('.close-preview').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        
        const confirmBtn = modal.querySelector('#confirmSubmit');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                modal.remove();
                gameForm.dispatchEvent(new Event('submit'));
            });
        }
    }
    
    function showFormLoading(show) {
        const progressBar = document.querySelector('.form-progress');
        const progressFill = document.querySelector('.progress-fill');
        const submitBtn = document.getElementById('submitGame');
        
        if (show) {
            if (progressBar) progressBar.style.display = 'block';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('loading');
            }
            
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(interval);
                }
                if (progressFill) progressFill.style.width = `${progress}%`;
            }, 200);
        } else {
            if (progressBar) progressBar.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
            if (progressFill) progressFill.style.width = '0%';
        }
    }
    
    function resetForm() {
        categoryOptions.forEach(opt => opt.classList.remove('selected'));
        const categorySelect = document.getElementById('gameCategory');
        if (categorySelect) categorySelect.value = '';
        
        if (imagePreview) {
            imagePreview.innerHTML = '<span>Vista previa aparecerá aquí</span>';
        }
        
        document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('.form-section.highlight-error').forEach(el => {
            el.classList.remove('highlight-error');
        });
    }
    
    if (previewGameBtn) {
        previewGameBtn.addEventListener('click', function() {
            if (validateAllSteps()) {
                const formData = getFormData();
                showGamePreview(formData);
            }
        });
    }
}