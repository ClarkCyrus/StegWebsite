from MultiLayerLSB import MultiLayerLSB 

# matplotlib.use('Qt5Agg')  # for Linux
import matplotlib.pyplot as plt
from PIL import Image
import os

def embed_and_analyze(cover_image, message_file, rounds=3):
    base_name = os.path.splitext(cover_image)[0]
    stego_image = f"{base_name}_stego{os.path.splitext(cover_image)[1]}"
    
    MultiLayerLSB.embed_message(cover_image, stego_image, message_file, rounds=rounds)
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
    #print(f"Extracted message: {extracted}")
    
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
    message_file = "tests/text_message/lsbpayload.txt"
    
    return embed_and_analyze(cover_image, message_file)

def extract():
    
    return extract_message("tests/steg_image/peppers.tiff", "tests/output/clark.txt")


if __name__ == "__main__":

    embed()
    #display_images(cover_image, stego_image)