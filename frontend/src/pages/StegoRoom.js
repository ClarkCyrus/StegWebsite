import React, { useState } from 'react';
import DragAndDropFileUpload from '../components/DragDrop';
import './StegoRoom.css';

function StegoRoom(loading) {
  const [name, setName] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [storeKey, setStoreKey] = useState(false);
  const [textFile, setTextFile] = useState(null);
  const [txtUploadError, setTxtUploadError] = useState(null);

  const handleTextFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/plain') {
      setTextFile(selectedFile);
      setTxtUploadError(null);
    } else {
      setTxtUploadError('Please upload a valid .txt file.');
      setTextFile(null);
    }
  };

  const handleTextDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length) {
      handleTextFileChange({ target: { files: [files[0]] } });
    }
  };

  const handleTextDragOver = (event) => {
    event.preventDefault();
  };

  const handleTextCancel = () => {
    setTextFile(null);
    document.getElementById('txtFileInput').value = '';
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission here (e.g., upload data, show success message)
    console.log('Form submitted with values:', {
      name,
      isEncrypted,
      storeKey,
      textFile,
    });
  };

  return (
    <div className="stegoroom-wrapper">
      <h1 className="stegoroom-title">Create Stego Room</h1>

      <div className="stegoroom-box">
        <div className="stegoroom-left-column">
          <div className="stegoroom-inputgroup">
            <label htmlFor="nameInput" className="stegoroom-label">Name:</label>
            <input
              id="nameInput"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="stegoroom-input"
            />
          </div>

          <div className="stegoroom-checkboxgroup">
            <label htmlFor="encryptedCheckbox" className="stegoroom-checkboxlabel">Encrypted?</label>
            <input
              type="checkbox"
              id="encryptedCheckbox"
              className="stegoroom-checkbox"
              checked={isEncrypted}
              onChange={(e) => setIsEncrypted(e.target.checked)}
            />
          </div>

          <div className="stegoroom-checkboxgroup2">
            <label htmlFor="storeKeyCheckbox" className="stegoroom-checkboxlabel">Store encryption key in Database?</label>
            <input
              type="checkbox"
              id="storeKeyCheckbox"
              className="stegoroom-checkbox"
              checked={storeKey}
              onChange={(e) => setStoreKey(e.target.checked)}
            />
          </div>
          <button
            className="stegoroom-submit-button"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>

        <div className="stegoroom-right-column">
          <div className="stegoroom-upload-section">
            {/* Text Upload */}
            <div className="stegoroom-upload-container">
              <div className="stegoroom-drag-area" onDrop={handleTextDrop} onDragOver={handleTextDragOver}>
                {textFile ? (
                  <div className="stegoroom-file-preview">
                    <p>File Preview: {textFile.name}</p>
                    <button className="cancel-button" type="button" onClick={handleTextCancel}>Cancel</button>
                    <button className="accept-button" type="submit" disabled={loading}> 
                    {loading ? 'Uploading...' : 'Upload'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="icon"><i className="bi bi-cloud-arrow-up-fill"></i></div>
                    <header>Drag & Drop to Upload Text File</header>
                    <span>OR</span>
                    <button type="button" onClick={() => document.getElementById('txtFileInput').click()}>
                      Browse File
                    </button>
                  </>
                )}
                <input
                  type="file"
                  id="txtFileInput"
                  hidden
                  accept="text/plain"
                  onChange={handleTextFileChange}
                />
              </div>
              {txtUploadError && <p className="error-message text-danger">{txtUploadError}</p>}
            </div>

            <div className="stegoroom-png-upload">
              <DragAndDropFileUpload
                onFileSelect={(file) => console.log('Uploaded image file:', file)}
                onSubmit={(e) => e.preventDefault()}
                acceptType="image/png"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StegoRoom;
