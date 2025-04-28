import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import axios from 'axios';

function MLSBDemo() {
    const [coverImage, setCoverImage] = useState(null);
    const [messageFile, setMessageFile] = useState(null);
    const [stegoImage, setStegoImage] = useState(null);
    const [extractedMessage, setExtractedMessage] = useState(null);
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [rounds, setRounds] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [metrics, setMetrics] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [stegoPreview, setStegoPreview] = useState(null);

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

    const handleEmbed = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        setMetrics(null);

        const formData = new FormData();
        formData.append('cover_image', coverImage);
        formData.append('message_file', messageFile);
        formData.append('is_encrypted', isEncrypted);
        formData.append('rounds', rounds);

        try {
            const response = await axios.post('http://localhost:5000/api/mlsb/embed', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setStegoImage(response.data.stego_image);
            setMetrics(response.data.metrics);
            setStegoPreview(`data:image/png;base64,${response.data.stego_image}`);
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

        const formData = new FormData();
        formData.append('stego_image', stegoImage);
        formData.append('is_encrypted', isEncrypted);
        formData.append('rounds', rounds);

        try {
            const response = await axios.post('http://localhost:5000/api/mlsb/extract', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setExtractedMessage(response.data.message);
            setSuccess('Message extracted successfully!');
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const calculateCapacity = async () => {
        if (!coverImage) return;
        
        try {
            const formData = new FormData();
            formData.append('image', coverImage);
            formData.append('rounds', rounds);
            
            const response = await axios.post('http://localhost:5000/api/mlsb/capacity', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMetrics(prev => ({ ...prev, capacity: response.data.capacity }));
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to calculate capacity');
        }
    };

    return (
        <Container className="mt-4" style={{ maxWidth: '1400px' }}>
            <h2 className="mb-4">MLSB Algorithm Demo</h2>
            <p className="text-muted mb-4">
                This demo showcases the Multi-Layer Least Significant Bit (MLSB) steganography algorithm.
                You can embed messages in images with multiple layers and optional encryption.
            </p>
            
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Row>
                <Col md={6}>
                    <Card className="mb-4" style={{ height: '1000px', width: '800px'}}>
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
                                        checked={isEncrypted}
                                        onChange={(e) => setIsEncrypted(e.target.checked)}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label style={{ fontSize: '1.2rem' }}>Number of Layers (1-3)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="3"
                                        value={rounds}
                                        onChange={(e) => setRounds(parseInt(e.target.value))}
                                        className="py-3"
                                        style={{ fontSize: '1.2rem' }}
                                    />
                                </Form.Group>

                                <div className="d-flex justify-content-between mt-4">
                                    <Button 
                                        variant="outline-primary" 
                                        onClick={calculateCapacity}
                                        disabled={!coverImage}
                                        style={{ fontSize: '1.2rem', padding: '0.75rem 1.5rem' }}
                                    >
                                        Calculate Capacity
                                    </Button>
                                    <Button 
                                        variant="primary" 
                                        type="submit" 
                                        disabled={loading || !coverImage || !messageFile}
                                        style={{ fontSize: '1.2rem', padding: '0.75rem 1.5rem' }}
                                    >
                                        {loading ? 'Processing...' : 'Embed Message'}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6}>
                    <Card className="mb-4"  style={{ height: '1000px', width: '600px'}}>
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
                                        checked={isEncrypted}
                                        onChange={(e) => setIsEncrypted(e.target.checked)}
                                    />
                                </Form.Group>

                                <Form.Group className="mb-4">
                                    <Form.Label style={{ fontSize: '1.2rem' }}>Number of Layers</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="3"
                                        value={rounds}
                                        onChange={(e) => setRounds(parseInt(e.target.value))}
                                        className="py-3"
                                        style={{ fontSize: '1.2rem' }}
                                    />
                                </Form.Group>

                                <Button 
                                    variant="primary" 
                                    type="submit" 
                                    disabled={loading || !stegoImage}
                                    className="mt-4"
                                    style={{ fontSize: '1.2rem', padding: '0.75rem 1.5rem' }}
                                >
                                    {loading ? 'Processing...' : 'Extract Message'}
                                </Button>
                            </Form>

                            {extractedMessage && (
                                <div className="mt-4">
                                    <h5 style={{ fontSize: '1.2rem' }}>Extracted Message:</h5>
                                    <pre className="bg-light p-3 rounded" style={{ fontSize: '1.1rem' }}>
                                        {extractedMessage}
                                    </pre>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {metrics && (
                <Card className="mt-4">
                    <Card.Header className="py-3" style={{ fontSize: '1.5rem' }}>Performance Metrics</Card.Header>
                    <Card.Body className="p-4">
                        <Row>
                            {metrics.capacity && (
                                <Col md={6} className="mb-3">
                                    <h6 style={{ fontSize: '1.2rem' }}>Image Capacity</h6>
                                    <p style={{ fontSize: '1.1rem' }}>{metrics.capacity} bytes</p>
                                </Col>
                            )}
                            {metrics.psnr && (
                                <Col md={6} className="mb-3">
                                    <h6 style={{ fontSize: '1.2rem' }}>PSNR (Image Quality)</h6>
                                    <p style={{ fontSize: '1.1rem' }}>{metrics.psnr.toFixed(2)} dB</p>
                                </Col>
                            )}
                            {metrics.bpp && (
                                <Col md={6} className="mb-3">
                                    <h6 style={{ fontSize: '1.2rem' }}>Bits Per Pixel</h6>
                                    <p style={{ fontSize: '1.1rem' }}>{metrics.bpp.toFixed(2)}</p>
                                </Col>
                            )}
                        </Row>
                    </Card.Body>
                </Card>
            )}
        </Container>
    );
}

export default MLSBDemo;