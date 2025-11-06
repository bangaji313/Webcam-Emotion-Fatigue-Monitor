# 🎓 Sistem Deteksi Emosi dan Kelelahan Berbasis Webcam (Webcam Emotion & Fatigue Monitor)

**Pengembangan Sistem Deteksi Emosi dan Kelelahan Berbasis Webcam Menggunakan Computer Vision sebagai Implementasi Consumer Health Informatics**

Proyek ini adalah sistem aplikasi web *full-stack* yang dibangun untuk mendeteksi ekspresi emosi dan tingkat kelelahan pengguna secara *real-time* melalui *webcam*. Sistem ini berfungsi sebagai implementasi praktis dari **Consumer Health Informatics (CHI)**, yang berfokus pada pemantauan kesehatan pribadi.

Sistem ini dilengkapi dengan antarmuka *dashboard* yang interaktif, otentikasi pengguna yang aman dengan *Role-Based Access Control* (RBAC), dan penyimpanan log historis ke *database* PostgreSQL.

Proyek ini dikembangkan sebagai bagian dari mata kuliah **IFB-499 Informatika Terapan** di Institut Teknologi Nasional Bandung.

---

## ✨ Fitur Utama (Features)

* **Deteksi Emosi Real-Time:** Menggunakan `DeepFace` untuk menganalisis *stream* video dan mengklasifikasikan emosi dominan (misal: 'happy', 'sad', 'neutral').
* **Deteksi Kelelahan:** Menggunakan *classifier* Haar Cascade `OpenCV` untuk mendeteksi mata terpejam sebagai indikator kelelahan (skor 0.0 untuk bangun, 1.0 untuk lelah).
* **Autentikasi Aman:** Sistem *login* dan *register* penuh menggunakan **Flask-Session** dan **Flask-Bcrypt** (password di-*hash*).
* **Role-Based Access Control (RBAC):**
    * **User:** Hanya dapat melihat dan mengunduh *log* deteksi miliknya sendiri.
    * **Admin:** Dapat melihat dan mengunduh *log* deteksi dari *seluruh* pengguna.
* **Dashboard Interaktif:** Menampilkan *feed* *webcam*, status deteksi *real-time*, dan grafik historis menggunakan **Chart.js**.
* **Penyimpanan Log:** Setiap deteksi yang valid (wajah ditemukan) disimpan ke *database* **PostgreSQL** dengan *timestamp*.
* **Ekspor Data:** Pengguna (dan admin) dapat mengunduh *dataset* *log* mereka dalam format **CSV**.

---

## 🛠️ Stack Teknologi (Tech Stack)

Arsitektur sistem ini menggunakan teknologi berikut:

* **Backend:**
    * [Python 3.10+](https://www.python.org/)
    * [Flask](https://flask.palletsprojects.com/) (Web Framework utama)
    * [SQLAlchemy](https://www.sqlalchemy.org/) (ORM untuk interaksi Database)
    * [Flask-Session](https://flask-session.readthedocs.io/) (Manajemen sesi sisi server)
    * [Flask-Bcrypt](https://flask-bcrypt.readthedocs.io/) (Hashing password)
* **Database:**
    * [PostgreSQL](https://www.postgresql.org/) (Penyimpanan data relasional)
    * `psycopg2-binary` (Driver koneksi Python-Postgres)
* **Computer Vision & ML:**
    * [OpenCV](https://opencv.org/) (Pengambilan frame & deteksi mata)
    * [DeepFace](https://github.com/serengil/deepface) (Analisis emosi)
    * [TensorFlow](https://www.tensorflow.org/) (Backend untuk DeepFace)
* **Frontend:**
    * HTML5 & CSS3
    * [Bootstrap 5](https://getbootstrap.com/) (Styling UI modern)
    * [JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) (Interaktivitas sisi klien)
    * [Chart.js](https://www.chartjs.org/) (Visualisasi grafik)

---

## 🗂️ Struktur Proyek
```
webcam_emotion_fatigue/
│
├── app.py                # File utama Flask (Routes, API, Logic)
├── models.py             # Definisi model SQLAlchemy (User, DetectionLog)
├── extensions.py         # Inisialisasi ekstensi (db, bcrypt)
├── .env                  # File konfigurasi (Kunci API, Database URL)
├── .gitignore            # File untuk mengabaikan file tertentu (env, pycache)
│
├── database/
│   └── init.sql          # Kueri SQL untuk inisialisasi tabel
│
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── dashboard.js  # Logika frontend (Webcam, Chart.js, Fetch API)
│   └── img/
│
├── templates/
│   ├── login.html        # Halaman Login
│   ├── register.html     # Halaman Registrasi
│   └── dashboard.html    # Halaman Dashboard Utama
│
├── requirements.txt      # Daftar dependensi Python
└── README.md             # Dokumentasi proyek
```
---

## 🚀 Cara Instalasi & Menjalankan

Ikuti langkah-langkah ini untuk menjalankan proyek secara lokal.

### 1. Prasyarat

* [Anaconda (atau Miniconda)](https://www.anaconda.com/download)
* [PostgreSQL](https://www.postgresql.org/download/) (Database server)
* [Git](https://git-scm.com/downloads)

### 2. Setup Proyek

```bash
# 1. Clone repository ini
git clone [https://github.com/](https://github.com/)[username-anda]/Webcam-Emotion-Fatigue-Monitor.git
cd Webcam-Emotion-Fatigue-Monitor

# 2. Buat dan aktifkan environment Anaconda
conda create -n webcam_health python=3.10
conda activate webcam_health

# 3. Install semua dependensi
pip install -r requirements.txt
```
### 3. Setup Database
```bash
# 1. Buka pgAdmin 4 atau psql
# 2. Buat database baru bernama 'webcam_health_db'

# 3. Eksekusi skrip inisialisasi tabel
# Buka Query Tool untuk 'webcam_health_db' dan jalankan isi dari:
database/init.sql
```

### 4. Setup Lingkungan (.env)
Buat file .env di direktori root proyek. Ganti nilai placeholder sesuai dengan konfigurasi Anda.
```bash
# Ganti dengan kredensial PostgreSQL Anda
DATABASE_URL="postgresql://postgres:password_anda@localhost:5432/webcam_health_db"

# Buat kunci rahasia acak (untuk keamanan session)
SECRET_KEY="ganti-dengan-string-acak-yang-sangat-panjang"
```

### 5. Menjalankan Server
```bash
# Pastikan Anda berada di environment 'webcam_health'
# Pastikan Anda berada di direktori root proyek

python app.py
```