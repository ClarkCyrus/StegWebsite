import React, { useState } from "react";

const CreateStegoRoom = () => {
  const [name, setName] = useState("");
  const [encrypted, setEncrypted] = useState(false);
  const [storeKey, setStoreKey] = useState(false);
  const [messageFile, setMessageFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("encrypted", encrypted);
    formData.append("storeKey", storeKey);
    if (messageFile) {
      formData.append("message", messageFile);
    }
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      const response = await fetch("http://localhost:5000/api/create_stego_room", {
        method: "POST",
        credentials: "include", // ensures session cookie is sent
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMsg("Stego room created successfully!");
        setError("");
        // Optionally clear the form fields upon success
        setName("");
        setEncrypted(false);
        setStoreKey(false);
        setMessageFile(null);
        setImageFile(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to create stego room.");
        setSuccessMsg("");
      }
    } catch (err) {
      console.error("Error creating stego room:", err);
      setError("Network error while creating stego room.");
      setSuccessMsg("");
    }
  };

  return (
    <div className="container">
      <h1 className="my-4">Create Stego Room</h1>
      <form onSubmit={handleSubmit}>
        {/* Room Name */}
        <div className="form-group">
          <label htmlFor="roomName">Name</label>
          <input
            type="text"
            id="roomName"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Encrypted Option */}
        <div className="form-group mt-3">
          <label>Encrypted?</label>
          <div>
            <label className="mr-3">
              <input
                type="radio"
                name="encrypted"
                value="yes"
                checked={encrypted === true}
                onChange={() => setEncrypted(true)}
              />{" "}
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="encrypted"
                value="no"
                checked={encrypted === false}
                onChange={() => setEncrypted(false)}
              />{" "}
              No
            </label>
          </div>
        </div>

        {/* Store Encryption Key Option */}
        <div className="form-group mt-3">
          <label>Store encryption key in database?</label>
          <div>
            <label className="mr-3">
              <input
                type="radio"
                name="storeKey"
                value="yes"
                checked={storeKey === true}
                onChange={() => setStoreKey(true)}
              />{" "}
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="storeKey"
                value="no"
                checked={storeKey === false}
                onChange={() => setStoreKey(false)}
              />{" "}
              No
            </label>
          </div>
        </div>

        {/* Upload Message - Allow text, PNG, or MP3 */}
        <div className="form-group mt-3">
          <label htmlFor="messageUpload">Upload message (text, PNG, or MP3)</label>
          <input
            type="file"
            id="messageUpload"
            className="form-control-file"
            accept="text/plain,image/png,audio/mpeg"
            onChange={(e) => setMessageFile(e.target.files[0])}
          />
        </div>

        {/* Upload Image */}
        <div className="form-group mt-3">
          <label htmlFor="imageUpload">Upload image where the message is hidden</label>
          <input
            type="file"
            id="imageUpload"
            className="form-control-file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
          />
        </div>

        {/* Create Button */}
        <div className="form-group mt-4">
          <button type="submit" className="btn btn-primary">
            Create!
          </button>
        </div>
      </form>

      {/* Success or Error Messages */}
      {error && (
        <div className="alert alert-danger mt-3" role="alert">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success mt-3" role="alert">
          {successMsg}
        </div>
      )}
    </div>
  );
};

export default CreateStegoRoom;