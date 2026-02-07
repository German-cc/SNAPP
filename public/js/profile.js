// ==========================================
// PROFILE MANAGEMENT
// ==========================================

function showChangePasswordModal() {
    closeAllModals();
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) { 
        changePasswordModal.classList.add('show'); 
        changePasswordModal.classList.remove('hidden'); 
        document.body.style.overflow = 'hidden'; 
    }
}

function hideChangePasswordModal() {
    const changePasswordModal = document.getElementById('changePasswordModal');
    if (changePasswordModal) { 
        changePasswordModal.classList.remove('show'); 
        changePasswordModal.classList.add('hidden'); 
        document.body.style.overflow = ''; 
        const form = document.getElementById('changePasswordForm'); 
        if (form) form.reset(); 
    }
}

let currentProfileImageFile = null;
let currentProfileImageData = null;

const GENERIC_AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Midnight&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/micah/svg?seed=Shadow&backgroundColor=ffdfbf',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Pixel&backgroundColor=b6e3f4',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Max&backgroundColor=c0aede',
    'https://api.dicebear.com/7.x/micah/svg?seed=Nova&backgroundColor=d1d4f9',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Bolt&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sky&backgroundColor=ffdfbf'
];

function showEditProfileModal() {
    closeAllModals();
    const editProfileModal = document.getElementById('editProfileModal');
    if (!editProfileModal) return;
    
    if (AppState.currentUser) {
        const usernameInput = document.getElementById('editProfileUsername');
        const firstNameInput = document.getElementById('editProfileFirstName');
        const lastNameInput = document.getElementById('editProfileLastName');
        const nameInput = document.getElementById('editProfileName');
        const emailInput = document.getElementById('editProfileEmail');
        const avatarPreview = document.getElementById('editProfileAvatarPreview');
        const avatarImage = document.getElementById('editProfileAvatarImage');
        const avatarIcon = document.getElementById('editProfileAvatarIcon');
        const removePhotoBtn = document.getElementById('removeProfilePhoto');
        
        const username = AppState.currentUser.username || AppState.currentUser.email.split('@')[0];
        if (usernameInput) usernameInput.value = username;
        
        if (AppState.currentUser.firstName && AppState.currentUser.lastName) {
            if (firstNameInput) firstNameInput.value = AppState.currentUser.firstName;
            if (lastNameInput) lastNameInput.value = AppState.currentUser.lastName;
            if (nameInput) nameInput.value = `${AppState.currentUser.firstName} ${AppState.currentUser.lastName}`;
        } else {
            const fullName = AppState.currentUser.name || '';
            const nameParts = fullName.trim().split(' ');
            if (firstNameInput) firstNameInput.value = nameParts[0] || '';
            if (lastNameInput) lastNameInput.value = nameParts.slice(1).join(' ') || '';
            if (nameInput) nameInput.value = fullName;
        }
        
        if (emailInput) emailInput.value = AppState.currentUser.email || '';
        
        const currentAvatar = AppState.currentUser.avatar || 
                             (AppState.currentUser.profile && AppState.currentUser.profile.avatar);
        
        if (currentAvatar) {
            if (avatarImage) { 
                avatarImage.src = currentAvatar; 
                avatarImage.classList.add('show'); 
                avatarImage.classList.remove('hidden'); 
            }
            if (avatarIcon) avatarIcon.classList.add('hidden');
            if (avatarPreview) avatarPreview.classList.add('has-image');
            if (removePhotoBtn) removePhotoBtn.classList.add('show');
            currentProfileImageData = currentAvatar;
        } else {
            if (avatarImage) { 
                avatarImage.classList.remove('show'); 
                avatarImage.classList.add('hidden'); 
            }
            if (avatarIcon) avatarIcon.classList.remove('hidden');
            if (avatarPreview) avatarPreview.classList.remove('has-image');
            if (removePhotoBtn) removePhotoBtn.classList.remove('show');
            currentProfileImageData = null;
        }
    }
    
    renderGenericAvatars();
    editProfileModal.classList.add('show');
    editProfileModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setupProfileImageUpload();
}

function renderGenericAvatars() {
    const container = document.getElementById('genericAvatarsGrid');
    if (!container) return;
    
    let html = '';
    GENERIC_AVATARS.forEach((avatarUrl, index) => {
        const isSelected = currentProfileImageData === avatarUrl;
        html += `
            <div class="generic-avatar-option ${isSelected ? 'selected' : ''}" 
                 data-avatar-url="${avatarUrl}" 
                 title="Avatar ${index + 1}">
                <img src="${avatarUrl}" alt="Avatar ${index + 1}">
                ${isSelected ? '<i class="fas fa-check-circle selected-badge"></i>' : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    container.querySelectorAll('.generic-avatar-option').forEach(option => {
        option.addEventListener('click', function() {
            selectGenericAvatar(this.getAttribute('data-avatar-url'));
        });
    });
}

function selectGenericAvatar(avatarUrl) {
    const avatarImage = document.getElementById('editProfileAvatarImage');
    const avatarIcon = document.getElementById('editProfileAvatarIcon');
    const avatarPreview = document.getElementById('editProfileAvatarPreview');
    const removePhotoBtn = document.getElementById('removeProfilePhoto');
    
    if (avatarImage) { 
        avatarImage.src = avatarUrl; 
        avatarImage.classList.add('show'); 
    }
    
    if (avatarIcon) avatarIcon.classList.add('hidden');
    if (avatarPreview) avatarPreview.classList.add('has-image');
    if (removePhotoBtn) removePhotoBtn.classList.add('show');
    
    currentProfileImageData = avatarUrl;
    currentProfileImageFile = null;
    
    renderGenericAvatars();
    api.showNotification('Avatar seleccionado', 'success');
}

function hideEditProfileModal() {
    const editProfileModal = document.getElementById('editProfileModal');
    if (editProfileModal) {
        editProfileModal.classList.remove('show'); 
        editProfileModal.classList.add('hidden'); 
        document.body.style.overflow = '';
        
        const form = document.getElementById('editProfileForm'); 
        if (form) form.reset();
        
        currentProfileImageFile = null;
        const avatarImage = document.getElementById('editProfileAvatarImage');
        const avatarIcon = document.getElementById('editProfileAvatarIcon');
        const removePhotoBtn = document.getElementById('removeProfilePhoto');
        
        if (avatarImage) avatarImage.classList.remove('show');
        if (avatarIcon) avatarIcon.classList.remove('hidden');
        if (removePhotoBtn) removePhotoBtn.classList.remove('show');
    }
}

function setupProfileImageUpload() {
    const dz = document.getElementById('profileDropzone');
    const fi = document.getElementById('profileImageInput');
    const ap = document.getElementById('editProfileAvatarPreview');
    const rb = document.getElementById('removeProfilePhoto');
    
    if (!dz || !fi) return;
    
    const ndz = dz.cloneNode(true);
    dz.parentNode.replaceChild(ndz, dz);
    
    const fdz = document.getElementById('profileDropzone');
    const ffi = document.getElementById('profileImageInput');
    
    if (!fdz || !ffi) return;
    
    fdz.onclick = (e) => {
        if (e.target.id !== 'profileImageInput') {
            e.preventDefault();
            ffi.click();
        }
    };
    
    if (ap) {
        const nap = ap.cloneNode(true);
        ap.parentNode.replaceChild(nap, ap);
        document.getElementById('editProfileAvatarPreview').onclick = () => ffi.click();
    }
    
    ffi.onchange = (e) => {
        const f = e.target.files[0];
        if (f) handleProfileImageFile(f);
    };
    
    fdz.ondragover = (e) => {
        e.preventDefault();
        fdz.classList.add('dragover');
    };
    
    fdz.ondragleave = (e) => {
        e.preventDefault();
        fdz.classList.remove('dragover');
    };
    
    fdz.ondrop = (e) => {
        e.preventDefault();
        fdz.classList.remove('dragover');
        const f = e.dataTransfer.files[0];
        if (f?.type.startsWith('image/')) {
            handleProfileImageFile(f);
        } else {
            api.showNotification('Solo imágenes', 'error');
        }
    };
    
    if (rb) {
        const nrb = rb.cloneNode(true);
        rb.parentNode.replaceChild(nrb, rb);
        document.getElementById('removeProfilePhoto').onclick = (e) => {
            e.preventDefault();
            removeProfilePhoto();
        };
    }
}

function handleProfileImageFile(file) {
    if (file.size > 5 * 1024 * 1024) {
        api.showNotification('Imagen muy grande (máx. 5MB)', 'error');
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        api.showNotification('Solo archivos de imagen', 'error');
        return;
    }
    
    currentProfileImageFile = file;
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
        img.src = e.target.result;
    };
    
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let width = img.width;
        let height = img.height;
        const maxSize = 800;
        
        if (width > maxSize || height > maxSize) {
            if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
            } else {
                width = (width / height) * maxSize;
                height = maxSize;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        
        const avatarImage = document.getElementById('editProfileAvatarImage');
        const avatarIcon = document.getElementById('editProfileAvatarIcon');
        const avatarPreview = document.getElementById('editProfileAvatarPreview');
        const removePhotoBtn = document.getElementById('removeProfilePhoto');
        
        if (avatarImage) { 
            avatarImage.src = compressedBase64; 
            avatarImage.classList.add('show'); 
            currentProfileImageData = compressedBase64; 
        }
        
        if (avatarIcon) avatarIcon.classList.add('hidden');
        if (avatarPreview) avatarPreview.classList.add('has-image');
        if (removePhotoBtn) removePhotoBtn.classList.add('show');
        
        api.showNotification('Imagen optimizada', 'success');
    };
    
    reader.readAsDataURL(file);
}

function removeProfilePhoto() {
    currentProfileImageFile = null;
    currentProfileImageData = null;
    
    const avatarImage = document.getElementById('editProfileAvatarImage');
    const avatarIcon = document.getElementById('editProfileAvatarIcon');
    const avatarPreview = document.getElementById('editProfileAvatarPreview');
    const removePhotoBtn = document.getElementById('removeProfilePhoto');
    const fileInput = document.getElementById('profileImageInput');
    
    if (avatarImage) { 
        avatarImage.src = ''; 
        avatarImage.classList.remove('show'); 
    }
    
    if (avatarIcon) avatarIcon.classList.remove('hidden');
    if (avatarPreview) avatarPreview.classList.remove('has-image');
    if (removePhotoBtn) removePhotoBtn.classList.remove('show');
    if (fileInput) fileInput.value = '';
    
    api.showNotification('Foto de perfil eliminada', 'info');
}

async function handleEditProfileSubmit(e) {
    e.preventDefault();
    
    const username = document.getElementById('editProfileUsername').value.trim();
    const firstName = document.getElementById('editProfileFirstName').value.trim();
    const lastName = document.getElementById('editProfileLastName').value.trim();
    const email = document.getElementById('editProfileEmail').value.trim();
    
    if (!username || !firstName || !lastName || !email) {
        api.showNotification('Por favor, completa todos los campos', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        api.showNotification('Por favor, ingresa un email válido', 'error');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        api.showNotification('El nombre de usuario debe tener 3-20 caracteres (solo letras, números y guión bajo)', 'error');
        return;
    }
    
    showPageLoading('Actualizando perfil...');
    
    try {
        const fullName = `${firstName} ${lastName}`;
        const profileData = {
            username: username,
            firstName: firstName,
            lastName: lastName,
            name: fullName,
            email: email,
            avatar: currentProfileImageData || AppState.currentUser.avatar
        };
        
        const response = await api.updateProfile(profileData);
        if (response.success) {
            const p = response.profile;
            AppState.currentUser.username = p.username;
            AppState.currentUser.firstName = p.firstName;
            AppState.currentUser.lastName = p.lastName;
            AppState.currentUser.name = p.name;
            AppState.currentUser.email = p.email;
            
            if (p.avatar) {
                AppState.currentUser.avatar = p.avatar;
                if (!AppState.currentUser.profile) {
                    AppState.currentUser.profile = {};
                }
                AppState.currentUser.profile.avatar = p.avatar;
            }
            
            await api.checkAuth();
            updateUserDisplay();
            api.showNotification(response.message || 'Perfil actualizado', 'success');
            hideEditProfileModal();
        } else {
            api.showNotification(response.error || 'Error al actualizar perfil', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        api.showNotification('Error de conexión al actualizar perfil', 'error');
    } finally {
        hidePageLoading();
    }
}