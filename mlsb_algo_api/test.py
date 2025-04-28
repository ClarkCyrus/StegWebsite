from MultiLayerLSB import MultiLayerLSB 

# matplotlib.use('Qt5Agg')  # for Linux
import matplotlib.pyplot as plt
from PIL import Image
import os

def embed_and_analyze(cover_image, message_file, rounds=3):
    lsb = MultiLayerLSB(cover_image, stego_image)
    lsb.embed_message(message_file, rounds=rounds)
    print("Message embedded successfully.")

    psnr = MultiLayerLSB.calculate_psnr(cover_image, stego_image)
    max_capacity = MultiLayerLSB.calculate_capacity(cover_image, rounds=rounds)
    bpp = MultiLayerLSB.calculate_bpp(message_file, cover_image, rounds=rounds)

    print(f"PSNR: {psnr:.2f} dB")
    print(f"Maximum capacity: {max_capacity} bytes")
    print(f"Bits per pixel (BPP): {bpp:.4f}")

    return stego_image

def extract_message(stego_image, output_extracted_file, rounds=3):
    extracted = MultiLayerLSB.extract_message(stego_image, rounds=rounds, output_path=output_extracted_file)
    print(f"Extracted message: {extracted}")
    
    return output_extracted_file

def display_images(original_path, stego_path):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 6))
    ax1.imshow(Image.open(original_path))
    ax1.set_title('Original Image')
    ax1.axis('off')
    ax2.imshow(Image.open(stego_path))
    ax2.set_title('Stego Image')
    ax2.axis('off')
    plt.show()

if __name__ == "__main__":
    cover_image = "tests/input/peppers.tiff"
    message_file = "tests/input/lsbpayload.txt"

    base_name = os.path.splitext(cover_image)[0]
    stego_image = f"{base_name}_stego{os.path.splitext(cover_image)[1]}"

    base_message_name = os.path.splitext(message_file)[0]
    output_extracted_file = f"{base_message_name}_extracted{os.path.splitext(message_file)[1]}"

    
    stego_image = embed_and_analyze(cover_image, message_file)

    extracted_file = extract_message(stego_image, output_extracted_file)

    display_images(cover_image, stego_image)