from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_session import Session

# Buat instance ekstensi TANPA mengikatnya ke 'app'
# Ini adalah objek 'kosong' yang netral
db = SQLAlchemy()
bcrypt = Bcrypt()
server_session = Session()