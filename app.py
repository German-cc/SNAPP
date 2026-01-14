from flask import Flask, render_template, request, jsonify, session, send_from_directory
import json
import random
import os
import re
import hashlib
import secrets
from datetime import datetime, timedelta
from functools import wraps
from werkzeug.utils import secure_filename

app = Flask(__name__, 
            static_folder='static',
            static_url_path='',
            template_folder='templates')

app.secret_key = secrets.token_hex(32222)
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'static/uploads/games'
app.config['ALLOWED_EXTENSIONS'] = {'zip', 'rar', '7z', 'html', 'js', 'css', 'png', 'jpg', 'jpeg', 'gif'}
app.config['SESSION_COOKIE_MAX_AGE'] = 30 * 24 * 3600
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['SESSION_REFRESH_EACH_REQUEST'] = True
app.config['SESSION_PERMANENT'] = True
app.config['SESSION_USE_SIGNER'] = True

DATA_FOLDER = 'data'
USERS_FILE = os.path.join(DATA_FOLDER, 'users.json')
FAVORITES_FILE = os.path.join(DATA_FOLDER, 'favorites.json')
GAMES_FILE = os.path.join(DATA_FOLDER, 'games.json')
SUBMISSIONS_FILE = os.path.join(DATA_FOLDER, 'submissions.json')

INITIAL_GAMES = [
    {
        "id": 1,
        "title": "Pilar",
        "category": "Puzzle",
        "thumb": "/static/uploads/games/Stack/ico.png",
        "gameUrl": "/static/uploads/games/Stack/index.html",
        "description": "Juego de apilar bloques",
        "developer": "SNAPP Team",
        "difficulty": "Media",
        "players": "1",
        "tags": ["puzzle","estrategia"],
        "is_favorite": False,
        "created_at": "2024-01-01",
        "views": 0,
        "rating": 1.5,
        "created_by": "admin@test.com"
    },
    {
        "id": 2,
        "title": "Sudoku",
        "category": "Puzzle",
        "thumb": "/static/uploads/games/Sudoku/ico.png",
        "gameUrl": "/static/uploads/games/Sudoku/Juego/index.html",
        "description": "Juego de lógica numérica en el que debes completar una cuadrícula respetando las reglas del Sudoku",
        "developer": "SNAPP Team",
        "difficulty": "Media",
        "players": "1",
        "tags": ["puzzle","estrategia"],
        "is_favorite": False,
        "created_at": "2024-01-01",
        "views": 0,
        "rating": 4.5,
        "created_by": "admin@test.com"
    },
]

def load_data(filepath, default=None):
    if default is None:
        default = {}
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
    except:
        pass
    return default

def save_data(filepath, data):
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except:
        return False

def get_all_games():
    return load_data(GAMES_FILE, INITIAL_GAMES)

def save_all_games(games):
    return save_data(GAMES_FILE, games)

def get_user_favorites(email):
    favorites_data = load_data(FAVORITES_FILE, {})
    return favorites_data.get(email, [])

def save_user_favorites(email, favorites):
    favorites_data = load_data(FAVORITES_FILE, {})
    favorites_data[email] = favorites
    return save_data(FAVORITES_FILE, favorites_data)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'current_user' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_url(url):
    pattern = r'^https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+'
    return re.match(pattern, url) is not None

def generate_avatar(email):
    email_hash = hashlib.md5(email.lower().encode()).hexdigest()
    avatar_styles = ['identicon', 'bottts', 'avataaars', 'jdenticon', 'micah']
    style_index = sum(ord(char) for char in email) % len(avatar_styles)
    avatar_style = avatar_styles[style_index]
    return f"https://api.dicebear.com/7.x/{avatar_style}/png?seed={email_hash}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf"

@app.before_request
def make_session_permanent():
    session.permanent = True

@app.before_request
def refresh_session():
    if 'current_user' in session:
        session.modified = True

@app.route('/')
def index():
    current_user = session.get('current_user')
    theme = session.get('theme', 'dark')
    sidebar_visible = session.get('sidebar_visible', 'true') == 'true'
    
    all_games = get_all_games()
    user_favorites = []
    full_user_data = None
    
    if current_user:
        user_email = current_user.get('email')
        if user_email:
            user_favorites = get_user_favorites(user_email)
            users = load_data(USERS_FILE, {})
            if user_email in users:
                user_data = users[user_email]
                full_user_data = {
                    'name': user_data['name'],
                    'email': user_email,
                    'role': user_data.get('role', 'user'),
                    'created_at': user_data.get('created_at'),
                    'profile': user_data.get('profile', {})
                }
    
    shuffled_games = all_games.copy()
    random.shuffle(shuffled_games)
    
    for game in shuffled_games:
        game['is_favorite'] = game['title'] in user_favorites
    
    return render_template('index.html',
                         games=shuffled_games,
                         current_user=full_user_data,
                         theme=theme,
                         sidebar_visible=sidebar_visible,
                         favorites=user_favorites)

@app.route('/api/games', methods=['GET'])
def api_get_games():
    try:
        category = request.args.get('category', 'Todos')
        search = request.args.get('search', '')
        sort_by = request.args.get('sort', 'newest')
        
        all_games = get_all_games()
        filtered_games = all_games
        
        if category and category != 'Todos':
            filtered_games = [g for g in filtered_games if g.get('category') == category]
        
        if search:
            search_lower = search.lower()
            filtered_games = [g for g in filtered_games 
                            if search_lower in g.get('title', '').lower() or
                            search_lower in g.get('description', '').lower() or
                            search_lower in g.get('developer', '').lower() or
                            any(search_lower in tag.lower() for tag in g.get('tags', []))]
        
        if sort_by == 'rating':
            filtered_games.sort(key=lambda x: x.get('rating', 0), reverse=True)
        elif sort_by == 'views':
            filtered_games.sort(key=lambda x: x.get('views', 0), reverse=True)
        elif sort_by == 'newest':
            filtered_games.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        elif sort_by == 'title':
            filtered_games.sort(key=lambda x: x.get('title', ''))
        elif sort_by == 'oldest':
            filtered_games.sort(key=lambda x: x.get('created_at', ''))
        elif sort_by == 'id':
            filtered_games.sort(key=lambda x: x.get('id', 0))
        
        user_favorites = []
        session_user = session.get('current_user')
        if session_user and 'email' in session_user:
            user_favorites = get_user_favorites(session_user['email'])
        
        for game in filtered_games:
            game['is_favorite'] = game['title'] in user_favorites
        
        return jsonify({
            'success': True,
            'games': filtered_games,
            'count': len(filtered_games),
            'sort': sort_by
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/games/shuffle', methods=['GET'])
def api_shuffle_games():
    try:
        all_games = get_all_games()
        shuffled_games = all_games.copy()
        random.shuffle(shuffled_games)
        
        user_favorites = []
        session_user = session.get('current_user')
        if session_user and 'email' in session_user:
            user_favorites = get_user_favorites(session_user['email'])
        
        for game in shuffled_games:
            game['is_favorite'] = game['title'] in user_favorites
        
        return jsonify({
            'success': True,
            'games': shuffled_games
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/games/random', methods=['GET'])
def api_random_game():
    try:
        all_games = get_all_games()
        valid_games = [g for g in all_games if g.get('gameUrl')]
        
        if not valid_games:
            return jsonify({'error': 'No hay juegos disponibles'}), 404
        
        random_game = random.choice(valid_games)
        
        all_games = get_all_games()
        for game in all_games:
            if game['id'] == random_game['id']:
                game['views'] = game.get('views', 0) + 1
        save_all_games(all_games)
        
        return jsonify({
            'success': True,
            'game': random_game,
            'redirect_url': random_game['gameUrl']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/check', methods=['GET'])
def api_check_auth():
    try:
        if 'current_user' not in session:
            return jsonify({'authenticated': False, 'reason': 'no_session'})
        
        session_user = session.get('current_user')
        
        if not session_user or 'email' not in session_user:
            session.clear()
            return jsonify({'authenticated': False, 'reason': 'invalid_session'})
        
        user_email = session_user['email']
        users = load_data(USERS_FILE, {})
        
        if user_email not in users:
            session.clear()
            return jsonify({'authenticated': False, 'reason': 'user_not_found'})
        
        user_data = users[user_email]
        favorites = get_user_favorites(user_email)
        session.modified = True
        
        full_user_data = {
            'name': user_data['name'],
            'email': user_email,
            'role': user_data.get('role', 'user'),
            'created_at': user_data.get('created_at'),
            'profile': user_data.get('profile', {})
        }
        
        return jsonify({
            'authenticated': True,
            'user': full_user_data,
            'favorites': favorites,
            'session_refreshed': True
        })
    except Exception as e:
        return jsonify({'authenticated': False, 'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            return jsonify({'error': 'Email y contraseña son requeridos'}), 400
        
        users = load_data(USERS_FILE, {})
        
        if email in users and users[email].get('password') == password:
            session['current_user'] = {
                'email': email,
                'name': users[email]['name'],
                'role': users[email].get('role', 'user')
            }
            
            session.permanent = True
            users[email]['last_login'] = datetime.now().isoformat()
            save_data(USERS_FILE, users)
            
            user_data = users[email]
            
            if 'profile' not in user_data:
                user_data['profile'] = {}
            if not user_data['profile'].get('avatar'):
                user_data['profile']['avatar'] = generate_avatar(email)
                users[email]['profile'] = user_data['profile']
                save_data(USERS_FILE, users)
            
            favorites = get_user_favorites(email)
            
            full_user_data = {
                'name': user_data['name'],
                'email': email,
                'role': user_data.get('role', 'user'),
                'created_at': user_data.get('created_at'),
                'profile': user_data.get('profile', {})
            }
            
            return jsonify({
                'success': True,
                'user': full_user_data,
                'favorites': favorites,
                'message': '¡Bienvenido! Has iniciado sesión correctamente.'
            })
        
        return jsonify({'error': 'Email o contraseña incorrectos'}), 401
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/auth/register', methods=['POST'])
def api_register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        
        if not all([name, email, password, confirm_password]):
            return jsonify({'error': 'Todos los campos son requeridos'}), 400
        
        if not validate_email(email):
            return jsonify({'error': 'El formato del email no es válido'}), 400
        
        if password != confirm_password:
            return jsonify({'error': 'Las contraseñas no coinciden'}), 400
        
        if len(password) < 6:
            return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400
        
        users = load_data(USERS_FILE, {})
        
        if email in users:
            return jsonify({'error': 'El email ya está registrado'}), 400
        
        avatar_url = generate_avatar(email)
        
        users[email] = {
            'name': name,
            'password': password,
            'role': 'user',
            'created_at': datetime.now().isoformat(),
            'last_login': None,
            'profile': {
                'bio': f'Hola, soy {name}!',
                'website': '',
                'avatar': avatar_url,
                'created_at': datetime.now().isoformat()
            }
        }
        
        if save_data(USERS_FILE, users):
            session['current_user'] = {
                'email': email,
                'name': name,
                'role': 'user'
            }
            
            session.permanent = True
            
            full_user_data = {
                'name': name,
                'email': email,
                'role': 'user',
                'created_at': users[email]['created_at'],
                'profile': users[email]['profile']
            }
            
            return jsonify({
                'success': True,
                'user': full_user_data,
                'favorites': [],
                'message': '¡Cuenta creada con éxito! Bienvenido/a.'
            })
        
        return jsonify({'error': 'Error al guardar usuario'}), 500
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/auth/logout', methods=['GET'])
def api_logout():
    try:
        session.clear()
        return jsonify({
            'success': True,
            'message': 'Has cerrado sesión.'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/refresh', methods=['GET'])
def api_refresh_session():
    try:
        if 'current_user' not in session:
            return jsonify({'success': False, 'message': 'No hay sesión activa'}), 401
        
        session.modified = True
        
        return jsonify({
            'success': True,
            'message': 'Sesión refrescada',
            'refreshed_at': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/settings/update', methods=['POST'])
def api_update_settings():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        if 'theme' in data:
            session['theme'] = data['theme']
        
        if 'sidebar_visible' in data:
            session['sidebar_visible'] = str(data['sidebar_visible']).lower()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/games/submit', methods=['POST'])
def api_submit_game():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['game_title', 'game_category', 'game_image', 'game_description', 
                          'creator_name', 'creator_email']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'El campo {field.replace("_", " ")} es requerido'}), 400
        
        if not validate_email(data['creator_email']):
            return jsonify({'error': 'El email del creador no es válido'}), 400
        
        url_fields = ['game_image', 'game_thumbnail', 'game_url', 'game_trailer', 'creator_website']
        for field in url_fields:
            if data.get(field) and not validate_url(data[field]):
                data[field] = ''
        
        submissions = load_data(SUBMISSIONS_FILE, [])
        
        new_submission = {
            'id': len(submissions) + 1,
            'game_title': data['game_title'],
            'game_category': data['game_category'],
            'game_image': data['game_image'],
            'game_description': data['game_description'],
            'game_developer': data.get('game_developer', ''),
            'game_url': data.get('game_url', ''),
            'game_difficulty': data.get('game_difficulty', 'Media'),
            'game_players': data.get('game_players', '1'),
            'game_tags': data.get('game_tags', ''),
            'creator_name': data['creator_name'],
            'creator_email': data['creator_email'],
            'creator_website': data.get('creator_website', ''),
            'status': 'pending',
            'submitted_at': datetime.now().isoformat(),
            'submitted_by': session.get('current_user', {}).get('email', 'anonymous')
        }
        
        submissions.append(new_submission)
        
        if save_data(SUBMISSIONS_FILE, submissions):
            return jsonify({
                'success': True,
                'submission_id': new_submission['id'],
                'message': '¡Tu juego ha sido enviado exitosamente! Te contactaremos pronto por email.'
            })
        
        return jsonify({'error': 'Error al guardar el envío'}), 500
    except Exception as e:
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/favorites/toggle', methods=['POST'])
@login_required
def api_toggle_favorite():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        game_title = data.get('game_title', '').strip()
        
        if not game_title:
            return jsonify({'error': 'Game title is required'}), 400
        
        session_user = session['current_user']
        user_email = session_user['email']
        
        favorites_data = load_data(FAVORITES_FILE, {})
        user_favorites = favorites_data.get(user_email, [])
        
        action = 'added'
        if game_title in user_favorites:
            user_favorites.remove(game_title)
            action = 'removed'
        else:
            user_favorites.append(game_title)
        
        favorites_data[user_email] = user_favorites
        save_data(FAVORITES_FILE, favorites_data)
        
        return jsonify({
            'success': True,
            'action': action,
            'favorites': user_favorites,
            'message': f'Juego {action == "added" and "añadido a" or "removido de"} favoritos'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/update', methods=['POST'])
@login_required
def api_update_profile():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        session_user = session['current_user']
        user_email = session_user['email']
        users = load_data(USERS_FILE, {})
        
        if user_email not in users:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        if 'name' in data and data['name'].strip():
            new_name = data['name'].strip()
            users[user_email]['name'] = new_name
            session_user['name'] = new_name
            session['current_user'] = session_user
        
        if 'bio' in data:
            users[user_email]['profile']['bio'] = data['bio'].strip()
        
        if 'website' in data:
            users[user_email]['profile']['website'] = data['website'].strip()
        
        if save_data(USERS_FILE, users):
            updated_user_data = {
                'name': users[user_email]['name'],
                'email': user_email,
                'role': users[user_email].get('role', 'user'),
                'profile': users[user_email].get('profile', {})
            }
            
            return jsonify({
                'success': True,
                'user': updated_user_data,
                'message': 'Perfil actualizado correctamente'
            })
        
        return jsonify({'error': 'Error al guardar cambios'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/update-profile', methods=['POST'])
@login_required
def api_update_user_profile():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        session_user = session['current_user']
        user_email = session_user['email']
        users = load_data(USERS_FILE, {})
        
        if user_email not in users:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Update name
        if 'name' in data and data['name'].strip():
            new_name = data['name'].strip()
            users[user_email]['name'] = new_name
            session_user['name'] = new_name
            session['current_user'] = session_user
        
        # Update avatar
        if 'avatar' in data:
            if 'profile' not in users[user_email]:
                users[user_email]['profile'] = {}
            users[user_email]['profile']['avatar'] = data['avatar']
        
        # Save changes
        if save_data(USERS_FILE, users):
            updated_user_data = {
                'name': users[user_email]['name'],
                'email': user_email,
                'role': users[user_email].get('role', 'user'),
                'created_at': users[user_email].get('created_at'),
                'profile': users[user_email].get('profile', {})
            }
            
            return jsonify({
                'success': True,
                'user': updated_user_data,
                'message': 'Perfil actualizado correctamente'
            })
        
        return jsonify({'error': 'Error al guardar cambios'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/games/<int:game_id>', methods=['GET'])
def api_get_game_by_id(game_id):
    try:
        all_games = get_all_games()
        game = next((g for g in all_games if g.get('id') == game_id), None)
        
        if not game:
            return jsonify({'error': 'Juego no encontrado'}), 404
        
        game['views'] = game.get('views', 0) + 1
        save_all_games(all_games)
        
        session_user = session.get('current_user')
        if session_user and 'email' in session_user:
            favorites = get_user_favorites(session_user['email'])
            game['is_favorite'] = game['title'] in favorites
        
        return jsonify({
            'success': True,
            'game': game
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/change-password', methods=['POST'])
@login_required
def api_change_password():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        confirm_new_password = data.get('confirm_new_password', '')
        
        session_user = session['current_user']
        user_email = session_user['email']
        
        if not all([current_password, new_password, confirm_new_password]):
            return jsonify({'error': 'Todos los campos son requeridos'}), 400
        
        if new_password != confirm_new_password:
            return jsonify({'error': 'Las nuevas contraseñas no coinciden'}), 400
        
        if len(new_password) < 6:
            return jsonify({'error': 'La nueva contraseña debe tener al menos 6 caracteres'}), 400
        
        users = load_data(USERS_FILE, {})
        
        if user_email not in users or users[user_email].get('password') != current_password:
            return jsonify({'error': 'Contraseña actual incorrecta'}), 401
        
        users[user_email]['password'] = new_password
        users[user_email]['password_changed_at'] = datetime.now().isoformat()
        
        if save_data(USERS_FILE, users):
            return jsonify({
                'success': True,
                'message': 'Contraseña cambiada con éxito.'
            })
        
        return jsonify({'error': 'Error al cambiar la contraseña'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/stats', methods=['GET'])
@login_required
def api_get_user_stats():
    try:
        session_user = session['current_user']
        user_email = session_user['email']
        
        favorites = get_user_favorites(user_email)
        all_games = get_all_games()
        user_games = [g for g in all_games if g.get('created_by') == user_email]
        
        return jsonify({
            'success': True,
            'stats': {
                'favorites_count': len(favorites),
                'games_count': len(user_games),
                'total_views': sum(g.get('views', 0) for g in user_games),
                'avg_rating': sum(g.get('rating', 0) for g in user_games) / len(user_games) if user_games else 0
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/<path:filename>')
def serve_any_file(filename):
    if filename.endswith('.css'):
        try:
            return send_from_directory('static/css', filename.split('/')[-1])
        except:
            pass
    
    if filename.endswith('.js'):
        try:
            return send_from_directory('static/js', filename.split('/')[-1])
        except:
            pass
    
    if filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg')):
        try:
            return send_from_directory('static/img', filename.split('/')[-1])
        except:
            pass
    
    if filename.startswith('SNAPP'):
        try:
            return send_from_directory('.', filename)
        except:
            pass
    
    try:
        return send_from_directory('.', filename)
    except:
        return "File not found", 404

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)