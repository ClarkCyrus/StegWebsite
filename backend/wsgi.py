import os
import sys

# Add the current directory to the path
path = os.path.dirname(os.path.abspath(__file__))
if path not in sys.path:
    sys.path.append(path)

# Set Flask environment to development
os.environ['FLASK_ENV'] = 'development'

# Import the Flask application
from app import app

if __name__ == '__main__':
    # Create the database if it doesn't exist
    from app import db
    with app.app_context():
        db.create_all()
    
    # Run the development server
    app.run(debug=True) 