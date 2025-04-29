import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import axios from 'axios';
import { BsLockFill, BsLock } from 'react-icons/bs';

function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/api/steg_rooms', { withCredentials: true })
      .then(res => setRooms(res.data))
      .catch(() => setRooms([]));
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/logout', {}, { withCredentials: true });
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>DASHBOARD</h2>
        <Button variant="outline-danger" onClick={handleLogout}>
          Logout
        </Button>
      </div>
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
              <Card.Footer className="d-flex justify-content-between align-items-center" style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{room.name || 'blahblah'}</span>
                <span className="d-flex align-items-center" style={{ gap: 8 }}>
                  {!room.is_encrypted ? (
                    <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: '#28a745' }} title="Unencrypted steg image"></span>
                  ) : (
                    <>
                      <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', background: '#dc3545' }} title="Encrypted steg image"> </span>
                      {room.is_key_stored ? (
                        <BsLockFill style={{ color: '#dc3545', marginLeft: 4 }} title="Key stored on website" />
                      ) : (
                        <BsLock style={{ color: '#dc3545', marginLeft: 4 }} title="Key stored locally only" />
                      )}
                    </>
                  )}
                </span>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
      <div style={{
        position: 'fixed',
        left: '50%',
        bottom: '32px',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: '32px',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
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