import numpy as np
from PIL import Image
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import secrets


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

        embed_message(cover_image_path, stego_image_path, file_path, rounds=1, termination_sequence=b'<<END_OF_MESSAGE>>'):
            Embeds an encrypted message into an image using multi-layer LSB.
            Args:
                cover_image_path (str): Path to the cover image.
                stego_image_path (str): Path to save the stego image.
                file_path (str): Path to the message file.
                rounds (int, optional): Number of LSB layers to use (1-4). Default is 1.
                termination_sequence (bytes, optional): Sequence to mark end of message. Default is b'<<END_OF_MESSAGE>>'.
            Returns:
                tuple: (stego_image_path (str), key (bytes), iv (bytes))

        extract_message(stego_image_path, output_path=None, rounds=1, key=None, iv=None, termination_sequence=b'<<END_OF_MESSAGE>>'):
            Extracts and decrypts a message from a stego image.
            Args:
                stego_image_path (str): Path to the stego image.
                output_path (str, optional): Path to save the extracted message.
                rounds (int, optional): Number of LSB layers used. Default is 1.
                key (bytes): AES key for decryption.
                iv (bytes): Initialization vector for decryption.
                termination_sequence (bytes, optional): Sequence marking end of message. Default is b'<<END_OF_MESSAGE>>'.
            Returns:
                bytes: The original extracted message.

        calculate_psnr(original_path, stego_path):
            Calculates the PSNR between the original and stego images.
            Args:
                original_path (str): Path to the original image.
                stego_path (str): Path to the stego image.
            Returns:
                float: PSNR value in dB.

        calculate_capacity(image_path, rounds=1):
            Calculates the maximum embedding capacity in bytes for a given image and number of rounds.
            Args:
                image_path (str): Path to the image.
                rounds (int, optional): Number of LSB layers. Default is 1.
            Returns:
                int: Maximum capacity in bytes.

        calculate_bpp(message_file, image_path, rounds=1):
            Calculates the bits per pixel (BPP) for the embedding.
            Args:
                message_file (str): Path to the message file.
                image_path (str): Path to the image.
                rounds (int, optional): Number of LSB layers. Default is 1.
            Returns:
                float: Bits per pixel value.
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
        # Infer message type from file extension
        _, file_extension = os.path.splitext(file_path)
        file_extension = file_extension.lower()

        if file_extension == '.txt':
            message_type = 'text'
            with open(file_path, 'r') as f:
                message = f.read()
            binary_message = ''.join(format(ord(char), '08b') for char in message)
        elif file_extension in ['.mp3', '.wav']:
            message_type = 'audio'
            binary_message = MultiLayerLSB.file_to_binary(file_path)
        elif file_extension in ['.png', '.tiff', '.jpg', '.jpeg', '.bmp']:
            message_type = 'image'
            binary_message = MultiLayerLSB.file_to_binary(file_path)
        else:
            # Default: treat as binary (audio type is fine for generic binary)
            message_type = 'audio'
            binary_message = MultiLayerLSB.file_to_binary(file_path)

        # Add metadata: message type (3 bits) + message length (32 bits)
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
            message = ''.join(chr(int(message_binary[i:i+8], 2)) for i in range(0, len(message_binary), 8))
        elif message_type in ['audio', 'image']:
            message = bytes(int(message_binary[i:i+8], 2) for i in range(0, len(message_binary), 8))
        else:
            raise ValueError("Invalid message type")

        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            if message_type == 'text':
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(message)
            else:
                with open(output_path, 'wb') as f:
                    f.write(message)
        return message

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
    def embed_message(cover_image_path, stego_image_path, file_path, rounds=1, termination_sequence=b'<<END_OF_MESSAGE>>'):
        if not 1 <= rounds <= 4:
            raise ValueError("Number of rounds must be between 1 and 4")

        with open(file_path, 'rb') as f:
            message_data = f.read()
        message_with_term = message_data + termination_sequence

        encrypted_data, key, iv = MultiLayerLSB.aes_encrypt(message_with_term)

        # Save encrypted data to a temp file for binary conversion
        temp_enc_file = "temp_encrypted_payload.bin"
        with open(temp_enc_file, 'wb') as f:
            f.write(encrypted_data)
        binary_message = MultiLayerLSB.message_to_binary(temp_enc_file)
        os.remove(temp_enc_file)

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
        stego_image.save(stego_image_path, format='PNG')
        return stego_image_path, key, iv

    @staticmethod
    def extract_message(stego_image_path, output_path=None, rounds=1, key=None, iv=None, termination_sequence=b'<<END_OF_MESSAGE>>'):
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
            message = ''.join(chr(int(binary_message[i:i+8], 2)) for i in range(0, len(binary_message), 8))
        elif message_type in ['audio', 'image']:
            message = bytes(int(binary_message[i:i+8], 2) for i in range(0, len(binary_message), 8))
        else:
            raise ValueError("Invalid message type")

        # Decrypt the message
        if key is None or iv is None:
            raise ValueError("AES key and IV must be provided for decryption.")
        decrypted_data = MultiLayerLSB.aes_decrypt(message, key, iv)
        idx = decrypted_data.find(termination_sequence)
        if idx == -1:
            raise ValueError("Termination sequence not found in decrypted data!")
        original_message = decrypted_data[:idx]

        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(original_message)
        return original_message

    @staticmethod
    def calculate_psnr(original_path, stego_path):
        """Calculate PSNR between original and stego images."""
        original = np.array(Image.open(original_path).convert('RGB'))
        stego = np.array(Image.open(stego_path).convert('RGB'))
        
        mse = np.mean((original - stego) ** 2)
        if mse == 0:
            return float('inf')  # No difference between images
        
        max_pixel = 255.0
        psnr = 20 * np.log10(max_pixel / np.sqrt(mse))
        return psnr

    @staticmethod
    def calculate_capacity(image_path, rounds=1):
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
    def calculate_bpp(message_file, image_path, rounds=1):
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



