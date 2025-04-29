import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

function MLSBDemo() {
    const [coverImage, setCoverImage] = useState(null);
    const [messageFile, setMessageFile] = useState(null);
    const [stegoImage, setStegoImage] = useState(null);
    const [extractedMessage, setExtractedMessage] = useState(null);
    const [extractedMediaType, setExtractedMediaType] = useState(null);
    const [embedEncrypted, setEmbedEncrypted] = useState(true);
    const [extractEncrypted, setExtractEncrypted] = useState(true);
    const [embedKey, setEmbedKey] = useState('');
    const [embedIV, setEmbedIV] = useState('');
    const [extractKey, setExtractKey] = useState('');
    const [extractIV, setExtractIV] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [stegoPreview, setStegoPreview] = useState(null);
    const [messageType, setMessageType] = useState('text');

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

    const downloadFile = (content, filename) => {
        const element = document.createElement('a');
        const file = new Blob([content], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleEmbed = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        setMetrics(null);

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
                downloadFile(response.data.key, 'encryption_key.txt');
                downloadFile(response.data.iv, 'encryption_iv.txt');
            }

            const stegoBlob = await fetch(`data:image/png;base64,${response.data.stego_image}`).then(res => res.blob());
            const stegoUrl = URL.createObjectURL(stegoBlob);
            const link = document.createElement('a');
            link.href = stegoUrl;
            link.download = 'stego_image.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(stegoUrl);

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
        setExtractedMessage(null);
        setExtractedMediaType(null);

        const formData = new FormData();
        formData.append('stego_image', stegoImage);
        formData.append('is_encrypted', extractEncrypted);
        if (extractEncrypted) {
            formData.append('key', extractKey);
            formData.append('iv', extractIV);
        }

        try {
            const response = await fetch('http://localhost:5000/api/mlsb/extract', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to extract message');
            }

            setExtractedMessage(data.message);
            setExtractedMediaType(data.media_type);

            // Create download link with correct extension
            const extensionMap = {
                'text': '.txt',
                'image': '.png',
                'audio': '.mp3'
            };
            const ext = extensionMap[data.media_type] || '.bin';
            const filename = `extracted_message${ext}`;
            
            // Download the file
            const downloadUrl = `http://localhost:5000/api/mlsb/download?path=${encodeURIComponent(data.output_path)}`;
            const element = document.createElement('a');
            element.href = downloadUrl;
            element.download = filename;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="mt-4" style={{ maxWidth: '1400px' }}>
            <h2 className="mb-4">MLSB Algorithm Demo</h2>
            <p className="text-muted mb-4">
                This demo showcases the Multi-Layer Least Significant Bit (MLSB) steganography algorithm.
                You can embed messages in images with optional encryption.
            </p>
            
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Row>
                <Col md={6}>
                    <Card className="mb-4" style={{ height: '1000px', width: '800px' }}>
                        <Card.Header className="py-3" style={{ fontSize: '1.5rem' }}>Embed Message</Card.Header>
                        <Card.Body className="p-4">
                            <Form onSubmit={handleEmbed}>
                                <Form.Group className="mb-4">
                                    <Form.Label style={{ fontSize: '1.2rem' }}>Cover Image</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, setCoverImage, setImagePreview)}
                                        required
                                        className="py-3"
                                    />
                                    {imagePreview && (
                                        <div className="mt-3">
                                            <img 
                                                src={imagePreview} 
                                                alt="Cover Preview" 
                                                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                            />
                                        </div>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label style={{ fontSize: '1.2rem' }}>Message File</Form.Label>
                                    <Form.Control
                                        type="file"
                                        onChange={(e) => setMessageFile(e.target.files[0])}
                                        required
                                        className="py-3"
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Check
                                        type="switch"
                                        label={<span style={{ fontSize: '1.2rem' }}>Enable Encryption</span>}
                                        checked={embedEncrypted}
                                        onChange={(e) => setEmbedEncrypted(e.target.checked)}
                                    />
                                </Form.Group>

                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    disabled={loading || !coverImage || !messageFile}
                                    style={{ fontSize: '1.2rem', padding: '0.75rem 1.5rem' }}
                                >
                                    {loading ? 'Processing...' : 'Embed Message'}
                                </Button>
                            </Form>

                            {metrics && (
                                <div className="mt-4">
                                    <h5 style={{ fontSize: '1.2rem' }}>Embedding Metrics:</h5>
                                    <div className="bg-light p-3 rounded">
                                        <p style={{ fontSize: '1.1rem' }}>Max Capacity: {metrics.capacity} bytes</p>
                                        <p style={{ fontSize: '1.1rem' }}>Message Size: {metrics.message_size} bytes</p>
                                        <p style={{ fontSize: '1.1rem' }}>Bits Per Pixel: {metrics.bpp.toFixed(2)}</p>
                                        <p style={{ fontSize: '1.1rem' }}>PSNR: {metrics.psnr.toFixed(2)} dB</p>
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6}>
                    <Card className="mb-4" style={{ height: '1000px', width: '600px' }}>
                        <Card.Header className="py-3" style={{ fontSize: '1.5rem' }}>Extract Message</Card.Header>
                        <Card.Body className="p-4">
                            <Form onSubmit={handleExtract}>
                                <Form.Group className="mb-4">
                                    <Form.Label style={{ fontSize: '1.2rem' }}>Stego Image</Form.Label>
                                    <Form.Control
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, setStegoImage, setStegoPreview)}
                                        required
                                        className="py-3"
                                    />
                                    {stegoPreview && (
                                        <div className="mt-3">
                                            <img 
                                                src={stegoPreview} 
                                                alt="Stego Preview" 
                                                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                                            />
                                        </div>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Check
                                        type="switch"
                                        label={<span style={{ fontSize: '1.2rem' }}>Enable Decryption</span>}
                                        checked={extractEncrypted}
                                        onChange={(e) => setExtractEncrypted(e.target.checked)}
                                    />
                                </Form.Group>

                                {extractEncrypted && (
                                    <>
                                        <Form.Group className="mb-4">
                                            <Form.Label style={{ fontSize: '1.2rem' }}>Encryption Key</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={extractKey}
                                                onChange={(e) => setExtractKey(e.target.value)}
                                                required
                                                className="py-3"
                                                style={{ fontSize: '1.2rem' }}
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-4">
                                            <Form.Label style={{ fontSize: '1.2rem' }}>Initialization Vector (IV)</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={extractIV}
                                                onChange={(e) => setExtractIV(e.target.value)}
                                                required
                                                className="py-3"
                                                style={{ fontSize: '1.2rem' }}
                                            />
                                        </Form.Group>
                                    </>
                                )}

                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    disabled={loading || !stegoImage || (extractEncrypted && (!extractKey || !extractIV))}
                                    style={{ fontSize: '1.2rem', padding: '0.75rem 1.5rem' }}
                                >
                                    {loading ? 'Processing...' : 'Extract Message'}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}

export default MLSBDemo;