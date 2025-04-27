import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Qt5Agg')  # for Linux
import matplotlib.pyplot as plt


class MultiLayerLSB:
    def __init__(self, cover_image_path, stego_image_path):
        self.cover_image_path = cover_image_path
        self.stego_image_path = stego_image_path
       
    @staticmethod
    def set_message_type(message):
        pass

    @staticmethod
    def message_to_binary(message):
        """Convert text message to binary string."""
        return ''.join(format(ord(char), '08b') for char in message)

    @staticmethod
    def binary_to_message(binary_string):
        """Convert binary string back to text message."""
        message = ''
        for i in range(0, len(binary_string), 8):
            byte = binary_string[i:i+8]
            if byte == '00000000':  # Check for termination sequence
                break
            message += chr(int(byte, 2))
        return message

    def embed_message(self, message, rounds=1):
        """Embed message using multiple rounds of LSB embedding."""
        if not 1 <= rounds <= 4:
            raise ValueError("Number of rounds must be between 1 and 4")

        binary_message = self.message_to_binary(message) + '00000000'

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

    def extract_message(self, rounds=1):
        """Extract message from stego image."""
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
        try:
            return self.binary_to_message(binary_message)
        except:
            return ""

    @staticmethod
    def calculate_psnr(original_path, stego_path):
        """Calculate PSNR between original and stego images."""
        original = np.array(Image.open(original_path))
        stego = np.array(Image.open(stego_path))

        mse = np.mean((original - stego) ** 2)
        if mse == 0:
            return float('inf')

        max_pixel = 255.0
        psnr = 20 * np.log10(max_pixel / np.sqrt(mse))
        return psnr

    @staticmethod
    def calculate_capacity(image_path, rounds=1):
        """Calculate maximum capacity in bytes."""
        img = Image.open(image_path)
        is_rgb = img.mode == 'RGB'
        if not is_rgb:
            img = img.convert('L')
        channels = 3 if is_rgb else 1
        total_pixels = np.array(img).size
        max_bits = total_pixels * rounds * channels
        return max_bits // 8

    @staticmethod
    def calculate_bpp(message, image_path, rounds):
        """Calculate bits per pixel (BPP)."""
        binary_message = MultiLayerLSB.message_to_binary(message)
        img = Image.open(image_path)
        is_rgb = img.mode == 'RGB'
        if not is_rgb:
            img = img.convert('L')

        total_pixels = img.size[0] * img.size[1]
        total_bits_available = total_pixels * rounds * (3 if is_rgb else 1)
        return len(binary_message) / total_bits_available if total_bits_available > 0 else 0


if __name__ == "__main__":
    cover_image = "tests/lena.tiff"
    stego_image = "stego.png"
    message_file = "tests/lsbpayload.txt"

    with open(message_file, "r") as f:
        message = f.read().strip()

    rounds = 3
    lsb = MultiLayerLSB(cover_image, stego_image)

    try:
        # Embed message
        lsb.embed_message(message, rounds=rounds)
        print("Message embedded successfully")

        # Extract message
        extracted = lsb.extract_message(rounds=rounds)
        print(f"Extracted message: {extracted[-10:]}")

        # Calculate PSNR
        psnr = lsb.calculate_psnr(cover_image, stego_image)
        print(f"PSNR: {psnr:.2f} dB")

        # Calculate capacity and BPP
        max_capacity = lsb.calculate_capacity(cover_image, rounds)
        bpp = lsb.calculate_bpp(message, cover_image, rounds)
        print(f"Maximum capacity: {max_capacity} bytes")
        print(f"Bits per pixel (BPP): {bpp:.4f}")

        # Display original and stego images
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
        ax1.imshow(Image.open(cover_image))
        ax1.set_title('Original Image')
        ax1.axis('off')
        ax2.imshow(Image.open(stego_image))
        ax2.set_title('Stego Image')
        ax2.axis('off')
        plt.show()

    except Exception as e:
        print(f"Error: {str(e)}")





