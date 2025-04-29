import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import axios from 'axios';

function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/api/steg_rooms', { withCredentials: true })
      .then(res => setRooms(res.data))
      .catch(() => setRooms([]));
  }, []);

  const getCoverImageSrc = (room) => {
    if (!room.cover_image) return null;
    const normalized = room.cover_image.replace(/\\/g, '/');
    if (normalized.startsWith('data:image')) return normalized;
    if (normalized.match(/^[A-Za-z0-9+/=]+$/)) return `data:image/png;base64,${normalized}`;
    if (normalized.startsWith('uploads/')) return `http://localhost:5000/${normalized}`;
    if (!normalized.startsWith('http') && !normalized.startsWith('/uploads/')) return `http://localhost:5000/uploads/${normalized}`;
    return normalized;
  };

  return (
    <Container className="mt-4" style={{ maxWidth: '1200px' }}>
      <h2 className="mb-4">DASHBOARD</h2>
      <Row className="mb-5">
        {rooms.map((room, idx) => (
          <Col key={room.id} md={4} className="mb-4 d-flex justify-content-center">
            <Card
              style={{ width: '220px', height: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => navigate(`/room/${room.id}`)}
            >
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {getCoverImageSrc(room) ? (
                  <img src={getCoverImageSrc(room)} alt="cover" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'contain' }} />
                ) : (
                  <span>*Image</span>
                )}
              </div>
              <Card.Footer className="text-center" style={{ fontWeight: 'bold', fontSize: '1rem' }}>{room.name || 'blahblah'}</Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
      <div className="d-flex justify-content-center gap-4">
        <Button
          variant="outline-primary"
          style={{ borderRadius: '50%', width: '100px', height: '100px', fontSize: '1.1rem' }}
          onClick={() => navigate('/create')}
        >
          Create<br />Stego<br />Image
        </Button>
        <Button
          variant="outline-success"
          style={{ borderRadius: '50%', width: '100px', height: '100px', fontSize: '1.1rem' }}
          onClick={() => navigate('/quick-stego')}
        >
          Quick<br />Stego
        </Button>
      </div>
    </Container>
  );
}

export default Dashboard; 