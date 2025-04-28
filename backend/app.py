from flask import Flask, jsonify, request, session, abort, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_cors import CORS
import base64

import os
import base64
from werkzeug.utils import secure_filename
import sys
sys.path.append('..')
from mlsb_algo_api.MultiLayerLSB import MultiLayerLSB

app = Flask(__name__)
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "http://localhost:3000"}})

app.config['SECRET_KEY'] = '123'    
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=True)
    password = db.Column(db.String(120), nullable=True)
    google_id = db.Column(db.String(120), nullable=True)
    stego_rooms = db.relationship('StegoRoom', backref='user', lazy=True)

class StegoRoom(db.Model):
    __tablename__ = 'stego_room'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=True)
    is_encrypted = db.Column(db.Boolean, default=False)
    key = db.Column(db.String(120), nullable=True)
    message = db.Column(db.Text, nullable=False)
    image = db.Column(db.Text, nullable=True)        
    stegoed_image = db.Column(db.Text, nullable=True)   
    metrics = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)



# FOR TESTING FOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTING
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

if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])


@app.route('/')
def index():
    return "Flask app with SQLite is set up!"

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
            "message": room.message,
            "image": room.image,
            "stegoed_image": room.stegoed_image,
            "metrics": room.metrics
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

    key = "dummy_key_value" if store_key else None

    message_file = request.files.get("message")
    if message_file:
        try:
            message_content = message_file.read().decode("utf-8", errors="ignore")
        except Exception as e:
            message_content = "Error reading message file."
    else:
        message_content = ""

    image_file = request.files.get("image")
    if image_file:
        image_bytes = image_file.read()
        image_data = base64.b64encode(image_bytes).decode("utf-8")
    else:
        image_data = None

    stegoed_image = None
    metrics = ""

    user_id = session["user_id"]

    new_room = StegoRoom(
        name=name,
        is_encrypted=is_encrypted,
        key=key,
        message=message_content,
        image=image_data,
        stegoed_image=stegoed_image,
        metrics=metrics,
        user_id=user_id
    )
    try:
        db.session.add(new_room)
        db.session.commit()
        return jsonify({
            "message": "Stego room created successfully!",
            "room": {
                "id": new_room.id,
                "name": new_room.name,
                "is_encrypted": new_room.is_encrypted,
                "key": new_room.key,
                "message": new_room.message,
                "image": new_room.image,
                "user_id": new_room.user_id
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Failed to create stego room."}), 500


# FOR TESTING FOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTING

@app.route('/api/mlsb/embed', methods=['POST'])
def embed_message():
    if 'cover_image' not in request.files or 'message_file' not in request.files:
        return jsonify({'error': 'Missing required files'}), 400

    cover_image = request.files['cover_image']
    message_file = request.files['message_file']
    is_encrypted = request.form.get('is_encrypted', 'false').lower() == 'true'
    rounds = int(request.form.get('rounds', 1))

    if cover_image.filename == '' or message_file.filename == '':
        return jsonify({'error': 'No selected files'}), 400

    try:
        cover_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(cover_image.filename))
        message_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(message_file.filename))
        stego_path = os.path.join(app.config['UPLOAD_FOLDER'], f'stego_{cover_image.filename}')

        cover_image.save(cover_path)
        message_file.save(message_path)

        mlsb = MultiLayerLSB(cover_path, stego_path)
        mlsb.embed_message(cover_path, stego_path, message_path, rounds=rounds, is_encrypted=is_encrypted)

        with open(stego_path, 'rb') as f:
            stego_image = base64.b64encode(f.read()).decode('utf-8')

        metrics = {
            'psnr': mlsb.calculate_psnr(cover_path, stego_path),
            'bpp': mlsb.calculate_bpp(message_path, cover_path, rounds),
            'capacity': mlsb.calculate_capacity(cover_path, rounds)
        }

        demo = MLSBDemo(
            cover_image=cover_path,
            message_file=message_path,
            stego_image=stego_path,
            is_encrypted=is_encrypted,
            rounds=rounds,
            metrics=str(metrics)
        )
        db.session.add(demo)
        db.session.commit()

        return jsonify({
            'success': True,
            'stego_image': stego_image,
            'metrics': metrics
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mlsb/extract', methods=['POST'])
def extract_message():
    if 'stego_image' not in request.files:
        return jsonify({'error': 'Missing stego image'}), 400

    stego_image = request.files['stego_image']
    is_encrypted = request.form.get('is_encrypted', 'false').lower() == 'true'
    rounds = int(request.form.get('rounds', 1))

    if stego_image.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        stego_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(stego_image.filename))
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], 'extracted_message.txt')

        stego_image.save(stego_path)

        mlsb = MultiLayerLSB(None, stego_path)
        message = mlsb.extract_message(stego_path, output_path=output_path, rounds=rounds, is_encrypted=is_encrypted)

        return jsonify({
            'success': True,
            'message': message.decode('utf-8') if isinstance(message, bytes) else message
        })

    except Exception as e:
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

# FOR TESTING FOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTINGFOR TESTING

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
                    message="This is a sample message",
                    user_id=sample_user.id
                )
                room2 = StegoRoom(
                    name="Room Two",
                    is_encrypted=True,
                    message="This is an encrypted message",
                    user_id=sample_user.id
                )
                db.session.add_all([room1, room2])
                db.session.commit()
                print("Sample user and stego rooms added.")
            
    app.run(debug=True)