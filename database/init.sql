-- Hapus tabel jika sudah ada (berguna untuk testing ulang)
DROP TABLE IF EXISTS detection_log;
DROP TABLE IF EXISTS users;

-- =================================================================
-- Tabel 1: users
-- Menyimpan data kredensial dan peran pengguna.
-- =================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    nrp VARCHAR(20) UNIQUE NOT NULL,
    nama VARCHAR(100) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Buat index pada 'nrp' untuk pencarian yang lebih cepat saat login
CREATE INDEX idx_users_nrp ON users(nrp);

-- =================================================================
-- Tabel 2: detection_log
-- Menyimpan setiap hasil deteksi yang dilakukan oleh pengguna.
-- =================================================================
CREATE TABLE detection_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    emotion VARCHAR(50) NOT NULL,
    fatigue_score FLOAT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Membuat Foreign Key (kunci asing)
    -- Jika seorang 'user' dihapus, semua 'detection_log' miliknya juga akan terhapus (ON DELETE CASCADE)
    CONSTRAINT fk_user
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Buat index pada 'user_id' untuk mempercepat query pengambilan data log per pengguna
CREATE INDEX idx_log_user_id ON detection_log(user_id);

-- =================================================================
-- Tabel 3: heart_prediction_log
-- Menyimpan setiap hasil prediksi risiko jantung.
-- =================================================================
DROP TABLE IF EXISTS heart_prediction_log;

CREATE TABLE heart_prediction_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    
    -- Ini adalah 13 fitur INPUT
    age INTEGER NOT NULL,
    sex INTEGER NOT NULL,
    cp INTEGER NOT NULL,
    trestbps INTEGER NOT NULL,
    chol INTEGER NOT NULL,
    fbs INTEGER NOT NULL,
    restecg INTEGER NOT NULL,
    thalach INTEGER NOT NULL,
    exang INTEGER NOT NULL,
    oldpeak FLOAT NOT NULL,
    slope INTEGER NOT NULL,
    ca INTEGER NOT NULL,
    thal INTEGER NOT NULL,
    
    -- Ini adalah OUTPUT model
    prediction_score FLOAT NOT NULL, -- Probabilitas (cth: 0.85)
    prediction_class INTEGER NOT NULL, -- Hasil (0 atau 1)
    
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Relasi ke tabel 'users'
    CONSTRAINT fk_user_heart_log
        FOREIGN KEY(user_id) 
        REFERENCES users(id)
        ON DELETE CASCADE
);

-- Index untuk mempercepat query log per pengguna
CREATE INDEX idx_heart_log_user_id ON heart_prediction_log(user_id);