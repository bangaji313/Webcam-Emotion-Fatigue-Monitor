import os
import sys
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, get_flashed_messages
from extensions import db, bcrypt, server_session
from models import User, DetectionLog
from dotenv import load_dotenv
from functools import wraps
import io 
import csv
from flask import make_response

# --- Impor Analisis Gambar ---
import cv2
import numpy as np
import base64
from PIL import Image
from deepface import DeepFace

# ==========================================================
# --- 1. MODIFIKASI: IMPOR LAYER DARI 'tensorflow.keras' ---
# ==========================================================
import tensorflow as tf
from keras.models import Sequential
from keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout
import contextlib

# Ukuran input HARUS sama dengan saat kita training
IMG_HEIGHT = 24
IMG_WIDTH = 24
# ----------------------------------------------------------

# --- Penambahan untuk Classifier Mata ---
cv2_base_dir = os.path.dirname(os.path.abspath(cv2.__file__))
haar_model_path = os.path.join(cv2_base_dir, 'data', 'haarcascade_eye.xml')
if not os.path.exists(haar_model_path):
    sys.exit("Gagal memuat model Haar Cascade Mata.")
eye_cascade = cv2.CascadeClassifier(haar_model_path)


# ==========================================================
# --- 2. FUNGSI UNTUK MEMBANGUN MODEL (ARSITEKTUR BENAR) ---
# ==========================================================
# Arsitektur 'RINGAN' (2x Conv, 1x Dense(64))
def create_eye_model():
    model = Sequential()
    model.add(Conv2D(32, (3, 3), activation='relu', input_shape=(IMG_HEIGHT, IMG_WIDTH, 1)))
    model.add(MaxPooling2D(pool_size=(2, 2)))
    model.add(Conv2D(64, (3, 3), activation='relu'))
    model.add(MaxPooling2D(pool_size=(2, 2)))
    model.add(Flatten())
    model.add(Dense(64, activation='relu')) 
    model.add(Dropout(0.5))
    model.add(Dense(1, activation='sigmoid'))
    return model

# ==========================================================
# --- 3. Muat Bobot dengan DUMMY CALL (SUDAH BENAR) ---
# ==========================================================
MODEL_WEIGHTS_PATH = 'eye_status_model.weights.h5'
if not os.path.exists(MODEL_WEIGHTS_PATH):
    sys.exit(f"Error: File bobot model '{MODEL_WEIGHTS_PATH}' tidak ditemukan.")

print("Membangun arsitektur model (versi ringan)...")
tf.get_logger().setLevel('ERROR') 
eye_model = create_eye_model()
print("Arsitektur model dibuat.")

print("Mem-build model graph (dummy call)...")
dummy_input = tf.zeros((1, IMG_HEIGHT, IMG_WIDTH, 1))
_ = eye_model(dummy_input) 
print("Model graph berhasil di-build.")

print(f"Memuat bobot model dari: {MODEL_WEIGHTS_PATH}...")
eye_model.load_weights(MODEL_WEIGHTS_PATH)
print("Bobot model berhasil dimuat.")
tf.get_logger().setLevel('INFO') 
# ----------------------------------------------------------

# (Sisa kode app.py Anda sama persis, tidak perlu diubah)

# Muat variabel lingkungan dari file .env
load_dotenv()
# Inisialisasi Aplikasi Flask
app = Flask(__name__)
# Konfigurasi Aplikasi
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
# Inisialisasi Ekstensi dengan Aplikasi Flask
db.init_app(app)
bcrypt.init_app(app)
server_session.init_app(app)
# Impor Model Database
from models import User, DetectionLog
# 7. Route Uji Coba Awal (Tidak Berubah)
@app.route('/test-db')
def test_db():
    try:
        db.session.execute(db.text('SELECT 1'))
        return "<h1>Koneksi Database Berhasil!</h1>"
    except Exception as e:
        return f"<h1>Koneksi Database Gagal:</h1><p>{e}</p>"
# --- Rute Autentikasi (Tidak Berubah) ---
@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        nrp = request.form.get('nrp')
        nama = request.form.get('nama')
        password = request.form.get('password')
        if not nrp or not nama or not password:
            flash('Semua field wajib diisi!', 'danger')
            return redirect(url_for('register'))
        existing_user = User.query.filter_by(nrp=nrp).first()
        if existing_user:
            flash('NRP sudah terdaftar. Silakan gunakan NRP lain.', 'warning')
            return redirect(url_for('register'))
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(nrp=nrp, nama=nama, password_hash=hashed_password, role='user')
        db.session.add(new_user)
        db.session.commit()
        flash('Registrasi berhasil! Silakan login.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html')
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        nrp = request.form.get('nrp')
        password = request.form.get('password')
        if not nrp or not password:
            flash('NRP dan Password wajib diisi!', 'danger')
            return redirect(url_for('login'))
        user = User.query.filter_by(nrp=nrp).first()
        if user and bcrypt.check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            session['role'] = user.role
            session['nama'] = user.nama
            flash(f'Selamat datang kembali, {user.nama}!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Login Gagal. NRP atau Password salah.', 'danger')
            return redirect(url_for('login'))
    return render_template('login.html')
@app.route('/logout')
def logout():
    session.clear()
    flash('Anda telah berhasil logout.', 'info')
    return redirect(url_for('login'))
def require_login(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Anda harus login untuk mengakses halaman ini.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function
# --- Fungsi Helper Analisis (analyze_emotion tidak berubah) ---
def convert_base64_to_image(base64_string):
    if "," in base64_string:
        base64_string = base64_string.split(',')[1]
    try:
        img_bytes = base64.b64decode(base64_string)
        img_io = io.BytesIO(img_bytes)
        pil_image = Image.open(img_io)
        open_cv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGBA2RGB)
        return open_cv_image
    except Exception as e:
        print(f"Error saat konversi base64: {e}")
        return None

def analyze_emotion(image_np):
    """
    Menganalisis gambar (array NumPy) menggunakan DeepFace 
    dan mengembalikan emosi yang dominan.
    """
    try:
        # DeepFace.analyze() bisa mendeteksi banyak atribut
        # kita hanya butuh emosi yang dominan
        # 'actions' berisi daftar analisis yg ingin dilakukan
        # 'enforce_detection=True' akan error jika tidak ada wajah
        analysis_result = DeepFace.analyze(
            img_path=image_np,
            actions=['emotion'],
            enforce_detection=True, 
            detector_backend='retinaface' # <-- DIUBAH DARI 'opencv' ke 'retinaface'
        )
        
        # Hasilnya adalah list, kita ambil elemen pertama (jika ada)
        if isinstance(analysis_result, list) and len(analysis_result) > 0:
            dominant_emotion = analysis_result[0]['dominant_emotion']
            return dominant_emotion
        else:
            return "unknown" # Jika format tidak terduga
            
    except Exception as e:
        # Ini akan error jika 'enforce_detection=True' dan tidak ada wajah terdeteksi
        # print(f"DeepFace Error (kemungkinan tidak ada wajah): {e}")
        return "no_face_detected"

# --- Fungsi analyze_fatigue (TETAP SAMA seperti versi CNN Anda) ---
def analyze_fatigue(image_np):
    try:
        gray_image = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        eyes = eye_cascade.detectMultiScale(
            gray_image, 
            scaleFactor=1.1, 
            minNeighbors=10, 
            minSize=(40, 40)
        )
        if len(eyes) == 0:
            return 1.0 
        predictions = []
        for (x, y, w, h) in eyes:
            eye_roi = gray_image[y:y+h, x:x+w]
            resized_eye = cv2.resize(eye_roi, (IMG_WIDTH, IMG_HEIGHT))
            normalized_eye = resized_eye / 255.0
            input_eye = np.expand_dims(np.expand_dims(normalized_eye, axis=-1), axis=0)
            pred = eye_model.predict(input_eye, verbose=0)[0][0]
            predictions.append(pred)
        return np.mean(predictions)
    except Exception as e:
        print(f"Error di analyze_fatigue (CNN): {e}")
        return 0.0
# --- Sisa API ENDPOINTS (Tidak Berubah) ---
@app.route('/dashboard')
@require_login
def dashboard():
    return render_template('dashboard.html', user_nama=session.get('nama'))
@app.route('/api/analyze_frame', methods=['POST'])
@require_login
def api_analyze_frame():
    try:
        data = request.get_json()
        if 'image_data' not in data:
            return jsonify({"error": "Data gambar tidak ditemukan"}), 400
        image_data_base64 = data['image_data']
        image_np = convert_base64_to_image(image_data_base64)
        if image_np is None:
            return jsonify({"error": "Format gambar tidak valid"}), 400
        emotion = analyze_emotion(image_np)
        fatigue_score = 0.0 
        if emotion != "no_face_detected" and emotion != "unknown":
            fatigue_score = analyze_fatigue(image_np) 
        else:
            fatigue_score = -1.0 
        if emotion != "no_face_detected" and emotion != "unknown":
            current_user_id = session['user_id']

            python_fatigue_score = float(fatigue_score)

            new_log = DetectionLog(
                user_id=current_user_id,
                emotion=emotion,
                fatigue_score=python_fatigue_score 
            )
            db.session.add(new_log)
            db.session.commit()
        return jsonify({
            "success": True,
            "emotion": emotion,
            "fatigue_score": fatigue_score
        }), 200
    except Exception as e:
        print(f"Server Error di /api/analyze_frame: {e}")
        return jsonify({"error": "Terjadi kesalahan di server", "details": str(e)}), 500
@app.route('/api/logs', methods=['GET'])
@require_login
def api_get_logs():
    try:
        user_id = session['user_id']
        user_role = session['role']
        if user_role == 'admin':
            print("Mengambil log sebagai ADMIN")
            logs = DetectionLog.query.order_by(DetectionLog.timestamp.asc()).all()
        else:
            print("Mengambil log sebagai USER")
            logs = DetectionLog.query.filter_by(user_id=user_id).order_by(DetectionLog.timestamp.asc()).all()
        log_data = []
        for log in logs:
            log_data.append({
                "timestamp": log.timestamp.isoformat(),
                "fatigue_score": log.fatigue_score,
                "emotion": log.emotion
            })
        return jsonify({
            "success": True,
            "logs": log_data,
            "role": user_role
        })
    except Exception as e:
        print(f"Server Error di /api/logs: {e}")
        return jsonify({"error": "Terjadi kesalahan di server", "details": str(e)}), 500
@app.route('/api/download_csv')
@require_login
def api_download_csv():
    try:
        user_id = session['user_id']
        user_role = session['role']
        if user_role == 'admin':
            logs = db.session.query(DetectionLog, User).join(User, DetectionLog.user_id == User.id).order_by(DetectionLog.timestamp.asc()).all()
            csv_header = ['log_id', 'timestamp', 'user_id', 'user_nrp', 'user_nama', 'emotion', 'fatigue_score']
        else:
            logs = DetectionLog.query.filter_by(user_id=user_id).order_by(DetectionLog.timestamp.asc()).all()
            csv_header = ['log_id', 'timestamp', 'emotion', 'fatigue_score']
        
        si = io.StringIO()
        writer = csv.writer(si)
        writer.writerow(csv_header)
        
        if user_role == 'admin':
            for log, user in logs:
                writer.writerow([
                    log.id, log.timestamp.isoformat(), log.user_id,
                    user.nrp, user.nama, log.emotion, log.fatigue_score
                ])
        else:
            for log in logs:
                writer.writerow([
                    log.id, log.timestamp.isoformat(), log.emotion, log.fatigue_score
                ])
        output = make_response(si.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=detection_log.csv"
        output.headers["Content-type"] = "text/csv"
        si.close()
        return output
    except Exception as e:
        print(f"Server Error di /api/download_csv: {e}")
        flash('Gagal membuat file CSV.', 'danger')
        return redirect(url_for('dashboard'))

# 8. Menjalankan Aplikasi
if __name__ == '__main__':
    app.run(debug=True)