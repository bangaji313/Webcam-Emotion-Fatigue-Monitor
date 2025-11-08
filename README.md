# 🎓 Sistem Analisis Kesehatan Ganda (Dual Health Analysis System)

**Pengembangan Sistem Deteksi Emosi/Kelelahan (CHI) dan Prediktor Risiko Penyakit Jantung (CDSS) sebagai Implementasi Informatika Kesehatan Terapan**

Proyek ini adalah aplikasi web *full-stack* yang mengintegrasikan **dua sistem Machine Learning** untuk memenuhi kebutuhan *Consumer Health Informatics (CHI)* dan *Clinical Decision Support Systems (CDSS)*.

1.  **Sistem CHI:** Monitor Emosi & Kelelahan berbasis *webcam* (menggunakan `DeepFace` dan `OpenCV`).
2.  **Sistem CDSS:** Prediktor Risiko Penyakit Jantung (menggunakan `Scikit-learn` yang dilatih pada *dataset* UCI).

Aplikasi ini dibangun di atas tumpukan **Flask (Python)**, **PostgreSQL**, dan **Bootstrap 5**, serta mengimplementasikan **Role-Based Access Control (RBAC)** untuk keamanan data.

Proyek ini dikembangkan sebagai bagian dari mata kuliah **IFB-499 Informatika Terapan** di Institut Teknologi Nasional Bandung.

---

## ✨ Fitur Utama (Features)

* **Sistem Ganda:** Navigasi *multi-halaman* (`layout.html`) yang memungkinkan pengguna beralih antara "Monitor Webcam" dan "Prediktor Jantung".
* **Autentikasi Aman:** Sistem *login* dan *register* penuh menggunakan `Flask-Session` dan `Flask-Bcrypt` (password di-*hash*).
* **Role-Based Access Control (RBAC):**
    * **User:** Hanya dapat melihat dan mengunduh *log* deteksi miliknya sendiri.
    * **Admin:** Dapat melihat dan mengunduh *log* deteksi (webcam) dan *log* prediksi (jantung) dari *seluruh* pengguna.
* **Penyimpanan Log:** Setiap hasil analisis (webcam) dan prediksi (jantung) disimpan ke *database* `PostgreSQL` dalam tabel terpisah (`detection_log` & `heart_prediction_log`).

### 1. Sistem Monitor Emosi & Kelelahan (CHI)
* **Deteksi Real-Time:** Menggunakan `DeepFace` (dengan backend `retinaface`) untuk analisis emosi dan `OpenCV` (Haar Cascade) untuk deteksi kelelahan sederhana (mata terpejam).
* **Visualisasi Dinamis:** Grafik `Chart.js` *real-time* yang memetakan skor kelelahan dari waktu ke waktu.
* **Ekspor Data:** Pengguna dapat mengunduh riwayat log webcam mereka sebagai `CSV`.

### 2. Sistem Prediktor Risiko Jantung (CDSS)
* **Model `sklearn` Kustom:** Model *Logistic Regression* yang dilatih (di `train_heart_model.ipynb`) pada *dataset* [**Heart Disease Cleveland UCI**](https://www.kaggle.com/datasets/ritwikb3/heart-disease-cleveland), mencapai **AUC 0.96**.
* **Formulir Input (13 Fitur):** Antarmuka web yang mudah digunakan bagi pasien/dokter untuk memasukkan data (Usia, Kolesterol, Tekanan Darah, dll.).
* **Preprocessing Otomatis:** *Backend* Flask secara otomatis melakukan *One-Hot Encoding* dan *Standard Scaling* (`StandardScaler`) pada data input agar sesuai dengan data *training*.
* **Hasil Analisis Interaktif:** Menampilkan hasil (`Risiko Tinggi` / `Risiko Rendah`) beserta probabilitasnya (misal: 98.11%) menggunakan **Gauge Chart** (`Chart.js`) yang intuitif.

---

## 🛠️ Stack Teknologi (Tech Stack)

* **Backend:** Python 3.10+, Flask, SQLAlchemy, Flask-Session, Flask-Bcrypt
* **Database:** PostgreSQL
* **ML (Webcam):** DeepFace, OpenCV
* **ML (Jantung):** Scikit-learn, Pandas, Joblib
* **Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5, Chart.js
* **Training:** Jupyter Notebook, Matplotlib

---

## 🗂️ Struktur Proyek (v2.0)

Struktur ini mencerminkan *branch* `v2.0-dual-system-release`.
```
webcam_emotion_fatigue/
│
├── app.py                        # File utama Flask (Routes, 2x API ML, RBAC)
├── models.py                     # Model SQLAlchemy (User, DetectionLog, HeartPredictionLog)
├── extensions.py                 # Inisialisasi ekstensi (db, bcrypt)
│
├── train_heart_model.ipynb       # [BARU] Notebook training model jantung (sklearn)
├── heart_model.pkl               # [BARU] File model jantung (sklearn)
├── heart_scaler.pkl              # [BARU] File scaler (sklearn)
├── heart_columns.json            # [BARU] File daftar kolom (JSON)
│
├── Heart_disease_cleveland_new.csv # Dataset (diabaikan oleh .gitignore)
│
├── database/
│   └── init.sql                  # Kueri SQL (3 tabel)
│
├── static/
│   ├── css/
│   │   └── style.css             # File CSS utama
│   │
│   └── js/
│       ├── dashboard.js          # JS untuk deteksi webcam
│       └── heart_predictor.js    # [BARU] JS untuk form prediksi jantung
│
├── templates/
│   ├── layout.html               # [BARU] Template induk (Navbar, struktur dasar)
│   ├── dashboard.html            # (Anak) Halaman deteksi webcam
│   ├── heart_predictor.html      # [BARU] (Anak) Halaman form prediksi jantung
│   ├── admin_heart_logs.html     # [BARU] (Anak) Halaman admin untuk log jantung
│   ├── login.html                # Halaman login pengguna
│   └── register.html             # Halaman registrasi pengguna
│
├── requirements.txt              # Daftar dependensi Python (versi stabil)
├── requirements_stable.txt       # File master dependensi stabil
└── README.md                     # Dokumentasi proyek ini
```

---

## 🚀 Cara Instalasi & Menjalankan

### 1. Prasyarat

* [Anaconda (atau Miniconda)](https://www.anaconda.com/download)
* [PostgreSQL](https://www.postgresql.org/download/)
* [Git](https://git-scm.com/downloads)

### 2. Setup Lingkungan

# 1. Clone repository dan pindah ke branch ini
git clone [https://github.com/bangaji313/Webcam-Emotion-Fatigue-Monitor.git](https://github.com/bangaji313/Webcam-Emotion-Fatigue-Monitor.git)
cd Webcam-Emotion-Fatigue-Monitor
git switch v2.0-dual-system-release

# 2. Buat dan aktifkan environment Conda (gunakan env stabil)
# (Disarankan 'webcam_health_stable' jika Anda mengikutinya)
conda activate webcam_health_stable

# 3. Install semua dependensi
# (File requirements.txt di branch ini sudah stabil)
pip install -r requirements.txt

### 3. Setup Database

```bash
# 1. Buka pgAdmin 4
# 2. Buat database baru bernama 'webcam_health_db'
# 3. Eksekusi skrip SQL dari 'database/init.sql' (pastikan 3 tabel dibuat)
```

### 4. Setup Lingkungan (.env)

```bash
# Ganti dengan kredensial PostgreSQL Anda
DATABASE_URL="postgresql://postgres:password_anda@localhost:5432/webcam_health_db"
SECRET_KEY="ganti-dengan-kunci-rahasIA-acak"
```

### 5. (Opsional) Melatih Ulang Model Jantung
File .pkl dan .json sudah tersedia di repository. Namun, jika Anda ingin melatih ulang:
1. Unduh dataset `Heart_disease_cleveland_new.csv` ke root folder.
2. Buka dan jalankan semua cell di `train_heart_model.ipynb`.

### 6. Menjalankan Server

```bash
# Pastikan env 'webcam_health_stable' aktif
python app.py
```
