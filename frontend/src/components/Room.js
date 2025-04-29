import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function RoomDetail() {
  const { roomId } = useParams();
  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/stegorooms/${roomId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setRoomData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [roomId]);

  if (loading) return <div>Loading room data...</div>;
  if (error) return <div>Error: {error}</div>;

  const { text, room } = roomData;

  return (
    <div className="container">
      <h1>{room.name}</h1>
      <p><strong>Message:</strong> {room.message}</p>
      <p><strong>Encrypted:</strong> {room.is_encrypted ? 'Yes' : 'No'}</p>
      {room.key && (
        <p><strong>Encryption Key:</strong> {room.key}</p>
      )}
      <p><strong>Metrics:</strong> {room.metrics}</p>

      {room.stegoed_image && (
        <div>
          <h3>Stegoed Image:</h3>
          <img
            src={`data:image/png;base64,${room.stegoed_image}`}
            alt="Stegoed Room"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>
      )}

      <h3>Extra Info (Human Readable):</h3>
      <pre>{text}</pre>

      <Link to="/" className="btn btn-secondary mt-3">
        Back to Rooms
      </Link>
    </div>
  );
}

export default RoomDetail;
