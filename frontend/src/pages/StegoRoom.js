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
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5000/api/stegorooms/${roomId}`, { withCredentials: true })
      .then(res => {
        setRoom(res.data.room);
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
      // Download logic
      const extensionMap = {
        'text': '.txt',
        'image': '.png',
        'audio': '.mp3'
      };
      const ext = extensionMap[data.media_type] || '.bin';
      const filename = `extracted_message${ext}`;
      const downloadUrl = `http://localhost:5000/api/mlsb/download?path=${encodeURIComponent(data.output_path)}`;
      const element = document.createElement('a');
      element.href = downloadUrl;
      element.download = filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      setError(err.message);
    }
  };

  const getImageSrc = (img) => {
    if (!img) return null;
    if (img.startsWith('data:image')) return img;
    if (img.match(/^[A-Za-z0-9+/=]+$/)) return `data:image/png;base64,${img}`;
    if (img.startsWith('/')) return `http://localhost:5000${img}`;
    if (img.startsWith('uploads/')) return `http://localhost:5000/${img}`;
    return null;
  };

  return (
    <Container fluid style={{ background: '#18191c', minHeight: '100vh', color: '#fff', padding: 40 }}>
      {error && <Alert variant="danger">{error}</Alert>}
      {room && (
        <div>
          <h3 style={{ color: '#fff', marginBottom: 24 }}>{room.name}</h3>
          <Row className="mb-4">
            <Col md={6}>
              <Card style={{ height: '220px', background: '#232428', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div>cover image</div>
                  {getImageSrc(room.cover_image) && <img src={getImageSrc(room.cover_image)} alt="cover" style={{ maxWidth: '100%', maxHeight: '120px', marginTop: 8 }} />}
                </div>
              </Card>
            </Col>
            <Col md={6}>
              <Card style={{ height: '220px', background: '#232428', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div>stego image</div>
                  {getImageSrc(room.stego_image) && <img src={getImageSrc(room.stego_image)} alt="stego" style={{ maxWidth: '100%', maxHeight: '120px', marginTop: 8 }} />}
                </div>
              </Card>
            </Col>
          </Row>
          <Row className="mb-4">
            <Col>
              <Card style={{ height: '120px', background: '#232428', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '100%' }}>
                  <div>metrics</div>
                  <div style={{ fontSize: 13 }}>{room.metrics}</div>
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
              {message && <Alert variant="success" style={{ width: '100%' }}>{message}</Alert>}
            </Col>
          </Row>
        </div>
      )}
    </Container>
  );
}

export default StegoRoom; 