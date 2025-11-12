import React, { useState, useRef, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUpload, FiLock, FiDownload, FiArrowLeft, FiAlertTriangle, FiInfo, FiMic, FiStopCircle, FiCamera} from 'react-icons/fi';
import { Dropdown } from 'react-bootstrap';
import './CreateStegoRoom.css';
import config from '../config';

function CreateStegoRoom() {
  const [name, setName] = useState('');
  const [encrypted, setEncrypted] = useState(true);
  const [storeKey, setStoreKey] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [messageFile, setMessageFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [messagePreview, setMessagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [newRoomId, setNewRoomId] = useState(null);
  const [imageCapacity, setImageCapacity] = useState(null);
  const [messageSize, setMessageSize] = useState(null);
  const [capacityExceeded, setCapacityExceeded] = useState(false);
  const navigate = useNavigate();

  const [manualInput, setManualInput] = useState(false); 
  const [inputMode, setInputMode] = useState('text');
  const [manualText, setManualText] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setMessagePreview(null);
    setMessageFile(null);
    setManualText("");
  }, [inputMode]);

  // Scroll to top when error occurs
  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    const allowedFormats = ['image/png', 'image/tiff', 'image/bmp', 'image/jpeg']

    if (!file || !allowedFormats.includes(file.type)) {
      setError('Invalid format. Please upload a PNG, TIFF, BMP, or JPEG image.'); 
      e.target.value = null; 
      setCoverImage(null);
      setImageCapacity(null);
      return; 
    }

    setCoverImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
        
        // Calculate capacity
        const img = new Image();
        img.onload = () => {
          const capacity = calculateCapacity(img);
          setImageCapacity(capacity);
          checkCapacity(capacity, messageSize);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
      setImageCapacity(null);
    }
  };

  const handleMessageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setMessageFile(null);
      setMessagePreview(null);
      setMessageSize(null);
      return;
    }

    const allowedFormats = ['text/plain', 'audio/mpeg', 'image/png', 'image/jpeg']; 
    if (!allowedFormats.includes(file.type)) {
      setError('Invalid file format. Please upload a TXT, MP3, JPEG, or PNG file.'); 
      e.target.value = null;
      setMessageFile(null);
      setMessageSize(null);
      return;
    }
  
    setError(null);
    setMessageFile(file);
    setMessageSize(file.size);
    checkCapacity(imageCapacity, file.size);
    setMessagePreview(null);

    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt');
    const reader = new FileReader();  

    if (isText) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }

    reader.onload = (ev) => {
      const type = isText ? 'text' : (file.type.startsWith('image/') ? 'image' : 'audio');
      const newPreview = { type, content: String(ev.target.result) };
      requestAnimationFrame(() => setMessagePreview(newPreview));
    };

    reader.onerror = () => { 
      setError('Failed to read text file'); 
      setMessagePreview(null); 
    };

  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProgress(0); 
    const formData = new FormData();
    formData.append('name', name);
    formData.append('encrypted', encrypted);
    formData.append('storeKey', storeKey);
    if (coverImage) formData.append('image', coverImage);
    if (messageFile) formData.append('message', messageFile);

    try {
      const res = await axios.post(
        `${config.API_BASE_URL}/api/create_stego_room`,
        formData, 
        { withCredentials: true,
           onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.floor(Math.random() * 80);
            setProgress(percent); 
          }
        },
        }
      );

        setProgress(100);
        await new Promise((r) => setTimeout(r, 1000));

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

  // Format metric values with appropriate units and decimal places
  const formatMetricValue = (key, value) => {
    if (typeof value === 'string') {
      try {
        value = parseFloat(value);
      } catch (e) {
        return value;
      }
    }

    switch (key) {
      case 'psnr':
        return `${value.toFixed(2)} dB`;
      case 'mse':
        return value.toFixed(4);
      case 'ssim':
        return value.toFixed(4);
      case 'bpp':
        return `${value.toFixed(3)} bits/pixel`;
      case 'capacity':
        return formatBytes(value);
      case 'message_size':
        return formatBytes(value);
      default:
        return value;
    }
  };

  // Format bytes to human-readable format
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Calculate image capacity based on dimensions
  const calculateCapacity = (img, rounds = 8) => {
    const width = img.width;
    const height = img.height;
    const totalPixels = width * height;
    const channels = 3; // RGB
    
    // Calculate total bits available
    const totalBitsAvailable = totalPixels * rounds * channels;
    
    // Subtract metadata bits (3 bits for type + 32 bits for length)
    const metadataBits = 35;
    const availableBits = totalBitsAvailable - metadataBits;
    
    // Convert to bytes
    const maxBytes = Math.floor(availableBits / 8);
    return maxBytes;
  };

  // Check capacity when both files are uploaded
  const checkCapacity = (capacity, msgSize) => {
    if (capacity && msgSize) {
      setCapacityExceeded(msgSize > capacity);
    } else {
      setCapacityExceeded(false);
    }
  };
  
  const handleTextChange = (e) => {
    const value = e.target.value;
    setManualText(value);
    const textFile = new File([value], "message.txt", { type: "text/plain" });
    setMessageFile(textFile);
    setMessageSize(textFile.size);
    checkCapacity(imageCapacity, textFile.size);
    setMessagePreview(null); 
  };

  // ---------------- AUDIO HELPERS ----------------
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    chunksRef.current = []; 
    recorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data); 
    };

    recorder.start();
    setRecording(true);

    timerRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    setRecording(false); 
    clearInterval(timerRef.current);

    return new Promise((resolve) => {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = []; 
        setRecording(false);
        setSeconds(0);

        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        
        resolve(blob);
      };
      mediaRecorderRef.current.stop();
    });
  };

  const handleRecordedBlob = (blob) => {
    if (!blob) return;

    const file = new File([blob], `recording-${Date.now()}.webm`, { type: blob.type });
    setMessageFile(file);
    setMessageSize(file.size);
    checkCapacity(imageCapacity, file.size);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (ev) => {
      setMessagePreview({ type: "audio", content: ev.target.result });
    };
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ---------------- CAMERA HELPERS ----------------
  function WebCameraCapture({ onImageCaptured }) {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const startCamera = async () => {
      setError(null);
      setLoading(true);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported by this browser');
        }

        const constraints = { video: { facingMode: 'environment' } }; 
        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          try {
            await videoRef.current.play();
          } catch (playErr) {
            console.warn('video.play() failed:', playErr);
          }
        }

        setStream(mediaStream);
      } catch (err) {
        console.error('startCamera error', err);
        setError(err.message || 'Failed to open camera');
        if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
          setError('Camera permission denied');
        }
      } finally {
        setLoading(false);
      }
    };

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const captureImage = () => {
      const video = videoRef.current;
      if (!video || !stream) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          setError('Failed to capture image');
          return;
        }
        const file = new File([blob], `photo-${Date.now()}.png`, { type: 'image/png' });
        
        if (setMessageFile) {
          setMessageFile(file);
          setMessageSize(file.size);
          checkCapacity(imageCapacity, file.size);
        }

        if (setMessagePreview) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            setMessagePreview({ type: 'image', content: ev.target.result });
          };
          reader.readAsDataURL(file);
        }
      
        onImageCaptured(file);
      }, 'image/png');
    };

    useEffect(() => {
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Cleanup on unmount
      return () => {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      };
    }, [stream]);

    return (
      <div className="manual-panel manual-camera">
        {!messagePreview ? (
          !stream ? (
            <button type="button" onClick={startCamera} disabled={loading}>
              <FiCamera size={16} /> {loading ? 'Opening Camera...' : 'Take A Photo'}
            </button>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="photo-container"
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={captureImage}
                  style={{ padding: '0.5rem 1rem', borderRadius: 6, backgroundColor: '#6b46c1', color: 'white', border: 'none' }}
                >
                  Capture
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  style={{ padding: '0.5rem 1rem', borderRadius: 6, backgroundColor: '#e53e3e', color: 'white', border: 'none' }}
                >
                  Stop
                </button>
              </div>
            </>
          ) 
        ) : (
          <img 
            src={messagePreview.content} 
            alt="message preview" 
            className="preview-image"
          />
        )}
        {error && <div className="camera-error" role="alert" style={{ color: '#c00', marginTop: 8 }}>{error}</div>}
      </div>
    );
  }

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
                  <div className="tooltip-container">
                    <FiInfo size={22} className='tooltip-icon'/>
                <span className="tooltip-text">When enabled, your stego image will be encrypted.</span>
                </div>
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
                    <div className="tooltip-container">
                    <FiInfo size={22} className='tooltip-icon'/>
                <span className="tooltip-text">When enabled, the Encryption key and Encryption IV will be saved to the database.</span>
                </div>
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
                    <>
                      <img src={coverPreview} alt="cover preview" className="preview-image" />
                      {imageCapacity && (
                        <div className="capacity-info">
                          <strong>Image Capacity:</strong> {formatBytes(imageCapacity)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <p>Upload a cover image (PNG, TIFF, BMP, JPEG)</p>
                      <p className="file-size-info">Max file size: 10MB</p>
                    </div>
                  )}
              </div>
            </div>

            <div className="upload-card">
              <div className="upload-header">
                <FiLock size={24} />
                <h3>Secret Message</h3>
              </div>
              <div className="input-option">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={manualInput}
                    onChange={e => {
                      const enabled = e.target.checked
                      setManualInput(enabled)
                      setInputMode(enabled ? 'text' : null);
                    }}
                  />
                  <span className="slider"></span>
                  <span className="switch-label">Manual Input</span>
                  <div className="tooltip-container">
                    <FiInfo size={22} className='tooltip-icon manual-input'/>
                <span className="tooltip-text">When enabled, manually input your secret message by typing a text, capturing a photo, or recording an audio. </span>
                </div>
                </label>
              </div>
              <div className="upload-content">
                {manualInput ? (
                  <>
                    <div className="file-input">
                      <Dropdown>
                        <Dropdown.Toggle 
                          variant="light" 
                          id="inputModeSelect" 
                          className="input-mode-select"
                        >
                          {inputMode.charAt(0).toUpperCase() + inputMode.slice(1)}
                        </Dropdown.Toggle>

                        <Dropdown.Menu>
                          <Dropdown.Item 
                            active={inputMode === 'text'} 
                            onClick={() => setInputMode('text')}
                          >
                            Text
                          </Dropdown.Item>
                          <Dropdown.Item 
                            active={inputMode === 'audio'} 
                            onClick={() => setInputMode('audio')}
                          >
                            Audio
                          </Dropdown.Item>
                          <Dropdown.Item 
                            active={inputMode === 'image'} 
                            onClick={() => setInputMode('image')}
                          >
                            Image
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                      <label htmlFor="inputModeSelect" className="input-mode-label">Choose input format</label>
                    </div>
                    <div className="input-placeholder">
                      {inputMode === "text" && (
                        <div className="manual-panel manual-text">
                          {!messagePreview ? (
                            <textarea
                              value={manualText}
                              onChange={handleTextChange}
                              placeholder="Type your secret message here..."
                            />
                          ) : (
                            <div className="preview-text">
                              {messagePreview.content.length > 200
                                ? `${messagePreview.content.substring(0, 200)}...`
                                : messagePreview.content}
                            </div>
                          )}
                        </div>
                      )}
                      {inputMode === "audio" && (
                        <div className="manual-panel manual-record">
                          {!messagePreview ? (
                            <>
                              {!recording ? (
                                <button  onClick={(e) => 
                                  {
                                    e.preventDefault();
                                    startRecording();
                                  }}>
                                  <FiMic size={16} /> Start Recording
                                </button>
                              ) : (
                                <>
                                  <span style={{ color: "#718096", fontWeight: "bold" }}>Recording</span>
                                  <div style={{ color: '#718096', fontSize: '1.5rem' }}>{formatTime(seconds)}</div>
                                  <button onClick={async (e) => {
                                    e.preventDefault();
                                    const blob = await stopRecording();
                                    handleRecordedBlob(blob);
                                  }}>
                                    <FiStopCircle size={18} /> Stop Recording
                                  </button>
                                </>
                              )}
                            </>
                          ) : (
                              <audio controls className="audio-player">
                                <source src={messagePreview.content} />
                              </audio>
                          )}
                        </div>
                      )}
                      {inputMode === 'image' && (
                        <WebCameraCapture onImageCaptured={(file) => console.log(file)} />
                      )}
                    </div>
                  </>
                ) : (
                  <>
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
                  {!messagePreview && (
                    <div className="upload-placeholder">
                      <p>Upload a secret message file (TXT, MP3, PNG, JPEG)</p>
                      <p className="file-size-info">Max file size: 10MB</p>
                    </div>
                  )}
                  {messageSize && (
                    <div className="capacity-info">
                      <strong>Message Size:</strong> {formatBytes(messageSize)}
                    </div>
                  )}
                  </>
                )}
                {capacityExceeded && (
                  <div className="error-alert capacity-warning" style={{ marginTop: '1rem' }}>
                    ⚠️ Message size ({formatBytes(messageSize)}) exceeds image capacity ({formatBytes(imageCapacity)})! 
                    Please use a larger image or smaller message.
                  </div>
                )}
                </div>
              </div>
            </div>

          <div className="warning-info">
            <FiInfo size={20} />
            <div>
              <p><strong>Important Information:</strong></p>
              <ul>
                <li>PNG format is recommended for cover images to ensure best quality.</li>
                <li>Your output stego image will always be saved as PNG regardless of input format.</li>
                <li>JPEG cannot be an output stego image as some hidden data is destroyed due to lossy format.</li>
                <li>File size limits: 10MB for cover images, 10MB for secret messages, 100MB for stego images.</li>
              </ul>
            </div>
          </div>

          <button type="submit" className="create-button" disabled={loading || capacityExceeded}>
            {loading ? 'Creating...' : capacityExceeded ? 'Message Too Large' : 'Create Stego Room'}
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
                          <span className="metric-label">{formatMetricLabel(key)}:</span>
                          <span className="metric-value">{formatMetricValue(key, value)}</span>
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
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-percent">{progress}%</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to format metric labels for better display
function formatMetricLabel(key) {
  switch (key) {
    case 'psnr':
      return 'PSNR';
    case 'mse':
      return 'MSE';
    case 'ssim':
      return 'SSIM';
    case 'bpp':
      return 'Bits Per Pixel';
    case 'capacity':
      return 'Maximum Capacity';
    case 'message_size':
      return 'Message Size';
    default:
      return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
  }
}

export default CreateStegoRoom; 