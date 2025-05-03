# StegoWeb - Steganography Web Application

A full-stack web application for hiding messages in images using Multi-Layer LSB steganography.

## Features

- Hide text, images, or audio files within images
- Create and manage steganography rooms
- Optional AES encryption for secure message hiding
- User authentication system
- Interactive dashboard for managing hidden messages
- Quick steganography feature without account creation
- Responsive UI design

## Project Structure

```
StegWebsite/
├── backend/           # Flask backend
│   ├── app.py         # Main Flask application
│   ├── config.py      # Configuration for different environments
│   ├── mlsb_algo_api/ # Steganography algorithm implementation
│   └── requirements.txt
│
└── frontend/          # React frontend
    ├── public/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── config.js  # Environment configuration
    │   └── App.js
    └── package.json
```

## Local Development Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask development server:
   ```bash
   flask run
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. The application will be available at [http://localhost:3000](http://localhost:3000)

## Production Deployment (PythonAnywhere)

### Backend Deployment

1. Clone your repository on PythonAnywhere:
   ```bash
   git clone https://your-repository-url.git
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create required directories:
   ```bash
   mkdir -p /home/yourusername/uploads
   ```

5. Set up a web app in PythonAnywhere:
   - Source code: `/home/yourusername/StegWebsite/backend`
   - Working directory: `/home/yourusername/StegWebsite/backend`
   - WSGI configuration file: Uses `app.py`

6. Set environment variable in the PythonAnywhere WSGI configuration:
   ```python
   os.environ['FLASK_ENV'] = 'production'
   ```

### Frontend Deployment

1. Build the React frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Copy the build folder to the backend directory:
   ```bash
   cp -r build/ ../backend/
   ```

## Configuration

The application automatically detects whether it's running in development or production mode:

- In development mode:
  - Backend runs on `http://localhost:5000`
  - Frontend runs on `http://localhost:3000`
  - Files are stored in local `uploads/` directory

- In production mode:
  - Backend and frontend use the same domain (e.g., `https://yourusername.pythonanywhere.com`)
  - Files are stored in `/home/yourusername/uploads`

## Security Considerations

- Use HTTPS in production
- Set a strong SECRET_KEY in production
- Remove debug mode in production
- Consider implementing rate limiting for API endpoints

## License

[MIT License](LICENSE)
