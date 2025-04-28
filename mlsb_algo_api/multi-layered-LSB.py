import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Qt5Agg')  # for Linux
import matplotlib.pyplot as plt
import os


class MultiLayerLSB:
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
        """Convert a file (text, audio, or image) to binary with metadata."""
        # Infer message type from file extension
        _, file_extension = os.path.splitext(file_path)
        file_extension = file_extension.lower()

        if file_extension == '.txt':
            message_type = 'text'
            with open(file_path, 'r') as f:
                message = f.read()
            binary_message = ''.join(format(ord(char), '08b') for char in message)
        elif file_extension == '.mp3':
            message_type = 'audio'
            binary_message = MultiLayerLSB.file_to_binary(file_path)
        elif file_extension == '.png':
            message_type = 'image'
            binary_message = MultiLayerLSB.file_to_binary(file_path)
        else:
            raise ValueError("Unsupported file type. Supported types: .txt, .mp3, .png")

        # Add metadata: message type (3 bits) + message length (32 bits)
        type_map = {'text': '001', 'audio': '010', 'image': '011'}
        message_type_binary = type_map[message_type]
        message_length_binary = format(len(binary_message), '032b')
        return message_type_binary + message_length_binary + binary_message

    @staticmethod
    def binary_to_message(binary_data, output_path=None):
        """Extract a message (text, audio, or image) from binary data."""
        # Extract metadata
        message_type_binary = binary_data[:3]
        message_length_binary = binary_data[3:35]
        message_length = int(message_length_binary, 2)
        message_binary = binary_data[35:35 + message_length]

        # Determine message type
        type_map = {'001': 'text', '010': 'audio', '011': 'image'}
        message_type = type_map.get(message_type_binary, None)
        if not message_type:
            raise ValueError("Unsupported message type in extracted data.")

        # Reconstruct the message
        if message_type == 'text':
            message = ''.join(chr(int(message_binary[i:i+8], 2)) for i in range(0, len(message_binary), 8))
            return message
        elif message_type in ['audio', 'image']:
            if not output_path:
                raise ValueError("Output path is required to save extracted audio or image.")
            MultiLayerLSB.binary_to_file(message_binary, output_path)
            return f"{message_type.capitalize()} file saved to {output_path}."
        else:
            raise ValueError("Unsupported message type.")

    def embed_message(self, file_path, rounds=1):
        """Embed a message (text, audio, or image) using multiple rounds of LSB embedding."""
        if not 1 <= rounds <= 4:
            raise ValueError("Number of rounds must be between 1 and 4")

        binary_message = self.message_to_binary(file_path)

        cover = Image.open(self.cover_image_path)
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
        stego_image.save(self.stego_image_path, format='PNG')
        return stego_image

    def extract_message(self, rounds=1, output_path=None):
        """Extract a message (text, audio, or image) from the stego image."""
        if not 1 <= rounds <= 4:
            raise ValueError("Number of rounds must be between 1 and 4")

        stego = Image.open(self.stego_image_path)
        is_rgb = stego.mode == 'RGB'
        if not is_rgb:
            stego = stego.convert('L')
        stego_array = np.array(stego)

        extracted_bits = []
        for round_num in range(rounds):
            if is_rgb:
                height, width, _ = stego_array.shape
                for y in range(height):
                    for x in range(width):
                        for channel in range(3):
                            pixel = stego_array[y, x, channel]
                            bit = (pixel >> round_num) & 1
                            extracted_bits.append(str(bit))
            else:
                height, width = stego_array.shape
                for y in range(height):
                    for x in range(width):
                        pixel = stego_array[y, x]
                        bit = (pixel >> round_num) & 1
                        extracted_bits.append(str(bit))

        binary_message = ''.join(extracted_bits)
        return self.binary_to_message(binary_message, output_path)


if __name__ == "__main__":
    cover_image = "tests/lena.tiff"
    stego_image = "stego.png"
    message_file = "tests/baboon.tiff"  # Change this to your message file (e.g., .mp3 or .png)
    output_extracted_file = "extracted_image.png"  # Output path for extracted file

    lsb = MultiLayerLSB(cover_image, stego_image)

    try:
        # Embed message
        lsb.embed_message(message_file, rounds=3)
        print("Message embedded successfully.")

        # Extract message
        extracted = lsb.extract_message(rounds=3, output_path=output_extracted_file)
        print(f"Extracted message: {extracted}")

    except Exception as e:
        print(f"Error: {str(e)}")