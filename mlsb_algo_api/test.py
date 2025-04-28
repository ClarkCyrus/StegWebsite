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

    return stego_image, message_size, max_capacity, psnr, bpp

def extract_message(stego_image, output_extracted_file, rounds=3):
    extracted = MultiLayerLSB.extract_message(stego_image, rounds=rounds, output_path=output_extracted_file)
    
    # Get extracted message size
    with open(output_extracted_file, 'rb') as f:
        extracted_size = len(f.read())
    print(f"Extracted message size: {extracted_size} bytes")
    
    return extracted_size

def display_images_with_metrics(image_paths, titles, metrics):
    n = len(image_paths)
    fig, axes = plt.subplots(1, n, figsize=(6*n, 7))
    if n == 1:
        axes = [axes]
    for i, (ax, img_path) in enumerate(zip(axes, image_paths)):
        ax.imshow(Image.open(img_path))
        ax.set_title(titles[i], fontsize=16)
        ax.axis('off')
        # Add metrics as text below the image
        if metrics[i]:
            ax.text(0.5, -0.15, metrics[i], fontsize=12, ha='center', va='top', transform=ax.transAxes, wrap=True)
    plt.tight_layout()
    plt.show()

def test_all_types():
    cover_image = "tests/cover_image/peppers.tiff"
    rounds = 3

    # Text
    print("\n--- Testing TEXT message ---")
    text_file = "tests/text_message/lsbpayload.txt"
    stego_text, msg_size, max_cap, psnr, bpp = embed_and_analyze(cover_image, text_file, rounds)
    extracted_text = "tests/output/lsbpayload_extracted.txt"
    extracted_size = extract_message(stego_text, extracted_text, rounds)
    metrics = [
        f"Message size: {msg_size} bytes\nMax capacity: {max_cap} bytes",
        f"PSNR: {psnr:.2f} dB\nBPP: {bpp:.4f}\nExtracted size: {extracted_size} bytes"
    ]
    display_images_with_metrics([cover_image, stego_text], ["Original", "Stego (Text)"], metrics)

    # Audio
    print("\n--- Testing AUDIO message ---")
    audio_file = "tests/audio_message/notif.mp3"
    stego_audio, msg_size, max_cap, psnr, bpp = embed_and_analyze(cover_image, audio_file, rounds)
    extracted_audio = "tests/output/notif_extracted.mp3"
    extracted_size = extract_message(stego_audio, extracted_audio, rounds)
    metrics = [
        f"Message size: {msg_size} bytes\nMax capacity: {max_cap} bytes",
        f"PSNR: {psnr:.2f} dB\nBPP: {bpp:.4f}\nExtracted size: {extracted_size} bytes"
    ]
    display_images_with_metrics([cover_image, stego_audio], ["Original", "Stego (Audio)"], metrics)

    # Image
    print("\n--- Testing IMAGE message ---")
    image_file = "tests/image_message/lena.png"
    stego_image, msg_size, max_cap, psnr, bpp = embed_and_analyze(cover_image, image_file, rounds)
    extracted_image = "tests/output/lena_extracted.png"
    extracted_size = extract_message(stego_image, extracted_image, rounds)
    metrics = [
        f"Message size: {msg_size} bytes\nMax capacity: {max_cap} bytes",
        f"PSNR: {psnr:.2f} dB\nBPP: {bpp:.4f}\nExtracted size: {extracted_size} bytes",
        f"Extracted image size: {extracted_size} bytes"
    ]
    display_images_with_metrics([cover_image, stego_image, extracted_image], ["Original", "Stego (Image)", "Extracted Image"], metrics)

if __name__ == "__main__":
    test_all_types()