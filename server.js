const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 5000;

// --- 1. CONFIGURACIÓN ---
const DATA_FOLDER = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_FOLDER, 'users.json');
const FAVORITES_FILE = path.join(DATA_FOLDER, 'favorites.json');
const GAMES_FILE = path.join(DATA_FOLDER, 'games.json');

// Carpetas públicas
const PUBLIC_FOLDER = path.join(__dirname, 'public');
const UPLOADS_FOLDER = path.join(PUBLIC_FOLDER, 'uploads');
const GAME_UPLOADS = path.join(PUBLIC_FOLDER, 'juegos_usuarios');

// Crear carpetas si no existen
[DATA_FOLDER, UPLOADS_FOLDER, path.join(UPLOADS_FOLDER, 'avatars'), GAME_UPLOADS].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configuración de Carga de Archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, GAME_UPLOADS); },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- 2. MIDDLEWARES ---
// Límite aumentado a 50MB para arreglar el error de "Editar Perfil" con imágenes grandes
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('tiny'));

// Archivos estáticos
app.use('/public', express.static(PUBLIC_FOLDER));
app.use('/static', express.static(PUBLIC_FOLDER));

// Sesión
app.use(session({
    secret: 'dev-key-super-secreta',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 días
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- 3. FUNCIONES AUXILIARES ---

function loadData(filepath, defaultVal = {}) {
    if (!fs.existsSync(filepath)) return defaultVal;
    try {
        const data = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(data) || defaultVal;
    } catch (e) { console.error(`Error leyendo ${filepath}:`, e); return defaultVal; }
}

function saveData(filepath, data) {
    try {
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) { console.error(`Error guardando ${filepath}:`, e); return false; }
}

function loadUsers() { return loadData(USERS_FILE, {}); }
function saveUsers(users) { saveData(USERS_FILE, users); }

function getCleanUser(user) {
    if (!user) return null;
    const { password, ...clean } = user;
    return clean;
}

function getUserGameInfo(username) {
    if (!username) return null;
    const safeUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const infoPath = path.join(GAME_UPLOADS, safeUsername, 'game_info.json');
    return loadData(infoPath, null);
}

// --- 4. RUTAS ---

app.get('/', (req, res) => {
    res.render('index', { user: req.session.currentUser || null });
});

// --- AUTH & PERFIL ---

app.get('/api/auth/check', (req, res) => {
    if (req.session.currentUser) {
        const users = loadUsers();
        const freshUser = users[req.session.currentUser.email];
        
        if (freshUser) {
            const clean = getCleanUser(freshUser);
            req.session.currentUser = clean;
            
            // Cargar favoritos frescos
            const allFavs = loadData(FAVORITES_FILE, {});
            const favorites = allFavs[clean.email] || [];
            
            console.log(`👤 Usuario verificado: ${clean.email} | Favoritos: ${favorites.length}`);

            return res.json({ 
                authenticated: true, 
                user: clean, 
                favorites, 
                settings: freshUser.settings || { theme: 'dark', performance_mode: false } 
            });
        }
    }
    res.json({ authenticated: false });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const users = loadUsers();
    const user = users[email?.toLowerCase()];

    if (user && await bcrypt.compare(password, user.password)) {
        const cleanUser = getCleanUser(user);
        req.session.currentUser = cleanUser;
        const favorites = loadData(FAVORITES_FILE, {})[user.email] || [];
        
        console.log(`🔓 Login exitoso: ${user.email}`);
        
        res.json({ 
            success: true, 
            user: cleanUser, 
            favorites,
            settings: user.settings || { theme: 'dark' }
        });
    } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, username, avatar } = req.body;
    const users = loadUsers();
    const emailLower = email.toLowerCase();

    if (users[emailLower]) return res.status(400).json({ error: 'Email ya registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        name, email: emailLower, username: username || emailLower.split('@')[0], 
        password: hashedPassword,
        avatar: avatar || `https://api.dicebear.com/7.x/identicon/png?seed=${emailLower}`,
        created_at: new Date(),
        notifications: [],
        settings: { theme: 'dark', performance_mode: false },
        profile: { bio: '', social: {} }
    };

    users[emailLower] = newUser;
    saveUsers(users);
    req.session.currentUser = getCleanUser(newUser);
    res.json({ success: true, user: req.session.currentUser, message: 'Registro exitoso' });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Arreglo del Perfil y Foto
app.post('/api/auth/update-profile', (req, res) => {
    if (!req.session.currentUser) return res.status(401).json({ error: 'Auth requerida' });
    
    const { username, firstName, lastName, avatar } = req.body;
    const currentEmail = req.session.currentUser.email;
    const users = loadUsers();
    
    if (!users[currentEmail]) return res.status(404).json({ error: 'Usuario no encontrado' });

    const user = users[currentEmail];
    if (username) user.username = username;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (firstName && lastName) user.name = `${firstName} ${lastName}`;
    
    // Guardar Avatar
    if (avatar && avatar.startsWith('data:image')) {
       try {
           const matches = avatar.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
           if (matches) {
               const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1].replace('xml+svg', 'svg');
               const buffer = Buffer.from(matches[2], 'base64');
               const filename = `avatar_${crypto.createHash('md5').update(currentEmail).digest('hex')}.${ext}`;
               const filePath = path.join(PUBLIC_FOLDER, 'uploads', 'avatars', filename);
               fs.writeFileSync(filePath, buffer);
               user.avatar = `/public/uploads/avatars/${filename}?v=${Date.now()}`;
               if (!user.profile) user.profile = {};
               user.profile.avatar = user.avatar;
           }
       } catch (e) { console.error("Error avatar:", e); }
    } else if (avatar) {
        user.avatar = avatar;
        if (!user.profile) user.profile = {};
        user.profile.avatar = avatar;
    }
    
    saveUsers(users);
    const cleanUser = getCleanUser(user);
    req.session.currentUser = cleanUser;
    
    res.json({ success: true, user: cleanUser, profile: cleanUser, message: 'Perfil actualizado' });
});

// --- JUEGOS Y FAVORITOS ---

app.get('/api/games', (req, res) => {
    let games = loadData(GAMES_FILE, []);
    const { category, search } = req.query;

    // Inyectar estado de favorito si está logueado
    if (req.session.currentUser) {
        const allFavs = loadData(FAVORITES_FILE, {});
        const userFavs = allFavs[req.session.currentUser.email] || [];
        games = games.map(g => ({ ...g, is_favorite: userFavs.includes(g.title) }));
    }

    if (category && category !== 'Todos') games = games.filter(g => g.category === category);
    if (search) games = games.filter(g => g.title.toLowerCase().includes(search.toLowerCase()));

    res.json({ success: true, games });
});

app.post('/api/favorites/toggle', (req, res) => {
    // 1. Logs para depuración (verás esto en tu terminal)
    console.log("👉 Petición de favorito recibida:", req.body);

    // 2. Validación de sesión
    if (!req.session.currentUser) {
        console.log("❌ Error: Usuario no autenticado");
        return res.status(401).json({ error: 'Debes iniciar sesión' });
    }

    try {
        const { game_title } = req.body;
        
        // 3. Validación de datos
        if (!game_title) {
            console.log("❌ Error: No se envió el título del juego");
            return res.status(400).json({ error: 'Título inválido' });
        }

        const email = req.session.currentUser.email;
        
        // 4. Carga segura de datos (evita que falle si el JSON está vacío)
        let allFavs = loadData(FAVORITES_FILE, {});
        
        // Corrección automática si el archivo favorites.json se corrompió y es un Array en vez de Objeto
        if (Array.isArray(allFavs)) {
            console.log("⚠️ Advertencia: favorites.json era una lista, reseteando estructura...");
            allFavs = {}; 
        }

        let userFavs = allFavs[email] || [];
        let action = 'added';

        // 5. Lógica de añadir/quitar
        if (userFavs.includes(game_title)) {
            userFavs = userFavs.filter(t => t !== game_title);
            action = 'removed';
        } else {
            userFavs.push(game_title);
        }

        // 6. Guardado
        allFavs[email] = userFavs;
        const saveResult = saveData(FAVORITES_FILE, allFavs);

        if (!saveResult) {
            throw new Error("No se pudo escribir en el archivo JSON");
        }

        console.log(`✅ Éxito: ${action} favorito "${game_title}" para ${email}`);

        // 7. RESPUESTA FINAL (Importante: return para asegurar que termina aquí)
        return res.status(200).json({ 
            success: true, 
            action: action, 
            favorites: userFavs 
        });

    } catch (error) {
        console.error("🔥 CRASH EN FAVORITOS:", error);
        // Incluso si falla, enviamos un JSON válido para que el frontend no diga "Error de conexión"
        return res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor: ' + error.message 
        });
    }
});

app.get('/api/user/game-status', (req, res) => {
    if (!req.session.currentUser) return res.json({ success: false });
    const gameInfo = getUserGameInfo(req.session.currentUser.username);
    res.json({ success: true, has_game: !!gameInfo, current_game: gameInfo, can_create_game: !gameInfo });
});

app.post('/api/games/submit', upload.fields([{ name: 'game_thumbnail' }, { name: 'game_file' }]), (req, res) => {
    if (!req.session.currentUser) return res.status(401).json({ error: 'Auth requerida' });
    try {
        const user = req.session.currentUser;
        const safeUsername = user.username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const userGameFolder = path.join(GAME_UPLOADS, safeUsername);
        if (!fs.existsSync(userGameFolder)) fs.mkdirSync(userGameFolder, { recursive: true });

        const gameData = {
            ...req.body,
            creator_email: user.email,
            created_at: new Date().toISOString(),
            status: 'pending'
        };

        if (req.files['game_thumbnail']) {
            const file = req.files['game_thumbnail'][0];
            const newPath = path.join(userGameFolder, file.filename);
            fs.renameSync(file.path, newPath);
            gameData.game_image = `/public/juegos_usuarios/${safeUsername}/${file.filename}`;
        }
        if (req.files['game_file']) {
            const file = req.files['game_file'][0];
            const newPath = path.join(userGameFolder, file.filename);
            fs.renameSync(file.path, newPath);
            gameData.game_link = `/public/juegos_usuarios/${safeUsername}/${file.filename}`;
        }

        fs.writeFileSync(path.join(userGameFolder, 'game_info.json'), JSON.stringify(gameData, null, 2));
        res.json({ success: true, message: 'Juego enviado', game: gameData });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Error interno' }); }
});

// --- UTILIDADES ---
app.get('/api/user/stats', (req, res) => {
    if (!req.session.currentUser) return res.json({ success: false });
    const favs = loadData(FAVORITES_FILE, {})[req.session.currentUser.email] || [];
    res.json({ success: true, stats: { favorites_count: favs.length } });
});

app.get('/api/notifications', (req, res) => {
    if (!req.session.currentUser) return res.json({ success: false });
    const users = loadUsers();
    res.json({ success: true, notifications: users[req.session.currentUser.email]?.notifications || [] });
});

app.post('/api/settings/update', (req, res) => {
    if (!req.session.currentUser) return res.status(401).json({ error: 'Auth requerida' });
    const users = loadUsers();
    const email = req.session.currentUser.email;
    if (users[email]) {
        users[email].settings = { ...(users[email].settings || {}), ...req.body };
        saveUsers(users);
        req.session.currentUser.settings = users[email].settings;
        res.json({ success: true, settings: users[email].settings });
    } else { res.status(404).json({ error: 'Usuario' }); }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor reparado corriendo en http://localhost:${PORT}`);
});