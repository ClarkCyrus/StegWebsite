from MultiLayerLSB import MultiLayerLSB 

# matplotlib.use('Qt5Agg')  # for Linux
import matplotlib.pyplot as plt
from PIL import Image

if __name__ == "__main__":
    cover_image = "tests/input/peppers.tiff"
    stego_image = "tests/output/peppers.tiff"
    message_file = "tests/input/lsbpayload.txt"  # Change this to your message file (e.g., .mp3 or .png)
    output_extracted_file = "tests/output/extracted_message.txt"  # Output path for extracted file

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