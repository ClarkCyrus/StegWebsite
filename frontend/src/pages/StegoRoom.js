import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUpload, FiDownload, FiLock, FiArrowLeft, FiImage, FiFileText, FiMusic } from 'react-icons/fi';
import './StegoRoom.css';

function StegoRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [stegoUpload, setStegoUpload] = useState(null);
  const [key, setKey] = useState('');
  const [iv, setIV] = useState('');
  const [message, setMessage] = useState(null);
  const [messagePreview, setMessagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/stegorooms/${roomId}`, { withCredentials: true })
      .then(res => {
        setRoom(res.data.room);
        console.log(res.data.room)
        if (res.data.room.is_encrypted) {
          setKey(res.data.room.key || '');
          setIV(res.data.room.iv || '');
        }
      })
      .catch(() => setError('Failed to load room data'));
  }, [roomId]);

  const handleStegoUpload = (e) => {
    setStegoUpload(e.target.files[0]);
  };

  const handleGetMessage = async () => {
    setError(null);
    setMessage(null);
    setMessagePreview(null);
    if (!stegoUpload) {
      setError('Please upload a stego image');
      setLoading(false); 
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('stego_image', stegoUpload);
    formData.append('is_encrypted', room.is_encrypted);
    if (room.is_encrypted) {
      formData.append('key', key);
      formData.append('iv', iv);
    }
    try {
      const response = await fetch('http://localhost:5000/api/mlsb/extract', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to extract message');
      
      setMessage(data.message);

      // Create preview based on media type
      const downloadUrl = `http://localhost:5000/api/mlsb/download?path=${encodeURIComponent(data.output_path)}`;
      const ext = data.media_type === 'text' ? '.txt' : data.media_type === 'image' ? '.png' : '.mp3';
      
      if (data.media_type === 'text') {
        setMessagePreview({
          type: 'text',
          content: typeof data.message === 'string' ? data.message : 'Text content extracted',
          downloadUrl,
          filename: `extracted_message${ext}`
        });
      } else if (data.media_type === 'image') {
        setMessagePreview({
          type: 'image',
          content: downloadUrl,
          downloadUrl,
          filename: `extracted_message${ext}`
        });
      } else if (data.media_type === 'audio') {
        setMessagePreview({
          type: 'audio',
          content: downloadUrl,
          downloadUrl,
          filename: `extracted_message${ext}`
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (downloadUrl, filename) => {
    const element = document.createElement('a');
    element.href = downloadUrl;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getImageSrc = (img) => {
    if (!img) return null;
    
    // Clean up the path by replacing backslashes with forward slashes
    const normalizedPath = img.replace(/\\/g, '/');
    
    // Handle different image path formats
    if (normalizedPath.startsWith('data:image')) {
      return normalizedPath;
    }
    
    // Handle base64 encoded images
    if (normalizedPath.match(/^[A-Za-z0-9+/=]+$/)) {
      return `data:image/png;base64,${normalizedPath}`;
    }
    
    // Handle uploads directory paths
    if (normalizedPath.startsWith('uploads/')) {
      return `http://localhost:5000/${normalizedPath}`;
    }
    
    // Handle any other paths that might be relative to uploads
    if (!normalizedPath.startsWith('http')) {
      return `http://localhost:5000/uploads/${normalizedPath.replace('uploads/', '')}`;
    }
    
    return normalizedPath;
  };

  return (
    <div className="stego-room-container">
      <div className="stego-room-card">
        <div className="stego-room-header">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <FiArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className="stego-room-title">{room?.name || 'Loading...'}</h1>
        </div>

        {error && <div className="error-alert">{error}</div>}

        {room && (
          <div className="stego-room-content">
            <div className="image-section">
              <div className="image-card">
                <div className="image-header">
                  <FiImage size={24} />
                  <h3>Cover Image</h3>
                </div>
                <div className="image-preview">
                  {getImageSrc(room.cover_image) && (
                    <img src={getImageSrc(room.cover_image)} alt="cover" className="preview-image" />
                  )}
                </div>
              </div>

              <div className="image-card">
                <div className="image-header">
                  <FiImage size={24} />
                  <h3>Stego Image</h3>
                </div>
                <div className="image-preview">
                  {getImageSrc(room.stego_image) && (
                    <img src={getImageSrc(room.stego_image)} alt="stego" className="preview-image" />
                  )}
                </div>
              </div>
            </div>

            <div className="metrics-section">
              <div className="metrics-header">
                <h3>Embedding Metrics</h3>
              </div>
              <div className="metrics-grid">
                {(() => {
                  let metricsObj = room.metrics;
                  if (typeof metricsObj === 'string') {
                    try {
                      metricsObj = metricsObj.replace(/np\.float64\(([\d.]+)\)/g, '$1');
                      metricsObj = JSON.parse(metricsObj.replace(/'/g, '"'));
                    } catch (e) {
                      console.error('Error parsing metrics:', e);
                      metricsObj = {};
                    }
                  }
                  return Object.entries(metricsObj).map(([k, v]) => (
                    <div key={k} className="metric-item">
                      <span className="metric-label">{k}:</span>
                      <span className="metric-value">
                        {typeof v === 'number' ? 
                          k === 'capacity' || k === 'message_size' ? 
                            v.toLocaleString() : 
                            v.toFixed(2)
                          : v}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="extraction-section">
              <div className="encryption-section">
                <div className="encryption-status">
                  <FiLock size={20} />
                  <span>Encryption: {room.is_encrypted ? 'Enabled' : 'Disabled'}</span>
                </div>
                {room.is_encrypted && (
                  <div className="encryption-inputs">
                    <div className="form-group">
                      <label className="form-label">Encryption Key</label>
                      <input
                        type="text"
                        className="form-control"
                        value={key}
                        onChange={e => setKey(e.target.value)}
                        placeholder="Enter encryption key"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Initialization Vector (IV)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={iv}
                        onChange={e => setIV(e.target.value)}
                        placeholder="Enter IV"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="upload-section">
                <div className="upload-card">
                  <div className="upload-header">
                    <FiUpload size={24} />
                    <h3>Upload Stego Image</h3>
                  </div>
                  <input
                    type="file"
                    className="file-input"
                    onChange={handleStegoUpload}
                    accept="image/*"
                  />
                </div>

                <button 
                  className="extract-button"
                  onClick={handleGetMessage}
                  disabled={loading}
                >
                  {loading ? 'Extracting...' : 'Extract Message'}
                </button>
              </div>

              {messagePreview && (
                <div className="message-preview">
                  <div className="preview-header">
                    <h3>Extracted Message</h3>
                    <button 
                      className="download-button"
                      onClick={() => handleDownload(messagePreview.downloadUrl, messagePreview.filename)}
                    >
                      <FiDownload size={20} />
                      Download
                    </button>
                  </div>
                  <div className="preview-content">
                    {messagePreview.type === 'image' && (
                      <img src={messagePreview.content} alt="extracted preview" className="preview-image" />
                    )}
                    {messagePreview.type === 'audio' && (
                      <audio controls className="preview-audio">
                        <source src={messagePreview.content} />
                      </audio>
                    )}
                    {messagePreview.type === 'text' && (
                      <div className="preview-text">
                        {messagePreview.content}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <p className="loading-text">
              {'Extracting message, please wait...'}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

export default StegoRoom;