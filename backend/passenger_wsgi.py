import sys
path = '/home/your_username/StegWebsite/backend'
if path not in sys.path:
    sys.path.append(path)

from app import app as application 