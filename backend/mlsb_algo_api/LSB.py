import numpy as np
from PIL import Image
import os
from MultiLayerLSB import MultiLayerLSB


class LSB:
    """
    Traditional LSB Steganography - embeds data sequentially in the least significant bit (8th bit) only.
    One bit per pixel, sequential embedding.
    """

    @staticmethod
    def embed_message(cover_image_path, stego_image_path, file_path, termination_sequence=b'<<END_OF_MESSAGE>>', is_encrypted=False):
        """
        Traditional LSB embedding: Sequential embedding in the 8th bit (LSB) only.
        Embeds one bit per pixel in the least significant bit.
        
        Args:
            cover_image_path (str): Path to the cover image.
            stego_image_path (str): Path to save the stego image.
            file_path (str): Path to the message file.
            termination_sequence (bytes, optional): Sequence to mark end of message.
            is_encrypted (bool, optional): Whether to encrypt the message.
        
        Returns:
            tuple: (stego_image_path (str), key (bytes or None), iv (bytes or None))
        """
        # Read message
        with open(file_path, 'rb') as f:
            message_data = f.read()
        message_with_term = message_data + termination_sequence
        
        # Get the original file extension
        _, original_ext = os.path.splitext(file_path)
        
        # Use MultiLayerLSB utility for message conversion
        key = None
        iv = None
        temp_plain_file = f"temp_lsb_payload{original_ext}"
        with open(temp_plain_file, 'wb') as f:
            f.write(message_with_term)
        binary_message = MultiLayerLSB.message_to_binary(temp_plain_file)
        os.remove(temp_plain_file)
        
        # Load cover image
        cover = Image.open(cover_image_path)
        is_rgb = cover.mode == 'RGB'
        if not is_rgb:
            cover = cover.convert('L')
        cover_array = np.array(cover)
        
        # Calculate capacity
        if is_rgb:
            height, width, channels = cover_array.shape
            max_bits = height * width * channels  # 1 bit per channel per pixel
        else:
            height, width = cover_array.shape
            max_bits = height * width  # 1 bit per pixel
        
        if len(binary_message) > max_bits:
            raise ValueError(f"Message too long for cover image capacity. Message: {len(binary_message)} bits, Capacity: {max_bits} bits")
        
        # Embed message sequentially in LSB (bit 0)
        bit_index = 0
        if is_rgb:
            for y in range(height):
                for x in range(width):
                    for channel in range(3):
                        if bit_index >= len(binary_message):
                            break
                        # Modify only the LSB (bit 0)
                        pixel = int(cover_array[y, x, channel])
                        pixel = (pixel & 0xFE) | int(binary_message[bit_index])  # Clear LSB and set new bit
                        cover_array[y, x, channel] = pixel
                        bit_index += 1
                    if bit_index >= len(binary_message):
                        break
                if bit_index >= len(binary_message):
                    break
        else:
            for y in range(height):
                for x in range(width):
                    if bit_index >= len(binary_message):
                        break
                    # Modify only the LSB (bit 0)
                    pixel = int(cover_array[y, x])
                    pixel = (pixel & 0xFE) | int(binary_message[bit_index])  # Clear LSB and set new bit
                    cover_array[y, x] = pixel
                    bit_index += 1
                if bit_index >= len(binary_message):
                    break
        
        # Save stego image
        stego_image = Image.fromarray(cover_array.astype(np.uint8))
        stego_base, _ = os.path.splitext(stego_image_path)
        stego_image_path = stego_base + '.png'
        stego_image.save(stego_image_path, format='PNG')
        
        return stego_image_path, key, iv

    @staticmethod
    def extract_message(stego_image_path, output_path=None, key=None, iv=None, termination_sequence=b'<<END_OF_MESSAGE>>', is_encrypted=False):
        """
        Extract message from LSB stego image.
        
        Args:
            stego_image_path (str): Path to the stego image.
            output_path (str, optional): Path to save the extracted message.
            key (bytes): AES key for decryption (if encrypted).
            iv (bytes): Initialization vector for decryption (if encrypted).
            termination_sequence (bytes, optional): Sequence marking end of message.
            is_encrypted (bool, optional): Whether the embedded message is encrypted.
        
        Returns:
            tuple: (message (bytes), media_type (str))
        """
        stego_image = Image.open(stego_image_path)
        stego_array = np.array(stego_image)
        is_rgb = stego_image.mode == 'RGB'
        
        # Extract LSB bits sequentially
        binary_message = ""
        if is_rgb:
            height, width, channels = stego_array.shape
            for y in range(height):
                for x in range(width):
                    for channel in range(3):
                        binary_message += str(stego_array[y, x, channel] & 1)
        else:
            height, width = stego_array.shape
            for y in range(height):
                for x in range(width):
                    binary_message += str(stego_array[y, x] & 1)
        
        # Extract metadata
        message_type_binary = binary_message[:3]
        message_length = int(binary_message[3:35], 2)
        message_binary = binary_message[35:35 + message_length]
        
        type_map = {'001': 'text', '010': 'audio', '011': 'image'}
        message_type = type_map.get(message_type_binary, 'text')
        
        # Convert binary to bytes
        message = bytes(int(message_binary[i:i+8], 2) for i in range(0, len(message_binary), 8))
        
        # Find termination sequence
        idx = message.find(termination_sequence)
        if idx != -1:
            original_message = message[:idx]
        else:
            original_message = message
        
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(original_message)
        
        return original_message, message_type

    @staticmethod
    def calculate_capacity(image_path):
        """Calculate maximum capacity in bytes for LSB (1 bit per pixel)."""
        # Use MultiLayerLSB capacity calculation with rounds=1
        return MultiLayerLSB.calculate_capacity(image_path, rounds=1)
