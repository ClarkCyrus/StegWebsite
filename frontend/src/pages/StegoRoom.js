import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import axios from 'axios';

function StegoRoom() {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [stegoUpload, setStegoUpload] = useState(null);
  const [key, setKey] = useState('');
  const [iv, setIV] = useState('');
  const [message, setMessage] = useState(null);
  const [messagePreview, setMessagePreview] = useState(null);
  const [error, setError] = useState(null);

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
      return;
    }
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
    <Container fluid style={{ background: '#18191c', minHeight: '100vh', color: '#fff', padding: 40 }}>
      {error && <Alert variant="danger">{error}</Alert>}
      {room && (
        <div>
          <h3 style={{ color: '#fff', marginBottom: 24 }}>{room.name}</h3>
          <Row className="mb-4">
            <Col md={6}>
              <Card style={{ height: '180px', background: '#232428', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontWeight: 600 }}>*Cover Image</span>
                  {getImageSrc(room.cover_image) && <img src={getImageSrc(room.cover_image)} alt="cover" style={{ maxWidth: '100%', maxHeight: '120px', marginTop: 8 }} />}
                </div>
              </Card>
            </Col>
            <Col md={6}>
              <Card style={{ height: '180px', background: '#232428', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontWeight: 600 }}>*Stegoed Image</span>
                  {getImageSrc(room.stego_image) && <img src={getImageSrc(room.stego_image)} alt="stego" style={{ maxWidth: '100%', maxHeight: '120px', marginTop: 8 }} />}
                </div>
              </Card>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col>
              <Card style={{ minHeight: '100px', background: '#232428', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%', padding: '16px' }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>metrics</div>
                  <div style={{ fontSize: 14, marginTop: 8 }}>
                    {(() => {
                      let metricsObj = room.metrics;
                      if (typeof metricsObj === 'string') {
                        try {
                          // First replace np.float64(...) with just the number
                          metricsObj = metricsObj.replace(/np\.float64\(([\d.]+)\)/g, '$1');
                          // Then parse the cleaned string as JSON
                          metricsObj = JSON.parse(metricsObj.replace(/'/g, '"'));
                        } catch (e) {
                          console.error('Error parsing metrics:', e);
                          metricsObj = {};
                        }
                      }
                      return (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'center' }}>
                          {Object.entries(metricsObj).map(([k, v]) => (
                            <li key={k} style={{ marginBottom: 4 }}>
                              <b style={{ marginRight: 8 }}>{k}:</b>
                              {typeof v === 'number' ? 
                                k === 'capacity' || k === 'message_size' ? 
                                  v.toLocaleString() : 
                                  v.toFixed(2)
                                : v}
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col md={2} className="d-flex align-items-center">
              <Form.Check type="switch" label="is_encrypted" checked={room.is_encrypted} disabled style={{ color: '#fff' }} />
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label style={{ color: '#fff' }}>Key</Form.Label>
                <Form.Control value={key} disabled={!room.is_encrypted} onChange={e => setKey(e.target.value)} style={{ background: '#232428', color: '#fff' }} />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label style={{ color: '#fff' }}>IV</Form.Label>
                <Form.Control value={iv} disabled={!room.is_encrypted} onChange={e => setIV(e.target.value)} style={{ background: '#232428', color: '#fff' }} />
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col md={4}>
              <Form.Group>
                <Form.Label style={{ color: '#fff' }}>*upload stego image</Form.Label>
                <Form.Control type="file" onChange={handleStegoUpload} style={{ background: '#232428', color: '#fff' }} />
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button variant="primary" onClick={handleGetMessage} style={{ width: '100%' }}>Get message!</Button>
            </Col>
            <Col md={6} className="d-flex align-items-end">
              {messagePreview && (
                <Card style={{ width: '100%', background: '#232428', color: '#fff', padding: '16px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 600 }}>Extracted Message Preview</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100px' }}>
                    <div style={{ marginBottom: '16px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                      {messagePreview.type === 'image' && (
                        <img src={messagePreview.content} alt="extracted preview" style={{ maxWidth: '100%', maxHeight: '200px' }} />
                      )}
                      {messagePreview.type === 'audio' && (
                        <audio controls style={{ width: '100%', maxWidth: '250px' }}>
                          <source src={messagePreview.content} />
                        </audio>
                      )}
                      {messagePreview.type === 'text' && (
                        <div style={{ maxHeight: '200px', overflow: 'auto', width: '100%', textAlign: 'left', padding: '8px', background: '#2a2b2f', borderRadius: '4px' }}>
                          {messagePreview.content}
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="success" 
                      onClick={() => handleDownload(messagePreview.downloadUrl, messagePreview.filename)}
                      style={{ width: 'auto', padding: '8px 24px' }}
                    >
                      Download Message
                    </Button>
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        </div>
      )}
    </Container>
  );
}

export default StegoRoom; 