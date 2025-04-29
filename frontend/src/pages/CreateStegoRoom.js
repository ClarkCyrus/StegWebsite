import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Card, Modal, Alert } from 'react-bootstrap';
import axios from 'axios';

function CreateStegoRoom() {
  const [name, setName] = useState('');
  const [encrypted, setEncrypted] = useState(false);
  const [storeKey, setStoreKey] = useState(false);
  const [coverImage, setCoverImage] = useState(null);
  const [messageFile, setMessageFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [messagePreview, setMessagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const navigate = useNavigate();

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
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
      setShowModal(true);
    } catch (err) {
      setError('Failed to create stego room');
    } finally {
      setLoading(false);
    }
  };

  const handleStegoDownload = (base64Data) => {
    const stegoBlob = fetch(`data:image/png;base64,${base64Data}`).then(res => res.blob()).then(blob => {
      const stegoUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = stegoUrl;
      link.download = 'stego_image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(stegoUrl);
    });
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

  return (
    <Container className="mt-4" style={{ maxWidth: '900px' }}>
      <h2 className="mb-4">CREATE STEGO ROOM</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Row>
          <Col md={6}>
            <Form.Group className="mb-4">
              <Form.Label>Name</Form.Label>
              <Form.Control value={name} onChange={e => setName(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Check type="switch" label="Encrypted?" checked={encrypted} onChange={e => setEncrypted(e.target.checked)} />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Check type="switch" label="Store encryption key in database?" checked={storeKey} onChange={e => setStoreKey(e.target.checked)} />
            </Form.Group>
            <Button type="submit" variant="primary" disabled={loading} style={{ width: '150px', height: '50px', fontSize: '1.2rem' }}>
              {loading ? 'Creating...' : 'Create!'}
            </Button>
          </Col>
          <Col md={6}>
            <Card className="mb-4" style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Form.Group>
                <Form.Label>*Upload cover image here</Form.Label>
                <Form.Control type="file" accept="image/*" onChange={handleCoverChange} required />
                {coverPreview && <img src={coverPreview} alt="cover preview" style={{ maxWidth: '100%', maxHeight: '120px', marginTop: 8 }} />}
              </Form.Group>
            </Card>
            <Card style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Form.Group>
                <Form.Label>*Upload message file here</Form.Label>
                <Form.Control type="file" onChange={handleMessageChange} required />
                {messagePreview && (
                  <div style={{ marginTop: 8, maxHeight: 120, overflow: 'auto', width: '100%', textAlign: 'center' }}>
                    {messagePreview.type === 'image' && (
                      <img src={messagePreview.content} alt="message preview" style={{ maxWidth: '100%', maxHeight: '100px' }} />
                    )}
                    {messagePreview.type === 'audio' && (
                      <audio controls style={{ width: '100%', maxWidth: '250px' }}>
                        <source src={messagePreview.content} />
                      </audio>
                    )}
                    {messagePreview.type === 'text' && (
                      <div style={{ maxHeight: '100px', overflow: 'auto', textAlign: 'left', padding: '8px', background: '#f8f9fa', borderRadius: '4px' }}>
                        {messagePreview.content.length > 200 
                          ? `${messagePreview.content.substring(0, 200)}...` 
                          : messagePreview.content}
                      </div>
                    )}
                    {messagePreview.type === 'unknown' && (
                      <span>File selected: {messagePreview.name}</span>
                    )}
                  </div>
                )}
              </Form.Group>
            </Card>
          </Col>
        </Row>
      </Form>
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Stego Room Created</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={4}>
              <Button className="mb-3 w-100" variant="success" onClick={() => handleStegoDownload(modalData?.stego_image)}>Download stego image</Button>
              {encrypted && (
                <>
                  <Button className="mb-3 w-100" variant="info" onClick={() => handleTextDownload(modalData?.key, 'encryption_key.txt')}>Download encryption key</Button>
                  <Button className="mb-3 w-100" variant="info" onClick={() => handleTextDownload(modalData?.iv, 'encryption_iv.txt')}>Download encryption IV</Button>
                  {!storeKey && <Alert variant="warning">You must download the encryption key and IV. They will not be stored in the database.</Alert>}
                </>
              )}
            </Col>
            <Col md={8}>
              <Row>
                <Col md={6}>
                  <Card className="mb-3" style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span>*Cover Image</span>
                    {modalData?.coverPreview && <img src={modalData.coverPreview} alt="cover preview" style={{ maxWidth: '100%', maxHeight: '100px' }} />}
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="mb-3" style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span>*Stegoed Image</span>
                    {modalData?.stego_image && <img src={`data:image/png;base64,${modalData.stego_image}`} alt="stego preview" style={{ maxWidth: '100%', maxHeight: '100px' }} />}
                  </Card>
                </Col>
              </Row>
              <Card style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {modalData?.metrics && (
                  <div style={{ fontSize: 14, marginTop: 8 }}>
                    {(() => {
                      let metricsObj = modalData.metrics;
                      if (typeof metricsObj === 'string') {
                        try { metricsObj = JSON.parse(metricsObj); } catch { metricsObj = {}; }
                      }
                      return (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {Object.entries(metricsObj).map(([k, v]) => (
                            <li key={k}><b>{k}:</b> {typeof v === 'number' ? v.toFixed(2) : v}</li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Modal.Body>
      </Modal>
    </Container>
  );
}

export default CreateStegoRoom; 