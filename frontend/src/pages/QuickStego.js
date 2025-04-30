import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
            setError('Invalid format. Please upload a PNG, TIFF, BMP, or JPEG image.'); // Set error message
            e.target.value = null; // Clear invalid input
            setEmbedCoverImage(null); // Clear state
            return; // Stop further execution
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
        const allowedFormats = ['text/plain', 'audio/mpeg', 'image/png'] // MIME

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
            
            // Handle text files differently
            if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                reader.onload = (e) => {
                    setEmbedMessagePreview({ type: 'text', content: e.target.result });
                };
                reader.readAsText(file);
            } else {
                // Handle other file types
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
        <Container className="mt-4" style={{ maxWidth: '1200px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Quick Stego</h2>
                <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
                    Back to Dashboard
                </Button>
            </div>
            <p className="text-muted mb-4">
                Quickly embed and extract messages using MLSB steganography without saving to database.
            </p>
            {error && <Alert variant="danger">{error}</Alert>}
            <Row>
                {/* Embed Section */}
                <Col md={6}>
                    <Card style={{ background: '#232428', color: '#fff', marginBottom: '2rem' }}>
                        <Card.Header className="py-3">
                            <h4 className="mb-0">Embed Message</h4>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {embedError && <Alert variant="danger">{embedError}</Alert>}
                            {embedSuccess && <Alert variant="success">{embedSuccess}</Alert>}
                            <Form onSubmit={handleEmbed}>
                                <Form.Group className="mb-4">
                                    <Form.Label>Cover Image</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={handleEmbedImageUpload}
                                        required
                                    />
                                    {embedImagePreview && (
                                        <div className="mt-3">
                                            <img 
                                                src={embedImagePreview} 
                                                alt="Cover Preview" 
                                                style={{ maxWidth: '100%', maxHeight: '200px' }}
                                            />
                                        </div>
                                    )}
                                </Form.Group>
                                <Form.Group className="mb-4">
                                    <Form.Label>Message File</Form.Label>
                                    <Form.Control
                                        type="file"
                                        onChange={handleEmbedMessageUpload}
                                        required
                                    />
                                    {embedMessagePreview && (
                                        <div className="mt-3">
                                            {embedMessagePreview.type === 'image' && (
                                                <img src={embedMessagePreview.content} alt="message preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                                            )}
                                            {embedMessagePreview.type === 'audio' && (
                                                <audio controls style={{ width: '100%' }}>
                                                    <source src={embedMessagePreview.content} />
                                                </audio>
                                            )}
                                            {embedMessagePreview.type === 'text' && (
                                                <div style={{ maxHeight: '200px', overflow: 'auto', padding: '8px', background: '#2a2b2f', borderRadius: '4px' }}>
                                                    {embedMessagePreview.content}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Form.Group>
                                <Form.Group className="mb-4">
                                    <Form.Check
                                        type="switch"
                                        label="Enable Encryption"
                                        checked={embedEncrypted}
                                        onChange={(e) => setEmbedEncrypted(e.target.checked)}
                                    />
                                </Form.Group>
                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    disabled={embedLoading}
                                    className="w-100"
                                >
                                    {embedLoading ? 'Processing...' : 'Embed Message'}
                                </Button>
                            </Form>
                            {stegoPreview && (
                                <div className="mt-4">
                                    <h5>Result:</h5>
                                    <img 
                                        src={stegoPreview} 
                                        alt="Stego Preview" 
                                        style={{ maxWidth: '100%', marginBottom: '1rem' }}
                                    />
                                    <Button 
                                        variant="success" 
                                        onClick={() => handleDownload(`data:image/png;base64,${stegoImage}`, 'stego_image.png')}
                                        className="w-100 mb-3"
                                    >
                                        Download Stego Image
                                    </Button>
                                    {encryptionData && (
                                        <>
                                            <Button 
                                                variant="info" 
                                                onClick={() => handleDownload(`data:text/plain,${encryptionData.key}`, 'encryption_key.txt')}
                                                className="w-100 mb-2"
                                            >
                                                Download Encryption Key
                                            </Button>
                                            <Button 
                                                variant="info" 
                                                onClick={() => handleDownload(`data:text/plain,${encryptionData.iv}`, 'encryption_iv.txt')}
                                                className="w-100"
                                            >
                                                Download Encryption IV
                                            </Button>
                                        </>
                                    )}
                                </div>
                            )}
                            {metrics && (
                                <div className="mt-4">
                                    <h5>Metrics:</h5>
                                    <div className="bg-dark p-3 rounded">
                                        <p className="mb-2">Capacity: {metrics.capacity.toLocaleString()} bytes</p>
                                        <p className="mb-2">Message Size: {metrics.message_size.toLocaleString()} bytes</p>
                                        <p className="mb-2">Bits Per Pixel: {metrics.bpp.toFixed(2)}</p>
                                        <p className="mb-0">PSNR: {metrics.psnr.toFixed(2)} dB</p>
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
                {/* Extract Section */}
                <Col md={6}>
                    <Card style={{ background: '#232428', color: '#fff' }}>
                        <Card.Header className="py-3">
                            <h4 className="mb-0">Extract Message</h4>
                        </Card.Header>
                        <Card.Body className="p-4">
                            {extractError && <Alert variant="danger">{extractError}</Alert>}
                            {extractSuccess && <Alert variant="success">{extractSuccess}</Alert>}
                            <Form onSubmit={handleExtract}>
                                <Form.Group className="mb-4">
                                    <Form.Label>Stego Image</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={handleExtractStegoImageUpload}
                                        required
                                    />
                                    {extractStegoPreview && (
                                        <div className="mt-3">
                                            <img 
                                                src={extractStegoPreview} 
                                                alt="Stego Preview" 
                                                style={{ maxWidth: '100%', maxHeight: '200px' }}
                                            />
                                        </div>
                                    )}
                                </Form.Group>
                                <Form.Group className="mb-4">
                                    <Form.Check
                                        type="switch"
                                        label="Enable Decryption"
                                        checked={extractEncrypted}
                                        onChange={(e) => setExtractEncrypted(e.target.checked)}
                                    />
                                </Form.Group>
                                {extractEncrypted && (
                                    <>
                                        <Form.Group className="mb-4">
                                            <Form.Label>Encryption Key</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={extractKey}
                                                onChange={(e) => setExtractKey(e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-4">
                                            <Form.Label>Initialization Vector (IV)</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={extractIV}
                                                onChange={(e) => setExtractIV(e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                    </>
                                )}
                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    disabled={extractLoading}
                                    className="w-100"
                                >
                                    {extractLoading ? 'Processing...' : 'Extract Message'}
                                </Button>
                            </Form>
                            {extractedMessage && (
                                <div className="mt-4">
                                    <h5>Extracted Message:</h5>
                                    <Card style={{ background: '#2a2b2f', marginBottom: '1rem' }}>
                                        <Card.Body>
                                            {extractedMessage.type === 'image' && (
                                                <img src={extractedMessage.content} alt="extracted" style={{ maxWidth: '100%' }} />
                                            )}
                                            {extractedMessage.type === 'audio' && (
                                                <audio controls style={{ width: '100%' }}>
                                                    <source src={extractedMessage.content} />
                                                </audio>
                                            )}
                                            {extractedMessage.type === 'text' && (
                                                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                                                    {extractedMessage.content}
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                    <Button 
                                        variant="success" 
                                        onClick={() => handleDownload(extractedMessage.downloadUrl, extractedMessage.filename)}
                                        className="w-100"
                                    >
                                        Download Extracted Message
                                    </Button>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
            {/* Loading overlay: always rendered on top but only visible when loading === true */}
            {(embedLoading || extractLoading)  && (
                <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)', // A slightly transparent overlay, so underlying buttons are still visible
                    zIndex: 9999
                }}
                >
                <div
                    style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)', // semi-transparent white container
                    padding: '20px',
                    borderRadius: '8px',
                    textAlign: 'center'
                    }}
                >
                    <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                    </div>
                    <p style={{ margin: 0 }}>
                    {extractLoading
                        ? 'Extracting message, please wait...'
                        : 'Embedding message, please wait...'}
                    </p>
                </div>
                </div>
            )}
        </Container>
    );
}

export default QuickStego; 