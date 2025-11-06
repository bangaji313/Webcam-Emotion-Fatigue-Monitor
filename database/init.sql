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