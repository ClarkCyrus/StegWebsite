import React, { useEffect, useState } from 'react';
import DragAndDropFileUpload from './DragDrop';
import { useNavigate, Link } from 'react-router-dom';
import './Main.css';

const Main = () => {

  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [search, setSearch] = useState("");

  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showFeedback, setShowFeedback] = useState(null);
  const [preview, setPreview] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    setFile(selectedFile);
  };

  const handleFileSelect = (selectedFile) => { 
    setFile(selectedFile); 
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    if (event && event.preventDefault){
        event.preventDefault();
    }
    if (!file) 
    { setError('No file selected'); 
        return;
    }
    setLoading(true);
    try {
        const response = await fetch('http://localhost:5000/upload', {
            method: 'POST',
        });
        const data = await response.json();
        console.log('API Response:', data);
    } catch (error) {
        console.error('Error fetching questions and answers:', error);
        setError('Error: Unable to fetch questions and answers.');
    } 
  };

  const handleCardClick = (roomId) => {
    navigate(`/rooms/${roomId}`);
  };

  const getCurrentUser = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/current_user", {
        credentials: "include" 
      });
      if (!response.ok) {
        setLoading(false);
        return;
      }
      const data = await response.json();
      setUser(data);
    } catch (err) {
      console.error("Error fetching current user:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  const fetchStegRooms = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/steg_rooms", {
        method: "GET",
        credentials: "include" 
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to fetch stego rooms");
      }
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchStegRooms();
  }, []);

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleModalSubmit = () => { 
    handleSubmit()
  };

  const toggleFeedbackModal = () => { 
    setShowFeedback(!showFeedback); 
  };

  const handleCreateStegImage = () => {
    navigate("/create");
  };



  return (
    <div>

        <div style={{ margin: "20px" }}>
            <h1>Dashboard</h1>
            {user ? (
                <div>Welcome, {user.email}!</div>
            ) : (
                <div>Please log in to access your dashboard.</div>
            )}
        </div>
        <div    
            style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
            padding: "16px",
            }}
        >
        </div>

        <div className="container px-5" id="mainTop">
            <div className="row gx-5 align-items-center">
                <div className="col-lg-12">
                    <div className="mb-5 mb-lg-0 text-center text-lg-start">
                        <h1 className="display-1 lh-1 mb-3 fw-bold">ML-LSB Steg with AES Encryption </h1>
                        <p className="lead fw-normal text-muted mb-5">
                            Securely hide data within images using the Multi Layered Least Significant Bit (ML-LSB) technique, 
                            while also encrypting the data with the Advanced Encryption Standard (AES) for added security 
                        </p>
                        <div className="d-flex flex-column flex-lg-row align-items-center">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="container px-5" id="mainTop">  
            <div className="row gx-5 align-items-center">
            <div className="col-lg-12 mb-3 search">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Search Rooms..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
            />
            </div>
            <div className="col-lg-12 d-flex flex-wrap justify-content-center">
                {filteredRooms.map((room) => (
                    <div
                    className="card reviewer-card mb-3"
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    >
                    <img
                        src={`data:image/png;base64,${room.image}`}
                        className="card-img-top reviewer-img"
                        alt="Room Avatar"
                    />
                    <div className="card-body">
                        <h5 className="card-title">{room.name}</h5>
                        <p className="card-text">{room.message}</p>
                        <p className="card-text">
                        <small className="text-muted">
                            Last updated {room.metrics}
                        </small>
                        </p>
                        <Link to={`/room/${room.id}`} className="btn btn-primary">
                        Open Room
                        </Link>
                    </div>
                    </div>
                ))}
                </div>
            </div>
        </div>

        <button className='btn btn-primary' style={{marginLeft: '500px', padding: '10px 20px' }} onClick={handleCreateStegImage}>
            Create Steg Image
        </button>

        <div>
            <nav className="navbar navbar-expand-lg navbar-light fixed-top shadow-sm" id="mainNav">
                <div className="container px-5">
                    <a className="navbar-brand fw-bold" href="/">StegWebsite</a>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarResponsive" aria-controls="navbarResponsive" aria-expanded="false" aria-label="Toggle navigation">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarResponsive">
                        <ul className="navbar-nav ms-auto me-0 my-3 my-lg-0">
                            <li className="nav-item"><a className="nav-link me-lg-3" href="#features">About</a></li>
                            <li className="nav-item"><a className="nav-link me-lg-3" href="/Account">Account</a></li>
                        </ul>
                    </div>
                </div>
            </nav>

            <section id="features">
            <div className="container px-5">
                <div className="row gx-5 align-items-center">
                    <div className="col-lg-5 order-lg-1 mb-5 mb-lg-0">
                        <div className="mb-5 mb-lg-0 text-center text-lg-start">
                            <h1 className="display-4 lh-1 mb-4 fw-bold">We Want To Hear Your Feedback</h1>
                            <p className="lead fw-normal text-muted mb-4 text-justify">
                                We value your input and are eager to hear from you! 
                                Your feedback helps us enhance our services and provide you with the best possible experience.
                                Whether it's a suggestion, a compliment, or a concern, please share your thoughts with us.
                                Together, we can make improvements that matter. Thank you for being a part of our community!
                            </p>
                        </div>
                        <button onClick={toggleFeedbackModal} className="button_feedback">Give Feedback</button>
                    </div>
                    <div className="col-lg-7 order-lg-0">
                        <img className="app-badge" src="/assets/feedback.png" alt="..." style={{ width: '85%' }} />
                    </div>
                </div>
            </div>
            </section>

            <section className="bg-gradient-primary-to-secondary" id="download">
                <div className="container px-5">
                    <h2 className="text-center text-white font-alt mb-4">Start Securing Now</h2>
                    <div className="d-flex flex-column flex-lg-row align-items-center justify-content-center">
                        <a className="me-lg-3 mb-4 mb-lg-0" href="#!">
                        </a>
                    </div>
                </div>
            </section>

            <footer className="bg-black text-center py-5">
                <div className="container px-5">
                    <div className="text-white-50 small">
                        <div className="mb-2">&copy; StegWebsite. All Rights Reserved.</div>
                        <a href="#!">Privacy</a>
                        <span className="mx-1">&middot;</span>
                        <a href="#!">Terms</a>
                        <span className="mx-1">&middot;</span>
                        <a href="#!">FAQ</a>
                    </div>
                </div>
            </footer>

            <div className={`modal fade ${showFeedback ? "show d-block" : ""} `} id="feedbackModal" tabIndex="-1" aria-labelledby="feedbackModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header bg-gradient-primary-to-secondary p-4">
                            <h5 className="modal-title font-alt text-white" id="feedbackModalLabel">Send feedback</h5>
                            <button className="btn-close btn-close-white" type="button" onClick={() => setShowFeedback(false)} data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body border-0 p-4">
                            <form id="contactForm" data-sb-form-api-token="API_TOKEN">
                                <div className="form-group mb-3 text-center">
                                    <label className="form-label display-6" htmlFor="feeling">How are you feeling?</label>
                                    <p className="subheading">Select an emoji that best describes your current mood</p>
                                    <div id="feeling" className="emoji-container">
                                        <div className="form-check mx-2">
                                            <input className="form-check-input" type="radio" id="very-unhappy" name="feeling" value="very-unhappy" />
                                            <label className="form-check-label" htmlFor="very-unhappy">😞</label>
                                        </div>
                                        <div className="form-check mx-2">
                                            <input className="form-check-input" type="radio" id="unhappy" name="feeling" value="unhappy" />
                                            <label className="form-check-label" htmlFor="unhappy">😟</label>
                                        </div>
                                        <div className="form-check mx-2">
                                            <input className="form-check-input" type="radio" id="neutral" name="feeling" value="neutral" />
                                            <label className="form-check-label" htmlFor="neutral">😐</label>
                                        </div>
                                        <div className="form-check mx-2">
                                            <input className="form-check-input" type="radio" id="happy" name="feeling" value="happy" />
                                            <label className="form-check-label" htmlFor="happy">🙂</label>
                                        </div>
                                        <div className="form-check mx-2">
                                            <input className="form-check-input" type="radio" id="very-happy" name="feeling" value="very-happy" />
                                            <label className="form-check-label" htmlFor="very-happy">😃</label>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-floating mb-3">    
                                    <textarea className="form-control" id="message" type="text" placeholder="Enter your message here..."data-sb-validations="required"></textarea>
                                    <label htmlFor="message">Message</label>
                                    <div className="invalid-feedback" data-sb-feedback="message:required">A message is required.</div>
                                </div>
                                <div className="d-none" id="submitSuccessMessage">
                                    <div className="text-center mb-3">
                                        <div className="fw-bolder">Form submission successful!</div>
                                    </div>
                                </div>
                                <div className="d-none" id="submitErrorMessage"><div className="text-center text-danger mb-3">Error sending message!</div></div>
                                <div className="d-grid"><button className="btn btn-primary rounded-pill btn-lg" id="submitButton" type="submit">Submit</button></div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
}

export default Main;
