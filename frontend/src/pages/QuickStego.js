import React, { useState } from 'react';
import { Container, Row, Col, Form, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';
import './QuickStego.css';

function QuickStego() {
    const navigate = useNavigate();
    // Embedding states
    const [embedCoverImage, setEmbedCoverImage] = useState(null);
    const [embedMessageFile, setEmbedMessageFile] = useState(null);
    const [embedImagePreview, setEmbedImagePreview] = useState(null);
    const [embedMessagePreview, setEmbedMessagePreview] = useState(null);
    const [embedEncrypted, setEmbedEncrypted] = useState(false);
    const [embedLoading, setEmbedLoading] = useState(false);
    const [embedError, setEmbedError] = useState(null);
    const [embedSuccess, setEmbedSuccess] = useState(null);
    const [stegoImage, setStegoImage] = useState(null);
    const [stegoPreview, setStegoPreview] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [encryptionData, setEncryptionData] = useState(null);

    // Extraction states
    const [extractStegoImage, setExtractStegoImage] = useState(null);
    const [extractStegoPreview, setExtractStegoPreview] = useState(null);
    const [extractEncrypted, setExtractEncrypted] = useState(false);
    const [extractKey, setExtractKey] = useState('');
    const [extractIV, setExtractIV] = useState('');
    const [extractLoading, setExtractLoading] = useState(false);
    const [extractError, setExtractError] = useState(null);
    const [extractSuccess, setExtractSuccess] = useState(null);
    const [extractedMessage, setExtractedMessage] = useState(null);

    // setError
    const [error, setError] = useState(null);

    // Embedding handlers
    const handleEmbedImageUpload = (e) => {
        const file = e.target.files[0];
        const allowedFormats = ['image/png', 'image/tiff', 'image/bmp', 'image/jpeg']

        if (!file || !allowedFormats.includes(file.type)) {
            setError('Invalid format. Please upload a PNG, TIFF, BMP, or JPEG image.');
            e.target.value = null;
            setEmbedCoverImage(null);
            return;
        }        

        setError(null)
        setEmbedCoverImage(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEmbedImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setEmbedImagePreview(null);
        }
    };

    const handleEmbedMessageUpload = (e) => {
        const file = e.target.files[0];
        const allowedFormats = ['text/plain', 'audio/mpeg', 'image/png']

        if (!allowedFormats.includes(file.type) && !file.name.endsWith('.txt')) {
            setError('Invalid file format. Please upload a TXT, MP3, or PNG file.'); 
            e.target.value = null;
            setEmbedMessageFile(null);
            return;
        }

        setError(null)
        setEmbedMessageFile(file);
        
        if (file) {
            const reader = new FileReader();
            
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                reader.onload = (e) => {
                    setEmbedMessagePreview({ type: 'text', content: e.target.result });
                };
                reader.readAsText(file);
            } else {
                reader.onloadend = () => {
                    if (file.type.startsWith('image/')) {
                        setEmbedMessagePreview({ type: 'image', content: reader.result });
                    } else if (file.type.startsWith('audio/')) {
                        setEmbedMessagePreview({ type: 'audio', content: reader.result });
                    } else {
                        setEmbedMessagePreview({ type: 'unknown', name: file.name });
                    }
                };
                reader.readAsDataURL(file);
            }
        } else {
            setEmbedMessagePreview(null);
        }
    };

    const handleEmbed = async (e) => {
        e.preventDefault();
        setEmbedLoading(true);
        setEmbedError(null);
        setEmbedSuccess(null);
        setMetrics(null);
        setEncryptionData(null);

        const formData = new FormData();
        formData.append('cover_image', embedCoverImage);
        formData.append('message_file', embedMessageFile);
        formData.append('is_encrypted', embedEncrypted);

        try {
            const response = await axios.post('http://localhost:5000/api/mlsb/embed', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setStegoImage(response.data.stego_image);
            setMetrics(response.data.metrics);
            setStegoPreview(`data:image/png;base64,${response.data.stego_image}`);
            if (embedEncrypted) {
                setEncryptionData({
                    key: response.data.key,
                    iv: response.data.iv
                });
            }
            setEmbedSuccess('Message embedded successfully!');
        } catch (err) {
            setEmbedError(err.response?.data?.error || 'An error occurred');
        } finally {
            setEmbedLoading(false);
        }
    };

    // Extraction handlers
    const handleExtractStegoImageUpload = (e) => {
        const file = e.target.files[0];
        setExtractStegoImage(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setExtractStegoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setExtractStegoPreview(null);
        }
    };

    const handleExtract = async (e) => {
        e.preventDefault();
        setExtractLoading(true);
        setExtractError(null);
        setExtractSuccess(null);
        setExtractedMessage(null);

        const formData = new FormData();
        formData.append('stego_image', extractStegoImage);
        formData.append('is_encrypted', extractEncrypted);
        if (extractEncrypted) {
            formData.append('key', extractKey);
            formData.append('iv', extractIV);
        }

        try {
            const response = await axios.post('http://localhost:5000/api/mlsb/extract', formData);
            const data = response.data;
            const downloadUrl = `http://localhost:5000/api/mlsb/download?path=${encodeURIComponent(data.output_path)}`;
            const ext = data.media_type === 'text' ? '.txt' : data.media_type === 'image' ? '.png' : '.mp3';
            
            if (data.media_type === 'text') {
                let textContent = '';
                if (data.message) {
                    textContent = typeof data.message === 'string' 
                        ? data.message 
                        : new TextDecoder().decode(new Uint8Array(data.message));
                }
                
                setExtractedMessage({
                    type: 'text',
                    content: textContent || 'Text content extracted',
                    downloadUrl,
                    filename: `extracted_message${ext}`
                });
            } else if (data.media_type === 'image') {
                setExtractedMessage({
                    type: 'image',
                    content: downloadUrl,
                    downloadUrl,
                    filename: `extracted_message${ext}`
                });
            } else if (data.media_type === 'audio') {
                setExtractedMessage({
                    type: 'audio',
                    content: downloadUrl,
                    downloadUrl,
                    filename: `extracted_message${ext}`
                });
            }
            setExtractSuccess('Message extracted successfully!');
        } catch (err) {
            console.error('Extraction error:', err);
            setExtractError(err.response?.data?.error || 'Failed to extract message');
        } finally {
            setExtractLoading(false);
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

    return (
        <div className="quick-stego-container">
            <div className="quick-stego-header">
                <h1 className="quick-stego-title">Quick Stego</h1>
                <button className="back-button" onClick={() => navigate('/dashboard')}>
                    <FiArrowLeft size={20} />
                    Back to Dashboard
                </button>
            </div>
            <p className="quick-stego-description">
                Quickly embed and extract messages using MLSB steganography without saving to database.
            </p>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row>
                {/* Embed Section */}
                <Col md={6}>
                    <div className="stego-card">
                        <div className="stego-card-header">
                            <h4>Embed Message</h4>
                        </div>
                        <div className="stego-card-body">
                            {embedError && <Alert variant="danger">{embedError}</Alert>}
                            {embedSuccess && <Alert variant="success">{embedSuccess}</Alert>}
                            <Form onSubmit={handleEmbed}>
                                <div className="form-group">
                                    <label className="form-label">Cover Image</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept="image/*"
                                        onChange={handleEmbedImageUpload}
                                        required
                                    />
                                    {embedImagePreview && (
                                        <div className="preview-container">
                                            <img 
                                                src={embedImagePreview} 
                                                alt="Cover Preview" 
                                                className="preview-image"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Message File</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        onChange={handleEmbedMessageUpload}
                                        required
                                    />
                                    {embedMessagePreview && (
                                        <div className="preview-container">
                                            {embedMessagePreview.type === 'image' && (
                                                <img src={embedMessagePreview.content} alt="message preview" className="preview-image" />
                                            )}
                                            {embedMessagePreview.type === 'audio' && (
                                                <audio controls className="preview-audio">
                                                    <source src={embedMessagePreview.content} />
                                                </audio>
                                            )}
                                            {embedMessagePreview.type === 'text' && (
                                                <div className="preview-text">
                                                    {embedMessagePreview.content}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="switch-container">
                                    <Form.Check
                                        type="switch"
                                        id="embed-encryption"
                                        label="Enable Encryption"
                                        checked={embedEncrypted}
                                        onChange={(e) => setEmbedEncrypted(e.target.checked)}
                                    />
                                </div>
                                <button 
                                    className="submit-button"
                                    type="submit" 
                                    disabled={embedLoading}
                                >
                                    {embedLoading ? 'Processing...' : 'Embed Message'}
                                </button>
                            </Form>
                            {stegoPreview && (
                                <div className="result-section">
                                    <h5 className="result-title">Result:</h5>
                                    <div className="preview-container">
                                        <img 
                                            src={stegoPreview} 
                                            alt="Stego Preview" 
                                            className="preview-image"
                                        />
                                    </div>
                                    <button 
                                        className="download-button"
                                        onClick={() => handleDownload(`data:image/png;base64,${stegoImage}`, 'stego_image.png')}
                                    >
                                        <FiDownload size={20} />
                                        Download Stego Image
                                    </button>
                                    {encryptionData && (
                                        <>
                                            <button 
                                                className="download-button"
                                                onClick={() => handleDownload(`data:text/plain,${encryptionData.key}`, 'encryption_key.txt')}
                                            >
                                                <FiDownload size={20} />
                                                Download Encryption Key
                                            </button>
                                            <button 
                                                className="download-button"
                                                onClick={() => handleDownload(`data:text/plain,${encryptionData.iv}`, 'encryption_iv.txt')}
                                            >
                                                <FiDownload size={20} />
                                                Download Encryption IV
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                            {metrics && (
                                <div className="result-section">
                                    <h5 className="result-title">Metrics:</h5>
                                    <div className="metrics-container">
                                        <div className="metric-item">
                                            <span className="metric-label">Capacity:</span>
                                            <span className="metric-value">{metrics.capacity.toLocaleString()} bytes</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Message Size:</span>
                                            <span className="metric-value">{metrics.message_size.toLocaleString()} bytes</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">Bits Per Pixel:</span>
                                            <span className="metric-value">{metrics.bpp.toFixed(2)}</span>
                                        </div>
                                        <div className="metric-item">
                                            <span className="metric-label">PSNR:</span>
                                            <span className="metric-value">{metrics.psnr.toFixed(2)} dB</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Col>
                {/* Extract Section */}
                <Col md={6}>
                    <div className="stego-card">
                        <div className="stego-card-header">
                            <h4>Extract Message</h4>
                        </div>
                        <div className="stego-card-body">
                            {extractError && <Alert variant="danger">{extractError}</Alert>}
                            {extractSuccess && <Alert variant="success">{extractSuccess}</Alert>}
                            <Form onSubmit={handleExtract}>
                                <div className="form-group">
                                    <label className="form-label">Stego Image</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept="image/*"
                                        onChange={handleExtractStegoImageUpload}
                                        required
                                    />
                                    {extractStegoPreview && (
                                        <div className="preview-container">
                                            <img 
                                                src={extractStegoPreview} 
                                                alt="Stego Preview" 
                                                className="preview-image"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="switch-container">
                                    <Form.Check
                                        type="switch"
                                        id="extract-encryption"
                                        label="Enable Decryption"
                                        checked={extractEncrypted}
                                        onChange={(e) => setExtractEncrypted(e.target.checked)}
                                    />
                                </div>
                                {extractEncrypted && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Encryption Key</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={extractKey}
                                                onChange={(e) => setExtractKey(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Initialization Vector (IV)</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={extractIV}
                                                onChange={(e) => setExtractIV(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </>
                                )}
                                <button 
                                    className="submit-button"
                                    type="submit" 
                                    disabled={extractLoading}
                                >
                                    {extractLoading ? 'Processing...' : 'Extract Message'}
                                </button>
                            </Form>
                            {extractedMessage && (
                                <div className="result-section">
                                    <h5 className="result-title">Extracted Message:</h5>
                                    <div className="preview-container">
                                        {extractedMessage.type === 'image' && (
                                            <img src={extractedMessage.content} alt="extracted" className="preview-image" />
                                        )}
                                        {extractedMessage.type === 'audio' && (
                                            <audio controls className="preview-audio">
                                                <source src={extractedMessage.content} />
                                            </audio>
                                        )}
                                        {extractedMessage.type === 'text' && (
                                            <div className="preview-text">
                                                {extractedMessage.content}
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        className="download-button"
                                        onClick={() => handleDownload(extractedMessage.downloadUrl, extractedMessage.filename)}
                                    >
                                        <FiDownload size={20} />
                                        Download Extracted Message
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </Col>
            </Row>
            {(embedLoading || extractLoading) && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                        <p className="loading-text">
                            {extractLoading ? 'Extracting message, please wait...' : 'Embedding message, please wait...'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default QuickStego; 