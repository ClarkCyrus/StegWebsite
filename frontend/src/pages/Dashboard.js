import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, OverlayTrigger, Tooltip, Row, Col, Card, Modal, Button, Form, InputGroup } from 'react-bootstrap';
import axios from 'axios';
import { BsLockFill, BsLock, BsPlusCircle, BsLightningCharge, BsSearch, BsSortDown, BsSortUp } from 'react-icons/bs';
import { FiLogOut, FiX } from 'react-icons/fi';
import './Dashboard.css';
import { useAuth } from './AuthContext'; 
import config from '../config';

function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    encrypted: false,
    unencrypted: false,
    keyStored: false,
    keyNotStored: false
  });
  const [sortOrder, setSortOrder] = useState('asc');
  const [showKeyFilters, setShowKeyFilters] = useState(false);
  const navigate = useNavigate();

  const { logout } = useAuth();

  useEffect(() => {
    axios.get(`${config.API_BASE_URL}/api/steg_rooms`, { withCredentials: true })
      .then(res => setRooms(res.data))
      .catch(() => setRooms([]));

    axios.get(`${config.API_BASE_URL}/api/current_user`, { withCredentials: true })  
    .then(res => setCurrentUser(res.data))
    .catch(() => setCurrentUser(null));
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post(`${config.API_BASE_URL}/api/logout`, {}, { withCredentials: true });
      logout(); 
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
    
    // Handle full paths that include uploads directory
    if (normalized.includes('/uploads/')) {
      const filename = normalized.split('/').pop();
      return `${config.API_BASE_URL}/uploads/${filename}`;
    }
    
    if (normalized.startsWith('uploads/')) return `${config.API_BASE_URL}/${normalized}`;
    if (!normalized.startsWith('http')) return `${config.API_BASE_URL}/uploads/${normalized.replace('uploads/', '')}`;
    
    return normalized;
  };

  const handleDelete = (room) => {
    setRoomToDelete(room);
    setShowModal(true); 
  };

  const confirmDelete = () => {
    if (roomToDelete) {
      axios.delete(`${config.API_BASE_URL}/api/steg_rooms/${roomToDelete.id}`, { withCredentials: true })
        .then(() => {
          setRooms(rooms.filter(r => r.id !== roomToDelete.id));
          setShowModal(false);
          setRoomToDelete(null); 
        })
        .catch(err => console.error('Failed to delete room:', err));
    }
  };

  const handleFilterChange = (filter) => {
    setFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }));
  };

  const filteredAndSortedRooms = rooms
    .filter(room => {
      const matchesSearch = room.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEncryption = 
        (filters.encrypted && room.is_encrypted) ||
        (filters.unencrypted && !room.is_encrypted) ||
        (!filters.encrypted && !filters.unencrypted);
      const matchesKeyStorage = 
        (filters.keyStored && room.is_key_stored) ||
        (filters.keyNotStored && !room.is_key_stored) ||
        (!filters.keyStored && !filters.keyNotStored);
      
      return matchesSearch && matchesEncryption && matchesKeyStorage;
    })
    .sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return sortOrder === 'asc' 
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">StegX Dashboard</h1>
        <div className="user-info">
          {currentUser && (
            <span className="user-email">{currentUser.email}</span>
          )}
          <button className="logout-button" onClick={handleLogout}>
            <FiLogOut size={20} />
          </button>
        </div>
      </div>

      <div className="search-and-filters">
        <div className="search-section">
          <InputGroup className="search-input-group">
            <InputGroup.Text className="search-icon">
              <BsSearch />
            </InputGroup.Text>
            <Form.Control
              className="search-input"
              placeholder="Search rooms by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button
              className="sort-button"
              variant="outline-secondary"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Sort A-Z' : 'Sort Z-A'}
            >
              {sortOrder === 'asc' ? <BsSortUp /> : <BsSortDown />}
            </Button>
          </InputGroup>
        </div>

        <div className="filter-section">
          <div className="filter-options">
            <Button
              variant={filters.encrypted ? "primary" : "outline-primary"}
              className="filter-button"
              onClick={() => {
                handleFilterChange('encrypted');
                setShowKeyFilters(!filters.encrypted);
                if (!filters.encrypted) {
                  setFilters(prev => ({
                    ...prev,
                    keyStored: false,
                    keyNotStored: false
                  }));
                }
              }}
            >
              Encrypted
            </Button>
            <Button
              variant={filters.unencrypted ? "primary" : "outline-primary"}
              className="filter-button"
              onClick={() => handleFilterChange('unencrypted')}
            >
              Unencrypted
            </Button>
            {showKeyFilters && (
              <>
                <Button
                  variant={filters.keyStored ? "primary" : "outline-primary"}
                  className="filter-button"
                  onClick={() => handleFilterChange('keyStored')}
                >
                  Key Stored
                </Button>
                <Button
                  variant={filters.keyNotStored ? "primary" : "outline-primary"}
                  className="filter-button"
                  onClick={() => handleFilterChange('keyNotStored')}
                >
                  Key Not Stored
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {filteredAndSortedRooms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-content">
            <BsPlusCircle size={80} className="empty-state-icon" />
            <h2>No Stego Rooms Yet</h2>
            <p>Start by creating your first stego room to hide messages in images</p>
            <Button 
              variant="primary" 
              className="create-first-button"
              onClick={() => navigate('/create')}
            >
              Create Your First Stego Room
            </Button>
          </div>
        </div>
      ) : (
      <Row className="g-1 card-row">
          {filteredAndSortedRooms.map((room) => (
          <Col key={room.id} md={3} className="mb-2 px-1">
            <Card className="room-card" onClick={() => navigate(`/room/${room.id}`)}>
              <div className="room-image-container">
                {getCoverImageSrc(room) ? (
                  <img src={getCoverImageSrc(room)} alt="cover" className="room-image" />
                ) : (
                  <span>No Image</span>
                )}
                <button
                  className="close-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(room); 
                  }}
                >
                  <FiX size={14} />
                </button>
              </div>
              <div className="room-footer">
                <div className="d-flex justify-content-between align-items-center">
                  <h3 className="room-name">{room.name || 'Untitled'}</h3>
                  <div className="encryption-status">
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          {room.is_encrypted ? 'Encryption enabled' : 'Encryption disabled'}
                        </Tooltip>
                     }
                    >
                      <div className={`status-dot ${room.is_encrypted ? 'encrypted' : 'unencrypted'}`} />
                    </OverlayTrigger>
                    {room.is_encrypted && (
                      <OverlayTrigger
                        placement="top"
                        overlay={
                          <Tooltip>
                            {room.is_key_stored ? 'Key is stored' : 'Key is not stored'}
                          </Tooltip>
                        }
                      >
                      {room.is_key_stored ? (
                        <BsLockFill color="var(--danger-color)" size={16} />
                      ) : (
                        <BsLock color="var(--danger-color)" size={16} />
                      )}
                      </OverlayTrigger>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      )}

      <div className="action-buttons">
        <div className="action-buttons-container">
          <button className="action-button create" onClick={() => navigate('/create')}>
            <BsPlusCircle size={24} />
            <span className="action-button-text">Create Stego</span>
          </button>
          <button className="action-button quick" onClick={() => navigate('/quick-stego')}>
            <BsLightningCharge size={24} />
            <span className="action-button-text">Quick Stego</span>
          </button>
        </div>
      </div>

      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        centered
        className="custom-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Deletion</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the room "{roomToDelete?.name}"?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Dashboard; 