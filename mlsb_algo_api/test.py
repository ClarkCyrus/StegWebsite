from MultiLayerLSB import MultiLayerLSB 

# matplotlib.use('Qt5Agg')  # for Linux
import matplotlib.pyplot as plt
from PIL import Image
import os

def embed_and_analyze(cover_image, message_file, rounds=3):
    base_name = os.path.splitext(cover_image)[0]
    stego_image = f"{base_name}_stego{os.path.splitext(cover_image)[1]}"
    
    # Get message size
    with open(message_file, 'rb') as f:
        message_size = len(f.read())
    print(f"Message size: {message_size} bytes")
    
    # Get maximum capacity
    max_capacity = MultiLayerLSB.calculate_capacity(cover_image, rounds=rounds)
    print(f"Maximum capacity: {max_capacity} bytes")
    
    if message_size > max_capacity:
        print(f"Warning: Message size ({message_size} bytes) exceeds maximum capacity ({max_capacity} bytes)")
    
    MultiLayerLSB.embed_message(cover_image, stego_image, message_file, rounds=rounds)
    print("Message embedded successfully.")

    psnr = MultiLayerLSB.calculate_psnr(cover_image, stego_image)
    bpp = MultiLayerLSB.calculate_bpp(message_file, cover_image, rounds=rounds)

    print(f"PSNR: {psnr:.2f} dB")
    print(f"Bits per pixel (BPP): {bpp:.4f}")

    return stego_image

def extract_message(stego_image, output_extracted_file, rounds=3):
    extracted = MultiLayerLSB.extract_message(stego_image, rounds=rounds, output_path=output_extracted_file)
    
    # Get extracted message size
    with open(output_extracted_file, 'rb') as f:
        extracted_size = len(f.read())
    print(f"Extracted message size: {extracted_size} bytes")
    
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


def embed():
    cover_image = "tests/cover_image/peppers.tiff"
    message_file = "tests/text_message/payload1.txt"
    
    return embed_and_analyze(cover_image, message_file)

def extract():
    
    return extract_message("tests/cover_image/peppers_stego.tiff", "tests/output/payload1_extracted.txt")


if __name__ == "__main__":

    embed()

    extract()
    #display_images(cover_image, stego_image)