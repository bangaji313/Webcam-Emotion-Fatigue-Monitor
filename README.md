# 🛑 PERHATIAN: INI ADALAH BRANCH EKSPERIMENTAL 🛑
> **Cabang (Branch) ini (`feature/cnn-fatigue-model`) berisi pekerjaan yang sedang dalam pengembangan (WIP) dan saat ini TIDAK BERFUNGSI.**
>
> * **Tujuan:** Meng-upgrade deteksi kelelahan dari Haar Cascade (metode dasar) ke model Convolutional Neural Network (CNN) kustom.
> * **Dataset:** [MRL Eye Dataset](https://www.kaggle.com/datasets/akashshingha850/mrl-eye-dataset) digunakan untuk melatih model.
> * **Proses:** Sebuah notebook (`train_eye_model.ipynb`) dibuat untuk melatih model CNN menggunakan Keras 3 pada dataset MRL.
> * **Status: DITUNDA (ON HOLD).** Proses implementasi model (`.h5` / `.weights.h5`) ke dalam aplikasi Flask mengalami kegagalan berulang akibat **konflik versi** yang parah antara Keras 3, TensorFlow (`tf.keras`), dan `deepface`.
>
> **Versi stabil dan fungsional dari proyek ini ada di *branch* `main`.**

---

# 🎓 Sistem Deteksi Emosi dan Kelelahan Berbasis Webcam (Webcam Emotion & Fatigue Monitor)

**Pengembangan Sistem Deteksi Emosi dan Kelelahan Berbasis Webcam Menggunakan Computer Vision sebagai Implementasi Consumer Health Informatics**

Proyek ini adalah sistem aplikasi web *full-stack* yang dibangun untuk mendeteksi ekspresi emosi dan tingkat kelelahan pengguna secara *real-time* melalui *webcam*. Sistem ini berfungsi sebagai implementasi praktis dari **Consumer Health Informatics (CHI)**, yang berfokus pada pemantauan kesehatan pribadi.

Sistem ini dilengkapi dengan antarmuka *dashboard* yang interaktif, otentikasi pengguna yang aman dengan *Role-Based Access Control* (RBAC), dan penyimpanan log historis ke *database* PostgreSQL.

Proyek ini dikembangkan sebagai bagian dari mata kuliah **IFB-499 Informatika Terapan** di Institut Teknologi Nasional Bandung.

---

## ✨ Fitur Utama (Features)

* **Deteksi Emosi Real-Time:** Menggunakan `DeepFace` untuk menganalisis *stream* video dan mengklasifikasikan emosi dominan (misal: 'happy', 'sad', 'neutral').
* **Deteksi Kelelahan (Metode Bervariasi):**
    * **`main` branch:** Menggunakan *classifier* Haar Cascade `OpenCV` sederhana.
    * **`feature/cnn-fatigue-model` branch (WIP):** Upaya untuk mengimplementasikan model CNN kustom yang dilatih pada MRL Eye Dataset untuk akurasi yang lebih tinggi.
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
    * [Keras 3 / TensorFlow 2.x](https://keras.io/) (Backend untuk DeepFace dan *training* model kustom)
* **Frontend:**
    * HTML5 & CSS3
    * [Bootstrap 5](https://getbootstrap.com/) (Styling UI modern)
    * [JavaScript (ES6+)](https://developer.mozilla.org/en-US/docs/Web/JavaScript) (Interaktivitas sisi klien)
    * [Chart.js](https://www.chartjs.org/) (Visualisasi grafik)

---

## 🗂️ Struktur Proyek (Branch Ini)
```
webcam_emotion_fatigue/
│
├── app.py                     # File utama Flask (diubah untuk model CNN)
├── models.py                  # Definisi model SQLAlchemy
├── extensions.py              # Inisialisasi ekstensi
│
├── train_eye_model.ipynb      # [BARU] Notebook untuk training model CNN
├── eye_status_model.weights.h5# [BARU] Output model (diabaikan oleh .gitignore)
│
├── ml-training/               # [BARU] Folder untuk dataset MRL
│
├── data/                      # Folder data (diabaikan oleh .gitignore)
│
├── database/
│   └── init.sql               # Kueri SQL untuk inisialisasi tabel
│
├── static/
│   ├── js/
│   │   └── dashboard.js       # (Diubah agar skor ditampilkan sebagai float)
│   └── ...                    # File statis lainnya (CSS, gambar, dll)
│
├── templates/
│   └── ...                    # Template HTML (Flask Jinja2)
│
├── requirements_v3.txt        # [BARU] Daftar dependensi untuk Keras 3
├── requirements.txt           # (Versi lama)
└── README.md                  # Dokumentasi proyek ini
```
---

## 🚀 Cara Instalasi & Menjalankan (Branch Ini)

**PERINGATAN: KODE INI TIDAK STABIL.**

```bash
# 1. Gunakan environment Conda v3
conda activate webcam_health_v3

# 2. Install dependensi
pip install -r requirements_v3.txt

# 3. Jalankan notebook 'train_eye_model.ipynb'
# (Pastikan Anda sudah mengunduh MRL Dataset ke 'ml-training/data')
# Jalankan semua cell untuk menghasilkan 'eye_status_model.weights.h5'

# 4. Jalankan server Flask
python app.py
```