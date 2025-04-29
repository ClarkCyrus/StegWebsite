import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

function StegoRoom() {
  return (
    <Container className="mt-4" style={{ maxWidth: '900px' }}>
      <h2 className="mb-4">STEGO ROOM</h2>
      <Row className="mb-4">
        <Col md={6}>
          <Card style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>*Cover Image</span>
          </Card>
        </Col>
        <Col md={6}>
          <Card style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>*Stegoed Image</span>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col>
          <Card style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span>*Metrics</span>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default StegoRoom; 