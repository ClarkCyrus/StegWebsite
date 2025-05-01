import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUpload, FiLock, FiDownload, FiArrowLeft, FiAlertTriangle, FiInfo} from 'react-icons/fi';
import './CreateStegoRoom.css';

function CreateStegoRoom() {
  const [name, setName] = useState('');
  const [encrypted, setEncrypted] = useState(true);
  const [storeKey, setStoreKey] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [messageFile, setMessageFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [messagePreview, setMessagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [newRoomId, setNewRoomId] = useState(null);
  const navigate = useNavigate();

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    const allowedFormats = ['image/png', 'image/tiff', 'image/bmp', 'image/jpeg']

    if (!file || !allowedFormats.includes(file.type)) {
      setError('Invalid format. Please upload a PNG, TIFF, BMP, or JPEG image.'); 
      e.target.value = null; 
      setCoverImage(null);
      return; 
    }

    setCoverImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCoverPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  };

  const handleMessageChange = (e) => {
    const file = e.target.files[0];
    const allowedFormats = ['text/plain', 'audio/mpeg', 'image/png']; // MIME

    if (!allowedFormats.includes(file.type)) {
      setError('Invalid file format. Please upload a TXT, MP3, or PNG file.'); 
      e.target.value = null;
      setMessageFile(null);
      return;
    }

    setMessageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (file.type.startsWith('image/')) {
          setMessagePreview({ type: 'image', content: reader.result });
        } else if (file.type.startsWith('audio/')) {
          setMessagePreview({ type: 'audio', content: reader.result });
        } else if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
          reader.onload = (e) => {
            setMessagePreview({ type: 'text', content: e.target.result });
          };
          reader.readAsText(file);
          return;
        } else {
          setMessagePreview({ type: 'unknown', name: file.name });
        }
      };
      reader.readAsDataURL(file);
    } else {
      setMessagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('encrypted', encrypted);
    formData.append('storeKey', storeKey);
    if (coverImage) formData.append('image', coverImage);
    if (messageFile) formData.append('message', messageFile);
    try {
      const res = await axios.post('http://localhost:5000/api/create_stego_room', formData, { withCredentials: true });
      setModalData({
        coverPreview,
        messagePreview,
        ...res.data.room,
        key: res.data.room.key,
        iv: res.data.room.iv,
        stego_image: res.data.room.stego_image,
        metrics: res.data.room.metrics
      });
      setNewRoomId(res.data.room.id);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create stego room');
    } finally {
      setLoading(false);
    }
  };

  const handleStegoDownload = (base64Data) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    const stegoUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = stegoUrl;
    link.download = 'stego_image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(stegoUrl);
  };

  const handleTextDownload = (content, filename) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleGoToRoom = () => {
    if (newRoomId) {
      navigate(`/room/${newRoomId}`);
    }
  };

  return (
    <div className="create-room-container">
      <div className="create-room-card">
        <div className="create-room-header">
          <button className="back-button" onClick={() => navigate('/dashboard')}>
            <FiArrowLeft size={20} />
            Back to Dashboard
          </button>
          <h1 className="create-room-title">Create Stego Room</h1>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form className="create-room-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-group">
              <label className="form-label">Room Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Enter room name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Security Options</label>
              <div className="security-options">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={encrypted}
                    onChange={e => setEncrypted(e.target.checked)}
                  />
                  <span className="slider"></span>
                  <span className="switch-label">Enable Encryption</span>
                </label>
                {encrypted && (
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={storeKey}
                      onChange={e => setStoreKey(e.target.checked)}
                    />
                    <span className="slider"></span>
                    <span className="switch-label">Store Key in Database</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="upload-section">
            <div className="upload-card">
              <div className="upload-header">
                <FiUpload size={24} />
                <h3>Cover Image</h3>
              </div>
              <div className="upload-content">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverChange}
                  required
                  className="file-input"
                />
                {coverPreview ? (
                  <img src={coverPreview} alt="cover preview" className="preview-image" />
                ) : (
                  <div className="upload-placeholder">
                    <p>Upload a cover image (PNG, TIFF, BMP, JPEG)</p>
                  </div>
                )}
              </div>
            </div>

            <div className="upload-card">
              <div className="upload-header">
                <FiLock size={24} />
                <h3>Secret Message</h3>
              </div>
              <div className="upload-content">
                <input
                  type="file"
                  accept=".txt, .mp3, .jpg, .png"
                  onChange={handleMessageChange}
                  required
                  className="file-input"
                />
                {messagePreview && (
                  <div className="preview-container">
                    {messagePreview.type === 'image' && (
                      <img src={messagePreview.content} alt="message preview" className="preview-image" />
                    )}
                    {messagePreview.type === 'audio' && (
                      <audio controls className="preview-audio">
                        <source src={messagePreview.content} />
                      </audio>
                    )}
                    {messagePreview.type === 'text' && (
                      <div className="preview-text">
                        {messagePreview.content.length > 200
                          ? `${messagePreview.content.substring(0, 200)}...`
                          : messagePreview.content}
                      </div>
                    )}
                    {messagePreview.type === 'unknown' && (
                      <span className="preview-filename">File selected: {messagePreview.name}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className="create-button" disabled={loading}>
            {loading ? 'Creating...' : 'Create Stego Room'}
          </button>
        </form>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Stego Room Created Successfully!</h2>
              <button className="close-button" onClick={handleModalClose}>×</button>
            </div>
            <div className="modal-body">
              <div className="download-section">
                <button className="download-button" onClick={() => handleStegoDownload(modalData?.stego_image)}>
                  <FiDownload size={20} />
                  Download Stego Image
                </button>
                <div className="warning-alert">
                  <FiAlertTriangle size={20} />
                    <span style={{ display: "flex", alignItems: "center" }}>
                      You must download the stego image, else it will not be retrievable later.
                    </span>
                </div>
                {encrypted && (
                  <>
                    <button className="download-button" onClick={() => handleTextDownload(modalData?.key, 'encryption_key.txt')}>
                      <FiDownload size={20} />
                      Download Encryption Key
                    </button>
                    <button className="download-button" onClick={() => handleTextDownload(modalData?.iv, 'encryption_iv.txt')}>
                      <FiDownload size={20} />
                      Download Encryption IV
                    </button>
                    {!storeKey && (
                      <div className="warning-alert">
                        <FiLock size={20} />
                        <span style={{ display: "flex", alignItems: "center" }}>
                          You must download the encryption key and IV. They will not be stored in the database.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="preview-section">
                <div className="preview-grid">
                  <div className="preview-item">
                    <h3>Original Image</h3>
                    {modalData?.coverPreview && (
                      <img src={modalData.coverPreview} alt="cover preview" className="preview-image" />
                    )}
                  </div>
                  <div className="preview-item">
                    <h3>Stego Image</h3>
                    {modalData?.stego_image && (
                      <img src={`data:image/png;base64,${modalData.stego_image}`} alt="stego preview" className="preview-image" />
                    )}
                  </div>
                </div>
                <div className="warning-info">
                  <FiInfo size={20} />
                    <span style={{ display: "flex", alignItems: "center" }}>
                      When the PSNR metric is lower than 30, the image quality might be low.
                    </span>
                </div>
                {modalData?.metrics && (
                  <div className="metrics-section">
                    <h3>Embedding Metrics</h3>
                    <div className="metrics-grid">
                      {Object.entries(modalData.metrics).map(([key, value]) => (
                        <div key={key} className="metric-item">
                          <span className="metric-label">{key}:</span>
                          <span className="metric-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {newRoomId && (
                <button className="go-to-room-button" onClick={handleGoToRoom}>
                  Go to Room
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
            <p className="loading-text">
              {'Embedding message, please wait...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateStegoRoom; 