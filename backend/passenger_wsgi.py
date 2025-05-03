import os
import sys

# Add the current directory to the path
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.append(path)

# Set Flask environment to production
os.environ['FLASK_ENV'] = 'production'

# Import the Flask application - app.py already defines application = app
from app import application 