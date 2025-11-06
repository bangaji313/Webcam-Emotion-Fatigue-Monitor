# UBAH INI: from app import db
from extensions import db # Impor dari file extensions.py
from sqlalchemy.sql import func 

# 'db.Model' adalah kelas dasar untuk semua model di Flask-SQLAlchemy
class User(db.Model):
    # Menautkan kelas ini ke tabel 'users' di database
    __tablename__ = 'users'

    # Mendefinisikan kolom, disamakan dengan 'init.sql'
    id = db.Column(db.Integer, primary_key=True)
    nrp = db.Column(db.String(20), unique=True, nullable=False)
    nama = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(10), nullable=False, default='user')
    created_at = db.Column(db.TIMESTAMP(timezone=True), 
                           server_default=func.now())

    # Mendefinisikan relasi: Satu User bisa memiliki BANYAK log
    # 'lazy=True' berarti SQLAlchemy akan memuat log terkait saat dibutuhkan
    logs = db.relationship('DetectionLog', backref='user', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<User {self.nrp}>'

class DetectionLog(db.Model):
    # Menautkan kelas ini ke tabel 'detection_log'
    __tablename__ = 'detection_log'

    id = db.Column(db.Integer, primary_key=True)
    # 'db.ForeignKey' adalah definisi ORM dari relasi 'fk_user' di SQL
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    emotion = db.Column(db.String(50), nullable=False)
    fatigue_score = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.TIMESTAMP(timezone=True), 
                           server_default=func.now())

    def __repr__(self):
        return f'<Log {self.id} by User {self.user_id}>'