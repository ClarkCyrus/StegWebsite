import os

class Config:
    """Base configuration class."""
    SECRET_KEY = os.environ.get('SECRET_KEY', '123')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB max file size

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///database.db'
    UPLOAD_FOLDER = 'uploads'
    BASE_URL = 'http://localhost:5000'
    CORS_ORIGINS = ["*"]

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///database.db'
    UPLOAD_FOLDER = '/home/stegx/uploads'
    BASE_URL = 'https://stegx.pythonanywhere.com'
    CORS_ORIGINS = ["https://stegx.pythonanywhere.com"]
    SESSION_COOKIE_SAMESITE = 'None'
    SESSION_COOKIE_SECURE = True

def get_config():
    """Return the appropriate configuration object based on the environment."""
    env = os.environ.get('FLASK_ENV', 'development')
    
    if env == 'production':
        print("Using PRODUCTION config")
        return ProductionConfig()

    print("Using Development config")
    return DevelopmentConfig()