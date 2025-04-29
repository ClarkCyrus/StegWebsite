import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function QuickStego() {
    const navigate = useNavigate();
    const [coverImage, setCoverImage] = useState(null);
    const [messageFile, setMessageFile] = useState(null);
    const [stegoImage, setStegoImage] = useState(null);
    const [extractedMessage, setExtractedMessage] = useState(null);
    const [embedEncrypted, setEmbedEncrypted] = useState(false);
    const [extractEncrypted, setExtractEncrypted] = useState(false);
    const [extractKey, setExtractKey] = useState('');
    const [extractIV, setExtractIV] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [stegoPreview, setStegoPreview] = useState(null);
    const [messagePreview, setMessagePreview] = useState(null);
    const [encryptionData, setEncryptionData] = useState(null);

    const handleImageUpload = (e, setImage, setPreview) => {
        const file = e.target.files[0];
        setImage(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMessageUpload = (e) => {
        const file = e.target.files[0];
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

    const handleEmbed = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        setMetrics(null);
        setEncryptionData(null);

        const formData = new FormData();
        formData.append('cover_image', coverImage);
        formData.append('message_file', messageFile);
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

            setSuccess('Message embedded successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleExtract = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        setExtractedMessage(null);

        const formData = new FormData();
        formData.append('stego_image', stegoImage);
        formData.append('is_encrypted', extractEncrypted);
        if (extractEncrypted) {
            formData.append('key', extractKey);
            formData.append('iv', extractIV);
        }

        try {
            const response = await axios.post('http://localhost:5000/api/mlsb/extract', formData);
            const data = response.data;

            // Create preview based on media type
            const downloadUrl = `http://localhost:5000/api/mlsb/download?path=${encodeURIComponent(data.output_path)}`;
            const ext = data.media_type === 'text' ? '.txt' : data.media_type === 'image' ? '.png' : '.mp3';
            
            if (data.media_type === 'text') {
                setExtractedMessage({
                    type: 'text',
                    content: typeof data.message === 'string' ? data.message : 'Text content extracted',
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

            setSuccess('Message extracted successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to extract message');
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
            {success && <Alert variant="success">{success}</Alert>}

            <Row>
                {/* Embed Section */}
                <Col md={6}>
                    <Card style={{ background: '#232428', color: '#fff', marginBottom: '2rem' }}>
                        <Card.Header className="py-3">
                            <h4 className="mb-0">Embed Message</h4>
                        </Card.Header>
                        <Card.Body className="p-4">
                            <Form onSubmit={handleEmbed}>
                                <Form.Group className="mb-4">
                                    <Form.Label>Cover Image</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, setCoverImage, setImagePreview)}
                                        required
                                    />
                                    {imagePreview && (
                                        <div className="mt-3">
                                            <img 
                                                src={imagePreview} 
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
                                        onChange={handleMessageUpload}
                                        required
                                    />
                                    {messagePreview && (
                                        <div className="mt-3">
                                            {messagePreview.type === 'image' && (
                                                <img src={messagePreview.content} alt="message preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                                            )}
                                            {messagePreview.type === 'audio' && (
                                                <audio controls style={{ width: '100%' }}>
                                                    <source src={messagePreview.content} />
                                                </audio>
                                            )}
                                            {messagePreview.type === 'text' && (
                                                <div style={{ maxHeight: '200px', overflow: 'auto', padding: '8px', background: '#2a2b2f', borderRadius: '4px' }}>
                                                    {messagePreview.content}
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
                                    disabled={loading}
                                    className="w-100"
                                >
                                    {loading ? 'Processing...' : 'Embed Message'}
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
                            <Form onSubmit={handleExtract}>
                                <Form.Group className="mb-4">
                                    <Form.Label>Stego Image</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, setStegoImage, setStegoPreview)}
                                        required
                                    />
                                    {stegoPreview && (
                                        <div className="mt-3">
                                            <img 
                                                src={stegoPreview} 
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
                                    disabled={loading}
                                    className="w-100"
                                >
                                    {loading ? 'Processing...' : 'Extract Message'}
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
        </Container>
    );
}

export default QuickStego; 