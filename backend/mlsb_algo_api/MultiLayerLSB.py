import numpy as np
from PIL import Image
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import secrets
from scipy.ndimage import gaussian_filter


class MultiLayerLSB:
    """
    MultiLayerLSB provides methods for multi-layer least significant bit (LSB) steganography with AES encryption.

    Methods:
        file_to_binary(file_path):
            Converts a file to a binary string.
            Args:
                file_path (str): Path to the input file.
            Returns:
                str: Binary string representation of the file.

        binary_to_file(binary_data, output_path):
            Converts a binary string back to a file and saves it.
            Args:
                binary_data (str): Binary string to convert.
                output_path (str): Path to save the output file.
            Returns:
                None

        message_to_binary(file_path):
            Converts a file to a binary string with metadata (type and length).
            Args:
                file_path (str): Path to the input file.
            Returns:
                str: Binary string with metadata.

        binary_to_message(binary_data, output_path=None):
            Converts a binary string with metadata back to the original message and optionally saves it.
            Args:
                binary_data (str): Binary string with metadata.
                output_path (str, optional): Path to save the output file.
            Returns:
                str or bytes: The extracted message (text or binary).

        aes_encrypt(data):
            Encrypts data using AES-CBC with PKCS7 padding.
            Args:
                data (bytes): Data to encrypt.
            Returns:
                tuple: (ciphertext (bytes), key (bytes), iv (bytes))

        aes_decrypt(ciphertext, key, iv):
            Decrypts AES-CBC encrypted data with PKCS7 padding.
            Args:
                ciphertext (bytes): Encrypted data.
                key (bytes): AES key.
                iv (bytes): Initialization vector.
            Returns:
                bytes: Decrypted data.

        embed_message(cover_image_path, stego_image_path, file_path, rounds=8, termination_sequence=b'<<END_OF_MESSAGE>>', is_encrypted=True):
            Embeds a message into an image using multi-layer LSB, with optional AES encryption.
            Args:
                cover_image_path (str): Path to the cover image.
                stego_image_path (str): Path to save the stego image.
                file_path (str): Path to the message file.
                rounds (int, optional): Number of LSB layers to use (1-8). Default is 8.
                termination_sequence (bytes, optional): Sequence to mark end of message. Default is b'<<END_OF_MESSAGE>>'.
                is_encrypted (bool, optional): Whether to encrypt the message with AES. Default is True.
            Returns:
                tuple: (stego_image_path (str), key (bytes or None), iv (bytes or None))

        extract_message(stego_image_path, output_path=None, rounds=8, key=None, iv=None, termination_sequence=b'<<END_OF_MESSAGE>>', is_encrypted=True):
            Extracts a message from a stego image, with optional AES decryption.
            Args:
                stego_image_path (str): Path to the stego image.
                output_path (str, optional): Path to save the extracted message.
                rounds (int, optional): Number of LSB layers used. Default is 8.
                key (bytes): AES key for decryption (if encrypted).
                iv (bytes): Initialization vector for decryption (if encrypted).
                termination_sequence (bytes, optional): Sequence marking end of message. Default is b'<<END_OF_MESSAGE>>'.
                is_encrypted (bool, optional): Whether the embedded message is encrypted. Default is True.
            Returns:
                tuple: (message (bytes), media_type (str))

        calculate_psnr(original_path, stego_path):
            Calculates the PSNR between the original and stego images.
            Args:
                original_path (str): Path to the original image.
                stego_path (str): Path to the stego image.
            Returns:
                float: PSNR value in dB.

        calculate_mse(original_path, stego_path):
            Calculates the Mean Squared Error between the original and stego images.
            Args:
                original_path (str): Path to the original image.
                stego_path (str): Path to the stego image.
            Returns:
                float: MSE value.

        calculate_ssim(original_path, stego_path):
            Calculates the Structural Similarity Index between the original and stego images.
            Args:
                original_path (str): Path to the original image.
                stego_path (str): Path to the stego image.
            Returns:
                float: SSIM value (between -1 and 1, higher is better).

        calculate_capacity(image_path, rounds=8):
            Calculates the maximum embedding capacity in bytes for a given image and number of rounds.
            Args:
                image_path (str): Path to the image.
                rounds (int, optional): Number of LSB layers. Default is 8.
            Returns:
                int: Maximum capacity in bytes.

        calculate_bpp(message_file, image_path, rounds=8):
            Calculates the bits per pixel (BPP) for the embedding.
            Args:
                message_file (str): Path to the message file.
                image_path (str): Path to the image.
                rounds (int, optional): Number of LSB layers. Default is 8.
            Returns:
                float: Bits per pixel value.

        get_media_type(stego_image_path):
            Extracts the media type from the stego image's metadata.
            Args:
                stego_image_path (str): Path to the stego image.
            Returns:
                str: The media type ('text', 'image', or 'audio').
    """
    def __init__(self, cover_image_path, stego_image_path):
        self.cover_image_path = cover_image_path
        self.stego_image_path = stego_image_path

    @staticmethod
    def file_to_binary(file_path):
        """Convert a file (e.g., .mp3, .png) to binary data."""
        with open(file_path, 'rb') as f:
            file_data = f.read()
        binary_data = ''.join(format(byte, '08b') for byte in file_data)
        return binary_data

    @staticmethod
    def binary_to_file(binary_data, output_path):
        """Convert binary data back to a file."""
        byte_data = bytearray(int(binary_data[i:i+8], 2) for i in range(0, len(binary_data), 8))
        with open(output_path, 'wb') as f:
            f.write(byte_data)

    @staticmethod
    def message_to_binary(file_path):
        """Convert a file (text, audio, image, or TIFF) to binary with metadata."""
        _, file_extension = os.path.splitext(file_path)
        file_extension = file_extension.lower()

        if file_extension == '.txt':
            message_type = 'text'
            with open(file_path, 'rb') as f:
                message = f.read()
            binary_message = ''.join(format(b, '08b') for b in message)
        elif file_extension in ['.mp3', '.wav']:
            message_type = 'audio'
            binary_message = MultiLayerLSB.file_to_binary(file_path)
        elif file_extension in ['.png', '.tiff', '.jpg', '.jpeg', '.bmp']:
            message_type = 'image'
            binary_message = MultiLayerLSB.file_to_binary(file_path)
        else:
            message_type = 'audio'
            binary_message = MultiLayerLSB.file_to_binary(file_path)

        type_map = {'text': '001', 'audio': '010', 'image': '011'}
        message_type_binary = type_map[message_type]
        message_length_binary = format(len(binary_message), '032b')
        return message_type_binary + message_length_binary + binary_message

    @staticmethod
    def binary_to_message(binary_data, output_path=None):
        message_type_binary = binary_data[:3]
        message_length_binary = binary_data[3:35]
        message_length = int(message_length_binary, 2)
        message_binary = binary_data[35:35 + message_length]

        type_map = {'001': 'text', '010': 'audio', '011': 'image'}
        message_type = type_map.get(message_type_binary, None)
        if not message_type:
            raise ValueError("Unsupported message type in extracted data.")

        if message_type == 'text':
            # For encrypted text, keep as bytes
            if output_path:
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                with open(output_path, 'wb') as f:
                    f.write(bytes(int(message_binary[i:i+8], 2) for i in range(0, len(message_binary), 8)))
            return bytes(int(message_binary[i:i+8], 2) for i in range(0, len(message_binary), 8))
        elif message_type in ['audio', 'image']:
            if output_path:
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                with open(output_path, 'wb') as f:
                    f.write(bytes(int(message_binary[i:i+8], 2) for i in range(0, len(message_binary), 8)))
            return bytes(int(message_binary[i:i+8], 2) for i in range(0, len(message_binary), 8))
        else:
            raise ValueError("Invalid message type")

    @staticmethod
    def aes_encrypt(data):
        key = secrets.token_bytes(16)  # AES-128
        iv = secrets.token_bytes(16)
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(data) + padder.finalize()
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        ct = encryptor.update(padded_data) + encryptor.finalize()
        return ct, key, iv

    @staticmethod
    def aes_decrypt(ciphertext, key, iv):
        cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        padded_data = decryptor.update(ciphertext) + decryptor.finalize()
        unpadder = padding.PKCS7(128).unpadder()
        data = unpadder.update(padded_data) + unpadder.finalize()
        return data

    @staticmethod
    def embed_message(cover_image_path, stego_image_path, file_path, rounds=8, termination_sequence=b'<<END_OF_MESSAGE>>', is_encrypted=True):
        """
        Embeds a message into an image using multi-layer LSB, with optional AES encryption.
        Args:
            cover_image_path (str): Path to the cover image.
            stego_image_path (str): Path to save the stego image.
            file_path (str): Path to the message file.
            rounds (int, optional): Number of LSB layers to use (1-8). Default is 8.
            termination_sequence (bytes, optional): Sequence to mark end of message. Default is b'<<END_OF_MESSAGE>>'.
            is_encrypted (bool, optional): Whether to encrypt the message with AES. Default is True.
        Returns:
            tuple: (stego_image_path (str), key (bytes or None), iv (bytes or None))
        """
        if not 1 <= rounds <= 8:
            raise ValueError("Number of rounds must be between 1 and 8")

        with open(file_path, 'rb') as f:
            message_data = f.read()
        message_with_term = message_data + termination_sequence

        # Get the original file extension
        _, original_ext = os.path.splitext(file_path)

        if is_encrypted:
            encrypted_data, key, iv = MultiLayerLSB.aes_encrypt(message_with_term)
            temp_enc_file = f"temp_encrypted_payload{original_ext}"
            with open(temp_enc_file, 'wb') as f:
                f.write(encrypted_data)
            binary_message = MultiLayerLSB.message_to_binary(temp_enc_file)
            os.remove(temp_enc_file)
        else:
            key = None
            iv = None
            temp_plain_file = f"temp_plain_payload{original_ext}"
            with open(temp_plain_file, 'wb') as f:
                f.write(message_with_term)
            binary_message = MultiLayerLSB.message_to_binary(temp_plain_file)
            os.remove(temp_plain_file)

        cover = Image.open(cover_image_path)
        is_rgb = cover.mode == 'RGB'
        if not is_rgb:
            cover = cover.convert('L')
        cover_array = np.array(cover)

        channels = 3 if is_rgb else 1
        max_bits = cover_array.size * rounds * channels
        if len(binary_message) > max_bits:
            raise ValueError("Message too long for cover image capacity")

        bit_index = 0
        for round_num in range(rounds):
            if is_rgb:
                height, width, _ = cover_array.shape
                for y in range(height):
                    for x in range(width):
                        for channel in range(3):
                            if bit_index >= len(binary_message):
                                break
                            pixel = int(cover_array[y, x, channel])
                            mask = ~(1 << round_num)
                            pixel = pixel & mask
                            if bit_index < len(binary_message):
                                message_bit = int(binary_message[bit_index])
                                pixel = pixel | (message_bit << round_num)
                                cover_array[y, x, channel] = pixel
                                bit_index += 1
                        if bit_index >= len(binary_message):
                            break
                    if bit_index >= len(binary_message):
                        break
            else:
                height, width = cover_array.shape
                for y in range(height):
                    for x in range(width):
                        if bit_index >= len(binary_message):
                            break
                        pixel = int(cover_array[y, x])
                        mask = ~(1 << round_num)
                        pixel = pixel & mask
                        if bit_index < len(binary_message):
                            message_bit = int(binary_message[bit_index])
                            pixel = pixel | (message_bit << round_num)
                            cover_array[y, x] = pixel
                            bit_index += 1
                    if bit_index >= len(binary_message):
                        break

        stego_image = Image.fromarray(cover_array.astype(np.uint8))
        
        # Determine the output format based on the input format
        _, input_ext = os.path.splitext(cover_image_path)
        input_ext = input_ext.lower()
        
        # Set format based on input extension
        if input_ext in ['.jpg', '.jpeg']:
            output_format = 'JPEG'
            stego_image.save(stego_image_path, format=output_format, quality=95)
        elif input_ext == '.png':
            output_format = 'PNG'
            stego_image.save(stego_image_path, format=output_format)
        elif input_ext == '.bmp':
            output_format = 'BMP'
            stego_image.save(stego_image_path, format=output_format)
        elif input_ext == '.tiff':
            output_format = 'TIFF'
            stego_image.save(stego_image_path, format=output_format)
        else:
            # Default to PNG for unknown formats
            output_format = 'PNG'
            stego_image.save(stego_image_path, format=output_format)
            
        return stego_image_path, key, iv

    @staticmethod
    def extract_message(stego_image_path, output_path=None, rounds=8, key=None, iv=None, termination_sequence=b'<<END_OF_MESSAGE>>', is_encrypted=True):
        """
        Extracts a message from a stego image, with optional AES decryption.
        Args:
            stego_image_path (str): Path to the stego image.
            output_path (str, optional): Path to save the extracted message.
            rounds (int, optional): Number of LSB layers used. Default is 8.
            key (bytes): AES key for decryption (if encrypted).
            iv (bytes): Initialization vector for decryption (if encrypted).
            termination_sequence (bytes, optional): Sequence marking end of message. Default is b'<<END_OF_MESSAGE>>'.
            is_encrypted (bool, optional): Whether the embedded message is encrypted. Default is True.
        Returns:
            tuple: (message (bytes), media_type (str))
        """
        stego_image = Image.open(stego_image_path)
        stego_array = np.array(stego_image)
        is_rgb = stego_image.mode == 'RGB'
        if not is_rgb:
            stego_array = stego_array[..., np.newaxis]

        binary_message = ""
        message_type = None
        message_length = None

        for round_num in range(rounds):
            bits = ((stego_array >> round_num) & 1).flatten()
            binary_message += ''.join(str(b) for b in bits)
            if message_type is None and len(binary_message) >= 3:
                message_type_binary = binary_message[:3]
                binary_message = binary_message[3:]
                type_map = {'001': 'text', '010': 'audio', '011': 'image'}
                message_type = type_map.get(message_type_binary, None)
                if not message_type:
                    raise ValueError("Unsupported message type in extracted data.")
            if message_type is not None and message_length is None and len(binary_message) >= 32:
                message_length = int(binary_message[:32], 2)
                binary_message = binary_message[32:]
            if message_length is not None and len(binary_message) >= message_length:
                binary_message = binary_message[:message_length]
                break
        if message_type is None or message_length is None:
            raise ValueError("Could not extract message metadata")
        if message_type == 'text':
            # For encrypted text, keep as bytes
            if is_encrypted:
                message = bytes(int(binary_message[i:i+8], 2) for i in range(0, len(binary_message), 8))
            else:
                message = ''.join(chr(int(binary_message[i:i+8], 2)) for i in range(0, len(binary_message), 8))
        elif message_type in ['audio', 'image']:
            message = bytes(int(binary_message[i:i+8], 2) for i in range(0, len(binary_message), 8))
        else:
            raise ValueError("Invalid message type")

        if is_encrypted:
            if key is None or iv is None:
                raise ValueError("AES key and IV must be provided for decryption.")
            decrypted_data = MultiLayerLSB.aes_decrypt(message, key, iv)
            idx = decrypted_data.find(termination_sequence)
            if idx == -1:
                raise ValueError("Termination sequence not found in decrypted data!")
            original_message = decrypted_data[:idx]
        else:
            if isinstance(message, str):
                original_message = message.encode('utf-8')
            else:
                original_message = message

        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(original_message)
        return original_message, message_type

    @staticmethod
    def calculate_mse(original_path, stego_path):
        """Calculate the Mean Squared Error between original and stego images.
        
        MSE = Σ(m,n)[I₁(m,n) - I₂(m,n)]² / (M * N)
        
        where:
        - I₁ and I₂ are the original and stego images
        - M, N are the image dimensions
        """
        original = np.array(Image.open(original_path).convert('RGB'), dtype=np.float64)
        stego = np.array(Image.open(stego_path).convert('RGB'), dtype=np.float64)
        
        # Calculate MSE for all channels
        mse = np.mean((original - stego) ** 2)
        return mse
    
    @staticmethod
    def calculate_ssim(original_path, stego_path):
        from skimage.metrics import structural_similarity as ssim
        original = np.array(Image.open(original_path).convert('RGB'))
        stego = np.array(Image.open(stego_path).convert('RGB'))

        # Set the window size and channel axis
        win_size = 7  # or any odd value <= min(original.shape[:2])
        ssim_value, _ = ssim(original, stego, win_size=win_size, full=True, multichannel=True, channel_axis=-1)
        return ssim_value

    @staticmethod
    def calculate_psnr(original_path, stego_path):
        """Calculate PSNR between original and stego images."""
        mse = MultiLayerLSB.calculate_mse(original_path, stego_path)
        if mse == 0:
            return float('inf')  # No difference between images
        
        max_pixel = 255.0
        psnr = 20 * np.log10(max_pixel / np.sqrt(mse))
        return psnr

    @staticmethod
    def calculate_capacity(image_path, rounds=8):
        """Calculate maximum capacity in bytes based on image size, channels, and embedding rounds."""
        img = Image.open(image_path)
        is_rgb = img.mode == 'RGB'
        if not is_rgb:
            img = img.convert('L')  # Convert to grayscale if not RGB
        channels = 3 if is_rgb else 1
        total_pixels = img.size[0] * img.size[1]  # width * height
        
        # Calculate total bits available
        total_bits_available = total_pixels * rounds * channels
        
        # Subtract metadata bits (3 bits for type + 32 bits for length)
        metadata_bits = 35
        available_bits = total_bits_available - metadata_bits
        
        # Convert to bytes (8 bits per byte)
        max_bytes = available_bits // 8
        return max_bytes

    @staticmethod
    def calculate_bpp(message_file, image_path, rounds=8):
        """Calculate bits per pixel (BPP) for the embedding."""
        binary_message = MultiLayerLSB.message_to_binary(message_file)
        img = Image.open(image_path)
        is_rgb = img.mode == 'RGB'
        if not is_rgb:
            img = img.convert('L')  # Convert to grayscale if not RGB

        total_pixels = img.size[0] * img.size[1]  # width * height
        channels = 3 if is_rgb else 1
        
        # Calculate total bits available (including metadata)
        total_bits_available = total_pixels * rounds * channels
        
        # Calculate BPP (total message bits / total pixels)
        bpp = len(binary_message) / total_pixels
        return bpp

    @staticmethod
    def get_media_type(stego_image_path):
        """
        Extracts the media type from the stego image's metadata.
        Args:
            stego_image_path (str): Path to the stego image.
        Returns:
            str: The media type ('text', 'image', or 'audio').
        """
        stego_image = Image.open(stego_image_path)
        stego_array = np.array(stego_image)
        is_rgb = stego_image.mode == 'RGB'
        if not is_rgb:
            stego_array = stego_array[..., np.newaxis]

        # Extract the first 3 bits which contain the media type
        message_type_bits = ((stego_array >> 0) & 1).flatten()[:3]
        message_type_binary = ''.join(str(b) for b in message_type_bits)
        
        # Map binary to media type
        type_map = {'001': 'text', '010': 'audio', '011': 'image'}
        return type_map.get(message_type_binary, 'text')  # default to text if unknown type



