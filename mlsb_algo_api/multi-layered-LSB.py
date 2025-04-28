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
        """Convert a file (text, audio, image, or TIFF) to binary with metadata."""
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
        elif file_extension in ['.png', '.tiff']:
            message_type = 'image'
            binary_message = MultiLayerLSB.file_to_binary(file_path)
        else:
            raise ValueError("Unsupported file type. Supported types: .txt, .mp3, .png, .tiff")

        # Add metadata: message type (3 bits) + message length (32 bits)
        type_map = {'text': '001', 'audio': '010', 'image': '011'}
        message_type_binary = type_map[message_type]
        message_length_binary = format(len(binary_message), '032b')
        return message_type_binary + message_length_binary + binary_message

    @staticmethod
    def binary_to_message(binary_data, output_path=None):
        """Extract a message (text, audio, image, or TIFF) from binary data."""
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
        max_bits = total_pixels * rounds * channels
        max_bytes = max_bits // 8  # Convert bits to bytes
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
        total_bits_available = total_pixels * rounds * (3 if is_rgb else 1)
        
        # Calculate BPP
        bpp = len(binary_message) / total_bits_available if total_bits_available > 0 else 0
        return bpp


if __name__ == "__main__":
    cover_image = "tests/lena.tiff"
    stego_image = "tests/stego.png"
    message_file = "tests/lsbpayload.txt"  # Change this to your message file (e.g., .mp3 or .png)
    output_extracted_file = "thisisoutput.txt"  # Output path for extracted file

    lsb = MultiLayerLSB(cover_image, stego_image)

    # Embed message
    lsb.embed_message(message_file, rounds=3)
    print("Message embedded successfully.")

    # Extract message
    extracted = lsb.extract_message(rounds=3, output_path=output_extracted_file)
    print(f"Extracted message: {extracted}")

    # Calculate PSNR
    psnr = MultiLayerLSB.calculate_psnr(cover_image, stego_image)
    # Calculate and display capacity and BPP
    max_capacity = MultiLayerLSB.calculate_capacity(cover_image, rounds=3)
    bpp = MultiLayerLSB.calculate_bpp(message_file, cover_image, rounds=3)

    print(f"PSNR: {psnr:.2f} dB")
    print(f"Maximum capacity: {max_capacity} bytes")
    print(f"Bits per pixel (BPP): {bpp:.4f}")

    # Display original and stego images side by side
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
    ax1.imshow(Image.open(cover_image))
    ax1.set_title('Original Image')
    ax1.axis('off')
    ax2.imshow(Image.open(stego_image))
    ax2.set_title('Stego Image')
    ax2.axis('off')
    plt.show()
