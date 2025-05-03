import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUpload, FiDownload, FiLock, FiArrowLeft, FiImage, FiFileText, FiMusic } from 'react-icons/fi';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import './StegoRoom.css';
import API_BASE_URL from '../config';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedMetrics, setExpandedMetrics] = useState({});

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/stegorooms/${roomId}`, { withCredentials: true })
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

  // Initialize slider position
  useEffect(() => {
    // Apply initial slider position
    const container = document.querySelector('.image-comparison-container');
    if (container) {
      container.style.setProperty('--position', `${sliderPosition}%`);
    }
  }, [room, sliderPosition]);

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
      const response = await fetch(`${API_BASE_URL}/api/mlsb/extract`, {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to extract message');
      
      setMessage(data.message);

      // Create preview based on media type
      const downloadUrl = data.output_url 
        ? `${API_BASE_URL}${data.output_url}` 
        : `${API_BASE_URL}/api/mlsb/download?path=${encodeURIComponent(data.output_path)}`;
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
      return `${API_BASE_URL}/${normalizedPath}`;
    }
    
    // Handle any other paths that might be relative to uploads
    if (!normalizedPath.startsWith('http')) {
      return `${API_BASE_URL}/uploads/${normalizedPath.replace('uploads/', '')}`;
    }
    
    return normalizedPath;
  };

  const preventImageInteraction = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderLSBTable = (bpp) => {
    // Calculate how many complete LSB layers are used
    const totalBitsPerPixel = bpp;
    const bitsPerChannel = totalBitsPerPixel / 3; // Since RGB has 3 channels
    const completeLayersUsed = Math.ceil(bitsPerChannel);

    // Create data for all 8 bits (from LSB to MSB)
    const bits = Array.from({ length: 8 }, (_, i) => ({
      bit: 8 - i, // Order: 8,7,6,5,4,3,2,1
      used: (7 - i) < completeLayersUsed,
      color: (7 - i) < completeLayersUsed ? getColorForBit(8 - i) : '#e9ecef'
    }));

    return (
      <div className="lsb-visualization">
        <div className="chart-title">LSB Layer Usage</div>
        <div className="lsb-table">
          <div className="lsb-header">
            <div className="lsb-cell">R</div>
            <div className="lsb-cell">G</div>
            <div className="lsb-cell">B</div>
          </div>
          {[...Array(8)].map((_, row) => (
            <div key={row} className="lsb-row">
              {['R', 'G', 'B'].map((channel, col) => (
                <div
                  key={`${row}-${col}`}
                  className="lsb-cell"
                  style={{
                    backgroundColor: bits[row].color,
                    color: bits[row].used ? 'white' : '#666',
                  }}
                >
                  Bit {bits[row].bit}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="lsb-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#2e7d32' }}></span>
            <span>Safe (Minimal Impact)</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ffc107' }}></span>
            <span>Moderate Impact</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f44336' }}></span>
            <span>High Impact</span>
          </div>
        </div>
      </div>
    );
  };

  const getColorForBit = (bitPosition) => {
    // Color scheme from safe (green) to dangerous (red)
    const colors = {
      8: '#f44336', // Red (MSB - high impact)
      7: '#ff5722',
      6: '#ff9800',
      5: '#ffc107', // Yellow
      4: '#ffeb3b',
      3: '#8bc34a',
      2: '#4caf50',
      1: '#2e7d32', // Dark Green (LSB - minimal impact)
    };
    return colors[bitPosition] || '#e9ecef';
  };

  const renderMetricsSection = (metricsObj) => {
    if (!metricsObj) return null;

    // Parse metrics if they're in string format
    if (typeof metricsObj === 'string') {
      try {
        metricsObj = metricsObj.replace(/np\.float64\(([\d.]+)\)/g, '$1');
        metricsObj = JSON.parse(metricsObj.replace(/'/g, '"'));
      } catch (e) {
        console.error('Error parsing metrics:', e);
        return null;
      }
    }

    const capacityData = {
      labels: ['Message Size', 'Total Capacity'],
      datasets: [{
        label: 'Storage Usage (bytes)',
        data: [metricsObj.message_size, metricsObj.capacity],
        backgroundColor: ['rgba(111, 66, 193, 0.6)', 'rgba(111, 66, 193, 0.3)'],
        borderColor: ['rgba(111, 66, 193, 1)', 'rgba(111, 66, 193, 0.5)'],
        borderWidth: 1
      }]
    };

    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'center'
        },
        title: {
          display: true,
          text: 'Storage Capacity Usage',
          align: 'center',
          font: {
            size: 16,
            weight: 'bold'
          },
          padding: {
            top: 10,
            bottom: 20
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Bytes',
            align: 'center'
          }
        }
      },
      layout: {
        padding: {
          top: 20,
          bottom: 20
        }
      }
    };

    const renderMetricsExplanation = () => (
      <div className="metrics-info">
        <h4>
          Metrics Explained
          <button 
            className="metrics-toggle-button"
            onClick={() => setExpandedMetrics({...expandedMetrics, all: !expandedMetrics.all})}
          >
            <span className={expandedMetrics.all ? "arrow up" : "arrow down"}></span>
          </button>
        </h4>
        {expandedMetrics.all && (
          <ul>
            <li>
              <span className="metric-name">MSE</span>
              <button 
                className="metrics-toggle-button small"
                onClick={() => setExpandedMetrics({...expandedMetrics, mse: !expandedMetrics.mse})}
              >
                <span className={expandedMetrics.mse ? "arrow up" : "arrow down"}></span>
              </button>
              {expandedMetrics.mse && (
                <div>
                  <span className="metric-formula">MSE = Σ(m,n)[I₁(m,n) - I₂(m,n)]² / (M * N)</span>
                  <span className="metrics-explanation">
                    Mean Squared Error measures the average squared difference between pixels in the original and steganographic images. 
                    Lower values indicate better quality (less distortion).
                  </span>
                </div>
              )}
            </li>
            <li>
              <span className="metric-name">SSIM</span>
              <button 
                className="metrics-toggle-button small"
                onClick={() => setExpandedMetrics({...expandedMetrics, ssim: !expandedMetrics.ssim})}
              >
                <span className={expandedMetrics.ssim ? "arrow up" : "arrow down"}></span>
              </button>
              {expandedMetrics.ssim && (
                <div>
                  <span className="metric-formula">SSIM(x,y) = (2μₓμy + c₁)(2σₓᵧ + c₂) / ((μₓ² + μy² + c₁)(σₓ² + σy² + c₂))</span>
                  <span className="metrics-explanation">
                    Structural Similarity Index Measure evaluates the perceived quality considering luminance, contrast, and structure.
                    Values range from -1 to 1, with 1 indicating perfect similarity (higher is better).
                  </span>
                </div>
              )}
            </li>
            <li>
              <span className="metric-name">PSNR</span>
              <button 
                className="metrics-toggle-button small"
                onClick={() => setExpandedMetrics({...expandedMetrics, psnr: !expandedMetrics.psnr})}
              >
                <span className={expandedMetrics.psnr ? "arrow up" : "arrow down"}></span>
              </button>
              {expandedMetrics.psnr && (
                <div>
                  <span className="metric-formula">PSNR = 20 * log₁₀(MAX_I / √MSE)</span>
                  <span className="metrics-explanation">
                    Peak Signal-to-Noise Ratio measures image quality in decibels (dB).
                    Higher values indicate better quality, typically 30+ dB is considered good.
                  </span>
                </div>
              )}
            </li>
            <li>
              <span className="metric-name">BPP</span>
              <button 
                className="metrics-toggle-button small"
                onClick={() => setExpandedMetrics({...expandedMetrics, bpp: !expandedMetrics.bpp})}
              >
                <span className={expandedMetrics.bpp ? "arrow up" : "arrow down"}></span>
              </button>
              {expandedMetrics.bpp && (
                <div>
                  <span className="metric-formula">BPP = Total bits embedded / Total number of pixels</span>
                  <span className="metrics-explanation">
                    Bits Per Pixel indicates how many bits are hidden in each pixel on average.
                    Higher values mean more data is stored, but may increase detection risk.
                  </span>
                </div>
              )}
            </li>
          </ul>
        )}
      </div>
    );

    return (
      <div className="metrics-section">
        <div className="metrics-header">
          <h3>Embedding Metrics</h3>
        </div>
        <div className="metrics-content">
          <div className="metrics-charts">
            <div className="chart-container lsb-container">
              {renderLSBTable(metricsObj.bpp)}
            </div>
            <div className="chart-container capacity-container">
              <Bar data={capacityData} options={barOptions} />
            </div>
          </div>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">PSNR:</span>
              <span className="metric-value">{metricsObj.psnr.toFixed(2)} dB</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">MSE:</span>
              <span className="metric-value">{metricsObj.mse.toFixed(4)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">SSIM:</span>
              <span className="metric-value">{metricsObj.ssim.toFixed(4)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Bits per Pixel:</span>
              <span className="metric-value">{metricsObj.bpp.toFixed(4)} bpp</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Message Size:</span>
              <span className="metric-value">{formatBytes(metricsObj.message_size)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Total Capacity:</span>
              <span className="metric-value">{formatBytes(metricsObj.capacity)}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Capacity Used:</span>
              <span className="metric-value">
                {((metricsObj.message_size / metricsObj.capacity) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
          {renderMetricsExplanation()}
        </div>
      </div>
    );
  };

  const handleSliderMouseDown = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleSliderMouseMove = (e) => {
    if (!isDragging) return;
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    
    setSliderPosition(percentage);
    container.style.setProperty('--position', `${percentage}%`);
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
  };

  const handleSliderTouchStart = (e) => {
    setIsDragging(true);
    e.preventDefault();
  };

  const handleSliderTouchMove = (e) => {
    if (!isDragging) return;
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    
    setSliderPosition(percentage);
    container.style.setProperty('--position', `${percentage}%`);
  };

  const handleSliderTouchEnd = () => {
    setIsDragging(false);
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
              <div 
                className="image-comparison-container"
                onMouseMove={handleSliderMouseMove}
                onMouseUp={handleSliderMouseUp}
                onMouseLeave={handleSliderMouseUp}
                onTouchMove={handleSliderTouchMove}
                onTouchEnd={handleSliderTouchEnd}
                style={{ '--position': `${sliderPosition}%` }}
              >
                <div className="image-comparison-before">
                  {getImageSrc(room.stego_image) && (
                    <img 
                      src={getImageSrc(room.stego_image)} 
                      alt="stego" 
                      className="protected-image"
                      onContextMenu={preventImageInteraction}
                      onDragStart={preventImageInteraction}
                      onMouseDown={preventImageInteraction}
                    />
                  )}
                </div>
                <div className="image-comparison-after">
                  {getImageSrc(room.cover_image) && (
                    <img src={getImageSrc(room.cover_image)} alt="cover" />
                  )}
                </div>
                <div 
                  className="image-comparison-slider"
                  onMouseDown={handleSliderMouseDown}
                  onTouchStart={handleSliderTouchStart}
                />
                <div className="image-comparison-labels">
                  <span style={{ color: "#6f42c1", fontWeight: "bold" }}>Cover Image</span>
                  <span style={{ color: "#6f42c1", fontWeight: "bold" }}>Stego Image</span>
                </div>
              </div>
            </div>

            {renderMetricsSection(room.metrics)}

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