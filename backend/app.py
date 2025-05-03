from flask import Flask, jsonify, request, session, abort, send_file, send_from_directory, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_cors import CORS
import base64
import requests
from authlib.integrations.flask_client import OAuth

import os
import base64
from werkzeug.utils import secure_filename
import sys
sys.path.append('..')
from mlsb_algo_api.MultiLayerLSB import MultiLayerLSB
import secrets

from config import get_config

app = Flask(__name__)
config = get_config()

# Apply configuration
app.config.from_object(config)

# Configure file size limits (in bytes)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max total request size
app.config['MAX_COVER_IMAGE_SIZE'] = 10 * 1024 * 1024  # 10MB for cover images
app.config['MAX_SECRET_MESSAGE_SIZE'] = 10 * 1024 * 1024  # 10MB for secret messages
app.config['MAX_STEGO_IMAGE_SIZE'] = 100 * 1024 * 1024  # 100MB for stego images

# Configure CORS
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": config.CORS_ORIGINS}})

# Ensure upload folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

db = SQLAlchemy(app)
oauth = OAuth(app)

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=True)
    password = db.Column(db.String(120), nullable=True)
    google_id = db.Column(db.String(120), nullable=True)
    stego_rooms = db.relationship('StegoRoom', backref='user', lazy=True)

class StegoRoom(db.Model):
    _tablename_ = 'stego_room'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=True)
    is_encrypted = db.Column(db.Boolean, default=False)
    key = db.Column(db.String(120), nullable=True)
    iv = db.Column(db.String(120), nullable=True)
    cover_image = db.Column(db.Text, nullable=True)  
    message_file = db.Column(db.Text, nullable=True)      
    stego_image = db.Column(db.Text, nullable=True)   
    metrics = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_key_stored = db.Column(db.Boolean, default=False)

# FOR TESTING FOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTING
class MLSBDemo(db.Model):
    __tablename__ = 'mlsb_demo'
    id = db.Column(db.Integer, primary_key=True)
    cover_image = db.Column(db.Text, nullable=True)
    message_file = db.Column(db.Text, nullable=True)
    stego_image = db.Column(db.Text, nullable=True)
    is_encrypted = db.Column(db.Boolean, default=False)
    rounds = db.Column(db.Integer, default=1)
    metrics = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
# FOR TESTING FOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTING

admin = Admin(app, name='Admin Panel', template_mode='bootstrap3')
admin.add_view(ModelView(User, db.session))
admin.add_view(ModelView(StegoRoom, db.session))
admin.add_view(ModelView(MLSBDemo, db.session))

google = oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    access_token_url='https://accounts.google.com/o/oauth2/token',
    api_base_url='https://www.googleapis.com/oauth2/v1/',
    redirect_uri=f"{config.BASE_URL}/api/google/callback",
    client_kwargs={
        'scope': 'openid email profile',
    },
)

@app.route('/')
def index():
    return "Flask app with SQLite is set up!"

# Create an application variable for WSGI without circular import
application = app

# Check if running in production mode
if os.path.exists('/home/zydev/StegWebsite/backend/instance/database.db') == False and os.path.exists('/home/zydev'):
    with app.app_context():
        db.create_all()

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    error_details = {
        'error': str(e),
        'trace': traceback.format_exc()
    }
    print(error_details)  # This will show in the error log
    return jsonify(error_details), 500

@app.route('/api/google/login', methods=['GET'])
def google_login():
    nonce = secrets.token_urlsafe(16)
    session['_google_authlib_nonce_'] = nonce
    print(f"Nonce set in session: {nonce}")
    return jsonify({'nonce': nonce})

@app.route('/api/google/callback', methods=['POST'])
def google_callback():
    try:
        data = request.json
        token = data.get('token')
        nonce = data.get('nonce')

        if not token:
            raise ValueError("Token is missing")
        
        if not nonce:
            raise ValueError("Nonce is missing")

        # Retrieve the nonce from the session
        session_nonce = session.get('_google_authlib_nonce_')
        if not session_nonce or session_nonce != nonce:
            raise ValueError("Invalid nonce")

        # Verify the token using Google's OAuth 2.0 tokeninfo endpoint
        response = requests.get(f'https://oauth2.googleapis.com/tokeninfo?id_token={token}')
        if response.status_code != 200:
            raise ValueError("Invalid token")

        user_info = response.json()
        google_id = user_info['sub']
        email = user_info['email']

        # Check if a user with this Google ID already exists
        user = User.query.filter_by(google_id=google_id).first()
        if not user:
            user = User.query.filter_by(email=email).first()
            if user:
                user.google_id = google_id
            else:
                user = User(email=email, google_id=google_id)
                db.session.add(user)
            db.session.commit()

        session['user_id'] = user.id
        return jsonify({
            'message': 'Logged in successfully with Google',
            'user_id': user.id,
            'email': user.email
        })
    except Exception as e:
        print(f"Error in Google callback: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()

    if user and user.password == password:
        session['user_id'] = user.id
        return jsonify({
            "message": "Logged in successfully.",
            "user_id": user.id
        })
    return jsonify({"error": "Invalid credentials."}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({"message": "Logged out successfully."})

@app.route('/api/steg_rooms', methods=['GET'])
def get_steg_rooms():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session['user_id']
    stego_rooms = StegoRoom.query.filter_by(user_id=user_id).all()
    
    rooms_list = [
        {
            "id": room.id,
            "name": room.name,
            "is_encrypted": room.is_encrypted,
            "message_file": room.message_file,
            "cover_image": room.cover_image,
            "stego_image": room.stego_image,
            "metrics": room.metrics,
            "is_key_stored": room.is_key_stored
        }
        for room in stego_rooms
    ]
    return jsonify(rooms_list)

@app.route('/api/current_user', methods=['GET'])
def current_user():

    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user = User.query.get(session["user_id"])
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "email": user.email,
        "google_id": user.google_id
    })

@app.route("/api/create_stego_room", methods=["POST"])
def create_stego_room():
    if "user_id" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    name = request.form.get("name")
    encrypted_str = request.form.get("encrypted", "false")
    store_key_str = request.form.get("storeKey", "false")
    is_encrypted = encrypted_str.lower() in ["true", "1", "yes"]
    store_key = store_key_str.lower() in ["true", "1", "yes"]

    cover_image_file = request.files.get("image")
    message_file = request.files.get("message")
    if not cover_image_file or not message_file:
        return jsonify({"error": "Missing files"}), 400
        
    # Check file sizes against configured limits
    cover_image_file.seek(0, os.SEEK_END)
    cover_image_size = cover_image_file.tell()
    cover_image_file.seek(0)  # Reset file pointer
    
    if cover_image_size > app.config['MAX_COVER_IMAGE_SIZE']:
        return jsonify({
            'error': f'Cover image exceeds size limit of {app.config["MAX_COVER_IMAGE_SIZE"] // (1024 * 1024)}MB',
            'size': cover_image_size
        }), 413
        
    message_file.seek(0, os.SEEK_END)
    message_size = message_file.tell()
    message_file.seek(0)  # Reset file pointer
    
    if message_size > app.config['MAX_SECRET_MESSAGE_SIZE']:
        return jsonify({
            'error': f'Secret message exceeds size limit of {app.config["MAX_SECRET_MESSAGE_SIZE"] // (1024 * 1024)}MB',
            'size': message_size
        }), 413

    # Save files to disk
    cover_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(cover_image_file.filename))
    message_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(message_file.filename))
    stego_path = os.path.join(app.config['UPLOAD_FOLDER'], f"stego_{cover_image_file.filename}")

    cover_image_file.save(cover_path)
    message_file.save(message_path)

    try:
        # Embed the message using MultiLayerLSB
        stego_path, key, iv = MultiLayerLSB.embed_message(
            cover_path,
            stego_path,
            message_path,
            is_encrypted=is_encrypted
        )

        # Get the actual filename from the returned path (in case extension changed)
        stego_filename = os.path.basename(stego_path)
        print(f"DEBUG - Actual stego path: {stego_path}")
        print(f"DEBUG - Updated stego filename: {stego_filename}")
        
        # Check if stego image exceeds size limit
        stego_size = os.path.getsize(stego_path)
        if stego_size > app.config['MAX_STEGO_IMAGE_SIZE']:
            # Clean up the file to avoid wasting space
            os.remove(stego_path)
            return jsonify({
                'error': f'Generated stego image exceeds size limit of {app.config["MAX_STEGO_IMAGE_SIZE"] // (1024 * 1024)}MB',
                'size': stego_size
            }), 413

        with open(stego_path, 'rb') as f:
            stego_image_b64 = base64.b64encode(f.read()).decode('utf-8')

        metrics = {
            'psnr': MultiLayerLSB.calculate_psnr(cover_path, stego_path),
            'mse': MultiLayerLSB.calculate_mse(cover_path, stego_path),
            'ssim': MultiLayerLSB.calculate_ssim(cover_path, stego_path),
            'bpp': MultiLayerLSB.calculate_bpp(message_path, cover_path),
            'capacity': MultiLayerLSB.calculate_capacity(cover_path),
            'message_size': os.path.getsize(message_path)
        }

        user_id = session["user_id"]

        # Store just the filenames instead of full paths
        cover_filename = os.path.basename(cover_path)
        message_filename = os.path.basename(message_path)
        stego_filename = os.path.basename(stego_path)

        new_room = StegoRoom(
            name=name,
            is_encrypted=is_encrypted,
            key=key.hex() if key else None,
            iv=iv.hex() if iv else None,
            message_file=message_filename,
            cover_image=cover_filename,
            stego_image=stego_filename,
            metrics=str(metrics),
            user_id=user_id,
            is_key_stored=store_key
        )
        db.session.add(new_room)
        db.session.commit()

        return jsonify({
            "message": "Stego room created successfully!",
            "room": {
                "id": new_room.id,
                "name": new_room.name,
                "is_encrypted": new_room.is_encrypted,
                "key": new_room.key,
                "iv": new_room.iv,
                "cover_image": cover_filename,
                "stego_image": stego_image_b64,
                "stego_filename": stego_filename,
                "metrics": metrics,
                "user_id": new_room.user_id
            }
        }), 200
    except Exception as e:
            # Optionally log the error here
            return jsonify({'error': str(e)}), 500


@app.route('/api/stegorooms/<int:room_id>', methods=['GET'])
def get_stegoroom(room_id):
    # Fetch the StegoRoom entry from the database (404 if not found)
    room = StegoRoom.query.get_or_404(room_id)

    # Construct a detailed response dictionary.
    room_info = {
        "id": room.id,
        "name": room.name,
        "is_encrypted": room.is_encrypted,
        "message_file": room.message_file,
        "cover_image": room.cover_image,
        "stego_image": room.stego_image,
        "metrics": room.metrics,
        "user_id": room.user_id,
        "user": {
            "id": room.user.id,
            "email": room.user.email
        } if room.user else None
    }

    # Return both a human-readable text block and the JSON data.
    response_text = (
        f"StegoRoom (ID: {room.id})\n"
        f"Name: {room.name}\n"
        f"Encrypted: {'Yes' if room.is_encrypted else 'No'}\n"
        f"Message File: {room.message_file}\n"
        f"Cover Image: {room.cover_image}\n"
        f"Stego Image: {room.stego_image}\n"
        f"Metrics: {room.metrics}\n"
        f"Associated User ID: {room.user_id}\n"
        f"User Email: {room.user.email if room.user else 'N/A'}\n"
    )

    if room.is_key_stored:
        room_info['key'] = room.key
        room_info['iv'] = room.iv

    return jsonify({
        "text": response_text,
        "room": room_info
    })
    
# FOR TESTING FOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTING

@app.route('/api/mlsb/embed', methods=['POST'])
def embed_message():
    if 'cover_image' not in request.files or 'message_file' not in request.files:
        return jsonify({'error': 'Missing required files'}), 400

    cover_image = request.files['cover_image']
    message_file = request.files['message_file']
    is_encrypted = request.form.get('is_encrypted', 'true').lower() == 'true'

    if cover_image.filename == '' or message_file.filename == '':
        return jsonify({'error': 'No selected files'}), 400

    try:
        # Check file sizes against configured limits
        cover_image.seek(0, os.SEEK_END)
        cover_image_size = cover_image.tell()
        cover_image.seek(0)  # Reset file pointer
        
        if cover_image_size > app.config['MAX_COVER_IMAGE_SIZE']:
            return jsonify({
                'error': f'Cover image exceeds size limit of {app.config["MAX_COVER_IMAGE_SIZE"] // (1024 * 1024)}MB',
                'size': cover_image_size
            }), 413
            
        message_file.seek(0, os.SEEK_END)
        message_size = message_file.tell()
        message_file.seek(0)  # Reset file pointer
        
        if message_size > app.config['MAX_SECRET_MESSAGE_SIZE']:
            return jsonify({
                'error': f'Secret message exceeds size limit of {app.config["MAX_SECRET_MESSAGE_SIZE"] // (1024 * 1024)}MB',
                'size': message_size
            }), 413
        
        # Create filenames
        cover_filename = secure_filename(cover_image.filename)
        message_filename = secure_filename(message_file.filename)
        stego_filename = f'stego_{cover_filename}'
        
        # Create full paths
        cover_path = os.path.join(app.config['UPLOAD_FOLDER'], cover_filename)
        message_path = os.path.join(app.config['UPLOAD_FOLDER'], message_filename)
        stego_path = os.path.join(app.config['UPLOAD_FOLDER'], stego_filename)

        # Save files
        cover_image.save(cover_path)
        message_file.save(message_path)

        # Let the MultiLayerLSB class handle key and IV generation
        stego_path, key, iv = MultiLayerLSB.embed_message(
            cover_path, 
            stego_path, 
            message_path, 
            is_encrypted=is_encrypted
        )
        
        # Get the actual filename from the returned path (in case extension changed)
        stego_filename = os.path.basename(stego_path)
        print(f"DEBUG - Actual stego path: {stego_path}")
        print(f"DEBUG - Updated stego filename: {stego_filename}")
        
        # Check if stego image exceeds size limit
        stego_size = os.path.getsize(stego_path)
        if stego_size > app.config['MAX_STEGO_IMAGE_SIZE']:
            # Clean up the file to avoid wasting space
            os.remove(stego_path)
            return jsonify({
                'error': f'Generated stego image exceeds size limit of {app.config["MAX_STEGO_IMAGE_SIZE"] // (1024 * 1024)}MB',
                'size': stego_size
            }), 413

        # Read the stego image for base64 response
        with open(stego_path, 'rb') as f:
            stego_image = base64.b64encode(f.read()).decode('utf-8')

        # Calculate metrics
        message_size = os.path.getsize(message_path)
        metrics = {
            'psnr': MultiLayerLSB.calculate_psnr(cover_path, stego_path),
            'mse': MultiLayerLSB.calculate_mse(cover_path, stego_path),
            'ssim': MultiLayerLSB.calculate_ssim(cover_path, stego_path),
            'bpp': MultiLayerLSB.calculate_bpp(message_path, cover_path),
            'capacity': MultiLayerLSB.calculate_capacity(cover_path),
            'message_size': message_size
        }

        # Create web paths for frontend
        web_cover_path = f"uploads/{cover_filename}"
        web_message_path = f"uploads/{message_filename}"
        web_stego_path = f"uploads/{stego_filename}"

        # Save to database (with full paths)
        demo = MLSBDemo(
            cover_image=cover_path,
            message_file=message_path,
            stego_image=stego_path,
            is_encrypted=is_encrypted,
            metrics=str(metrics)
        )
        db.session.add(demo)
        db.session.commit()

        # Build response (with web paths)
        response = {
            'success': True,
            'stego_image': stego_image,  # Base64 encoded data
            'metrics': metrics,
            'stego_image_path': web_stego_path,  # Web path for downloading
            'cover_image_path': web_cover_path,  # Web path for comparing
            'message_file_path': web_message_path  # Web path for downloading
        }

        if is_encrypted:
            response['key'] = key.hex()
            response['iv'] = iv.hex()

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mlsb/extract', methods=['POST'])
def extract_message():
    if 'stego_image' not in request.files:
        return jsonify({'error': 'Missing stego image'}), 400

    stego_image = request.files['stego_image']
    is_encrypted = request.form.get('is_encrypted', 'true').lower() == 'true'
    key = request.form.get('key', '')
    iv = request.form.get('iv', '')

    if stego_image.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if is_encrypted and (not key or not iv):
        return jsonify({'error': 'Encryption key and IV are required when encryption is enabled'}), 400
        
    # Check stego image size
    stego_image.seek(0, os.SEEK_END)
    stego_size = stego_image.tell()
    stego_image.seek(0)  # Reset file pointer
    
    if stego_size > app.config['MAX_STEGO_IMAGE_SIZE']:
        return jsonify({
            'error': f'Stego image exceeds size limit of {app.config["MAX_STEGO_IMAGE_SIZE"] // (1024 * 1024)}MB',
            'size': stego_size
        }), 413

    try:
        stego_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(stego_image.filename))
        stego_image.save(stego_path)
        
        # Check if this is a JPEG image for better error messages
        is_jpeg = stego_path.lower().endswith(('.jpg', '.jpeg'))

        media_type = MultiLayerLSB.get_media_type(stego_path)
        extension_map = {
            'text': '.txt',
            'image': '.png',
            'audio': '.mp3'
        }
        ext = extension_map.get(media_type, '.bin')
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], f"extracted_message{ext}")

        key_bytes = bytes.fromhex(key) if is_encrypted else None
        iv_bytes = bytes.fromhex(iv) if is_encrypted else None

        message, media_type = MultiLayerLSB.extract_message(
            stego_path, 
            output_path=output_path, 
            is_encrypted=is_encrypted, 
            key=key_bytes, 
            iv=iv_bytes
        )

        response = {
            'success': True,
            'output_path': output_path,
            'media_type': media_type,
            'output_url': f'/uploads/{os.path.basename(output_path)}'
        }
        if media_type == 'text':
            try:
                if isinstance(message, bytes):
                    message = message.decode('utf-8')
                elif not isinstance(message, str):
                    message = str(message)
                response['message'] = message
            except Exception as e:
                print(f"Error decoding text message: {str(e)}")
                response['message'] = ''
        return jsonify(response)

    except ValueError as ve:
        error_msg = str(ve)
        print(f"Extraction error: {error_msg}")
        
        # Provide a more user-friendly message for JPEG-related issues
        if "Unsupported message type" in error_msg and stego_path.lower().endswith(('.jpg', '.jpeg')):
            return jsonify({
                'error': "Failed to extract message from JPEG image. JPEG compression may have corrupted the hidden data. Consider using PNG for better results.",
                'jpeg_warning': True
            }), 400
        elif "Termination sequence not found" in error_msg and stego_path.lower().endswith(('.jpg', '.jpeg')):
            return jsonify({
                'error': "Failed to decrypt message from JPEG image. JPEG compression likely corrupted the hidden data. Please try using a PNG format instead.",
                'jpeg_warning': True
            }), 400
        else:
            return jsonify({'error': error_msg}), 400
            
    except Exception as e:
        print(f"Extraction error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/mlsb/capacity', methods=['POST'])
def calculate_capacity():
    if 'image' not in request.files:
        return jsonify({'error': 'Missing image file'}), 400

    image = request.files['image']
    rounds = int(request.form.get('rounds', 1))

    if image.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(image.filename))
        image.save(image_path)

        mlsb = MultiLayerLSB(image_path, None)
        capacity = mlsb.calculate_capacity(image_path, rounds)

        return jsonify({
            'success': True,
            'capacity': capacity
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/mlsb/download', methods=['GET'])
def download_file():
    file_path = request.args.get('path')
    if not file_path:
        return jsonify({'error': 'No file path provided'}), 400
    
    try:
        # Handle different path formats
        if not os.path.isabs(file_path):
            # If not absolute, assume it's relative to UPLOAD_FOLDER
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(file_path))
        
        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({'error': f'File not found: {file_path}'}), 404
            
        return send_file(file_path, as_attachment=True)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
# FOR TESTING FOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTING

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists.'}), 409
    new_user = User(email=email, password=password)
    db.session.add(new_user)
    db.session.commit()
    
    # Set up session after successful signup
    session['user_id'] = new_user.id
    return jsonify({
        'message': 'User created successfully.',
        'user_id': new_user.id
    }), 201

@app.after_request
def add_cors_headers(response):
    if request.headers.get('Origin') == 'http://localhost:3000':
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:3000'
    else:
        response.headers['Access-Control-Allow-Origin'] = 'https://stegx.lanticse.me'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        return jsonify({"error": f"Error serving file: {str(e)}"}), 500

@app.route('/api/steg_rooms/<int:id>', methods=['DELETE'])
def delete_room(id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    # Query the room by ID and ensure it belongs to the current user
    room = StegoRoom.query.filter_by(id=id, user_id=session['user_id']).first()
    if not room:
        return jsonify({"error": "Room not found or unauthorized"}), 404

    try:
        # Delete the room from the database
        db.session.delete(room)
        db.session.commit()
        return jsonify({"message": "Room deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
from flask import send_from_directory

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    if path.startswith('api') or path.startswith('uploads') or path.startswith('static'):
        abort(404)
    return send_from_directory('build', 'index.html')

if __name__ == '__main__':     
    with app.app_context():
            db.create_all() 

            if not User.query.first():
                sample_user = User(email="test@example.com", password="testpass")
                db.session.add(sample_user)
                db.session.commit()
                
                room1 = StegoRoom(
                    name="Room One",
                    is_encrypted=False,
                    message_file="This is a sample message",
                    user_id=sample_user.id
                )
                room2 = StegoRoom(
                    name="Room Two",
                    is_encrypted=True,
                    message_file="This is an encrypted message",
                    user_id=sample_user.id
                )
                db.session.add_all([room1, room2])
                db.session.commit()
                print("Sample user and stego rooms added.")
            
    app.run(debug=True)