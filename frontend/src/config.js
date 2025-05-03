// Configuration options based on environment
const isDevelopment = process.env.NODE_ENV !== "production";

// Base URLs
const API_BASE_URL = isDevelopment
  ? "http://localhost:5000"
  : "https://stegx.lanticse.me";

// Create a complete config object for easier extension
const config = {
  API_BASE_URL,
  isDevelopment,
  APP_NAME: "Multi-Layer LSB Steganography",
  FILE_SIZE_LIMIT: 100 * 1024 * 1024, // 100MB
  SUPPORTED_IMAGE_FORMATS: ["image/png", "image/jpeg", "image/jpg", "image/bmp", "image/tiff"],
  SUPPORTED_MESSAGE_FORMATS: ["text/plain", "audio/mpeg", "image/png"],
  DEFAULT_ENCRYPTION: true
};

export default config;