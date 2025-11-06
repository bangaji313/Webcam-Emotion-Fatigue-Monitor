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

# --- Impor Baru untuk Analisis Gambar ---
import cv2
import numpy as np
import base64
import io
from PIL import Image
from deepface import DeepFace

# --- Penambahan untuk Classifier Mata ---
# Mencari path tempat data OpenCV disimpan
cv2_base_dir = os.path.dirname(os.path.abspath(cv2.__file__))
haar_model_path = os.path.join(cv2_base_dir, 'data', 'haarcascade_eye.xml')

if not os.path.exists(haar_model_path):
    print(f"Error: Tidak dapat menemukan 'haarcascade_eye.xml' di {haar_model_path}")
    # Di beberapa sistem, path-nya mungkin 'haarcascade_eye_tree_eyeglasses.xml'
    # Jika error, kita bisa ganti nama file di atas.
    sys.exit("Gagal memuat model Haar Cascade Mata. Cek instalasi OpenCV.")

# Muat classifier mata
eye_cascade = cv2.CascadeClassifier(haar_model_path)

# 2. Muat variabel lingkungan dari file .env
load_dotenv()

# 3. Inisialisasi Aplikasi Flask
app = Flask(__name__)

# 4. Konfigurasi Aplikasi
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True

# 5. Inisialisasi Ekstensi dengan Aplikasi Flask
# Ini adalah cara untuk "mengikat" ekstensi ke 'app'
db.init_app(app)
bcrypt.init_app(app)
server_session.init_app(app)

# 6. Impor Model Database
# Impor ini sekarang aman karena 'models.py' tidak lagi mengimpor 'app.py'
from models import User, DetectionLog

# 7. Route Uji Coba Awal
@app.route('/test-db')
def test_db():
    """Route untuk menguji koneksi database."""
    try:
        # Gunakan 'db.session.execute' dengan string SQL
        db.session.execute(db.text('SELECT 1'))
        return "<h1>Koneksi Database Berhasil!</h1>"
    except Exception as e:
        return f"<h1>Koneksi Database Gagal:</h1><p>{e}</p>"

@app.route('/')
def index():
    """Halaman utama, akan mengarahkan ke login jika belum login."""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    """Menangani pendaftaran pengguna baru."""
    if request.method == 'POST':
        # 1. Ambil data dari form
        nrp = request.form.get('nrp')
        nama = request.form.get('nama')
        password = request.form.get('password')

        if not nrp or not nama or not password:
            flash('Semua field wajib diisi!', 'danger')
            return redirect(url_for('register'))

        # 2. Cek apakah NRP sudah ada
        existing_user = User.query.filter_by(nrp=nrp).first()
        if existing_user:
            flash('NRP sudah terdaftar. Silakan gunakan NRP lain.', 'warning')
            return redirect(url_for('register'))

        # 3. Hash password
        # 'decode('utf-8')' penting untuk menyimpan hash sebagai string
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        # 4. Buat user baru dan simpan ke database
        # Kita akan buat admin manual, jadi role default selalu 'user'
        new_user = User(nrp=nrp, nama=nama, password_hash=hashed_password, role='user')
        db.session.add(new_user)
        db.session.commit()

        flash('Registrasi berhasil! Silakan login.', 'success')
        return redirect(url_for('login'))

    # 5. Jika metodenya GET, tampilkan halaman register
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Menangani proses login pengguna."""
    if request.method == 'POST':
        # 1. Ambil data dari form
        nrp = request.form.get('nrp')
        password = request.form.get('password')

        if not nrp or not password:
            flash('NRP dan Password wajib diisi!', 'danger')
            return redirect(url_for('login'))

        # 2. Cari user berdasarkan NRP
        user = User.query.filter_by(nrp=nrp).first()

        # 3. Verifikasi user dan password
        # 'bcrypt.check_password_hash' membandingkan password form dengan hash di DB
        if user and bcrypt.check_password_hash(user.password_hash, password):
            # 4. Jika berhasil, simpan ID dan role ke dalam session
            session['user_id'] = user.id
            session['role'] = user.role
            session['nama'] = user.nama # Menyimpan nama untuk ditampilkan
            
            flash(f'Selamat datang kembali, {user.nama}!', 'success')
            return redirect(url_for('dashboard'))
        else:
            # 5. Jika gagal, beri pesan error
            flash('Login Gagal. NRP atau Password salah.', 'danger')
            return redirect(url_for('login'))

    # 6. Jika metodenya GET, tampilkan halaman login
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Menghapus sesi pengguna (logout)."""
    session.clear() # Menghapus semua data dari session
    flash('Anda telah berhasil logout.', 'info')
    return redirect(url_for('login'))

# --- DEKORATOR UNTUK OTENTIKASI ---
def require_login(f):
    """
    Dekorator untuk memastikan pengguna sudah login sebelum mengakses route.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Anda harus login untuk mengakses halaman ini.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def convert_base64_to_image(base64_string):
    """
    Mengubah string base64 (dari format data URL JavaScript) menjadi 
    gambar format array NumPy yang bisa dibaca OpenCV.
    """
    # Hapus header data URL (cth: "data:image/jpeg;base64,")
    if "," in base64_string:
        base64_string = base64_string.split(',')[1]
        
    try:
        # Decode base64 menjadi bytes
        img_bytes = base64.b64decode(base64_string)
        
        # Buat stream dari bytes
        img_io = io.BytesIO(img_bytes)
        
        # Buka gambar menggunakan PIL (membantu menangani format)
        pil_image = Image.open(img_io)
        
        # Ubah ke array NumPy (format yang disukai OpenCV)
        # Pastikan dikonversi ke RGB
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
            detector_backend='opencv' # 'opencv' adalah yang tercepat
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
    

def analyze_fatigue(image_np):
    """
    Menganalisis kelelahan berdasarkan deteksi mata tertutup.
    Menggunakan Haar Cascade dari OpenCV.
    
    Mengembalikan skor:
    0.0 = Terdeteksi Mata (Bangun)
    1.0 = Tidak Terdeteksi Mata (Lelah/Terpejam)
    """
    try:
        # 1. Konversi ke Grayscale (wajib untuk Haar Cascades)
        gray_image = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        
        # 2. Lakukan deteksi mata
        # minSize adalah ukuran minimum mata yg dideteksi (30x30 pixel)
        eyes = eye_cascade.detectMultiScale(
            gray_image, 
            scaleFactor=1.1, 
            minNeighbors=10, 
            minSize=(40, 40)
        )
        
        # 3. Beri skor
        if len(eyes) > 0:
            # Jika 'eyes' (array) tidak kosong, berarti mata terdeteksi
            return 0.0 # Skor 0.0 = Bangun
        else:
            # Jika 'eyes' kosong (tidak ada mata terdeteksi)
            return 1.0 # Skor 1.0 = Lelah
            
    except Exception as e:
        # print(f"Error saat deteksi mata: {e}")
        # Jika ada error, asumsikan 'bangun' agar aman
        return 0.0

@app.route('/dashboard')
@require_login # Menerapkan 'penjaga' kita
def dashboard():
    """Halaman dashboard utama setelah login."""
    # Kita akan mengisi ini nanti
    return render_template('dashboard.html', user_nama=session.get('nama'))

# =================================================================
#                         API ENDPOINTS
# =================================================================

@app.route('/api/analyze_frame', methods=['POST'])
@require_login # Hanya user yang sudah login yang bisa mengakses ini
def api_analyze_frame():
    """
    Menerima frame gambar dari frontend, menganalisis emosi & kelelahan,
    menyimpan ke log, dan mengembalikan hasil.
    """
    try:
        # 1. Ambil data gambar base64 dari JSON yang dikirim
        data = request.get_json()
        if 'image_data' not in data:
            return jsonify({"error": "Data gambar tidak ditemukan"}), 400

        image_data_base64 = data['image_data']

        # 2. Konversi base64 menjadi gambar NumPy
        image_np = convert_base64_to_image(image_data_base64)
        if image_np is None:
            return jsonify({"error": "Format gambar tidak valid"}), 400

        # 3. Analisis Gambar (Menggunakan fungsi Tahap 4)
        # --- Analisis Emosi ---
        emotion = analyze_emotion(image_np)
        
        # --- Analisis Kelelahan ---
        fatigue_score = 0.0 # Default 'bangun'
        
        # Hanya cek kelelahan JIKA wajah terdeteksi
        # Ini penting untuk efisiensi
        if emotion != "no_face_detected" and emotion != "unknown":
            fatigue_score = analyze_fatigue(image_np)
        else:
            # Jika tidak ada wajah, kita tidak bisa menentukan kelelahan
            fatigue_score = -1.0 # Kita beri kode -1 (artinya 'N/A')

        # 4. Simpan hasil ke Database
        # Hanya simpan jika ada wajah terdeteksi
        if emotion != "no_face_detected" and emotion != "unknown":
            current_user_id = session['user_id']
            
            new_log = DetectionLog(
                user_id=current_user_id,
                emotion=emotion,
                fatigue_score=fatigue_score
            )
            db.session.add(new_log)
            db.session.commit()

        # 5. Kembalikan hasil sebagai JSON
        return jsonify({
            "success": True,
            "emotion": emotion,
            "fatigue_score": fatigue_score # 0.0 (bangun), 1.0 (lelah), -1.0 (N/A)
        }), 200

    except Exception as e:
        # Tangani error umum
        print(f"Server Error di /api/analyze_frame: {e}")
        return jsonify({"error": "Terjadi kesalahan di server", "details": str(e)}), 500

@app.route('/api/logs', methods=['GET'])
@require_login
def api_get_logs():
    """
    Mengambil data log untuk ditampilkan di grafik.
    Menerapkan RBAC:
    - 'user' hanya melihat log miliknya.
    - 'admin' melihat semua log (kita akan implementasi ini nanti).
    """
    try:
        user_id = session['user_id']
        user_role = session['role']

        # Logika RBAC
        if user_role == 'admin':
            print("Mengambil log sebagai ADMIN") # Pesan debug
            logs = DetectionLog.query.order_by(DetectionLog.timestamp.asc()).all()
        else:
            print("Mengambil log sebagai USER") # Pesan debug
            logs = DetectionLog.query.filter_by(user_id=user_id).order_by(DetectionLog.timestamp.asc()).all()
            
        # Ubah data log menjadi format yang bisa dibaca JSON
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
    """
    Membuat dan mengirimkan file CSV dari data log pengguna.
    Menerapkan RBAC:
    - 'user' hanya mengunduh log miliknya.
    - 'admin' mengunduh SEMUA log.
    """
    try:
        user_id = session['user_id']
        user_role = session['role']

        # 1. Ambil data log sesuai RBAC (logika yang sama dengan /api/logs)
        if user_role == 'admin':
            # Admin: Ambil SEMUA log
            # Kita juga butuh info 'user' (NRP, Nama) untuk admin
            logs = db.session.query(DetectionLog, User).join(User, DetectionLog.user_id == User.id).order_by(DetectionLog.timestamp.asc()).all()
            
            # Tentukan header CSV untuk Admin
            csv_header = ['log_id', 'timestamp', 'user_id', 'user_nrp', 'user_nama', 'emotion', 'fatigue_score']
            
        else:
            # User: Ambil log milik sendiri
            logs = DetectionLog.query.filter_by(user_id=user_id).order_by(DetectionLog.timestamp.asc()).all()
            
            # Tentukan header CSV untuk User
            csv_header = ['log_id', 'timestamp', 'emotion', 'fatigue_score']

        # 2. Buat file CSV dalam memori
        si = io.StringIO()
        writer = csv.writer(si)
        
        # Tulis header
        writer.writerow(csv_header)
        
        # 3. Tulis data log
        if user_role == 'admin':
            for log, user in logs:
                writer.writerow([
                    log.id,
                    log.timestamp.isoformat(),
                    log.user_id,
                    user.nrp,
                    user.nama,
                    log.emotion,
                    log.fatigue_score
                ])
        else:
            for log in logs:
                writer.writerow([
                    log.id,
                    log.timestamp.isoformat(),
                    log.emotion,
                    log.fatigue_score
                ])

        # 4. Siapkan file untuk di-download
        output = make_response(si.getvalue())
        output.headers["Content-Disposition"] = "attachment; filename=detection_log.csv"
        output.headers["Content-type"] = "text/csv"
        
        si.close() # Tutup buffer memori
        return output

    except Exception as e:
        print(f"Server Error di /api/download_csv: {e}")
        flash('Gagal membuat file CSV.', 'danger')
        return redirect(url_for('dashboard'))

# 8. Menjalankan Aplikasi
if __name__ == '__main__':
    # 'debug=True' akan otomatis me-restart server setiap ada perubahan kode
    app.run(debug=True)