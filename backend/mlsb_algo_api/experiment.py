import os
import numpy as np
import pandas as pd
from PIL import Image
from MultiLayerLSB import MultiLayerLSB
from LSB import LSB
from FourLSB import FourLSB
import time
from datetime import datetime

"""

Why This Range?
Demonstrates capacity differences: LSB will fail at payload3+, 4-LSB will fail at payload6+
Shows quality degradation: Larger payloads modify more bit planes, causing visible PSNR/SSIM differences
Realistic use cases: Tests from small text files to large images/audio
Stress testing: Pushes each algorithm to its limits


Key Differences
Traditional LSB: Embeds sequentially in the 8th bit only (LSB), one bit per pixel
4-LSB: Embeds 4 bits per pixel simultaneously (bits 5-8), distributing across those layers
ML-LSB: Embeds distributed across all 8 bits with a specific pattern (your proposed algorithm)
Your current ML-LSB implementation embeds sequentially by rounds (fill round 0 completely, then round 1, etc.), which is NOT the same as traditional LSB or 4-LSB.

Instead of left-to-right, top-to-bottom, use a pseudo-random sequence:

python
# Generate deterministic random pixel order
np.random.seed(key_based_seed)
pixel_indices = np.random.permutation(total_pixels)
"""


def run_comprehensive_experiment():
    """
    Comprehensive experiment comparing ML-LSB (8 rounds), 4-LSB (4 rounds), and LSB (1 round)
    across all test images and payloads.
    """
    
    # Define paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cover_image_dir = os.path.join(base_dir, 'tests', 'cover_image')
    payload_dir = os.path.join(base_dir, 'tests', 'payloads')
    output_dir = os.path.join(base_dir, 'experiment_results')
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Define test images (excluding the stego image)
    test_images = ['baboon.tiff', 'jet.tiff', 'lake.tiff', 'lena.tiff', 'peppers.tiff']
    
    # Define payloads
    payloads = [
        'payload1.txt',  # 4000 bytes
        'payload2.txt',  # 6000 bytes
        'payload3.txt',  # 8000 bytes
        'payload4.txt',  # 10000 bytes
        'payload5.txt',  # 12000 bytes
        'payload6.txt',  # 14000 bytes
        'payload7.txt'   # 16000 bytes
    ]
    
    # Define algorithms: (name, class, rounds/None)
    algorithms = [
        ('LSB', LSB, None),
        ('4-LSB', FourLSB, None),
        ('ML-LSB', MultiLayerLSB, 8)
    ]
    
    # Store results
    results = []
    
    print("=" * 80)
    print("STEGANOGRAPHY ALGORITHM COMPARISON EXPERIMENT")
    print("=" * 80)
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"\nTest Images: {len(test_images)}")
    print(f"Payloads: {len(payloads)}")
    print(f"Algorithms: {', '.join([a[0] for a in algorithms])}")
    print(f"Total Tests: {len(test_images) * len(payloads) * len(algorithms)}")
    print("=" * 80)
    print()
    
    # Run experiments
    test_count = 0
    total_tests = len(test_images) * len(payloads) * len(algorithms)
    
    for image_name in test_images:
        cover_image_path = os.path.join(cover_image_dir, image_name)
        
        print(f"\n{'='*80}")
        print(f"Testing Image: {image_name}")
        print(f"{'='*80}")
        
        for payload_name in payloads:
            payload_path = os.path.join(payload_dir, payload_name)
            payload_size = os.path.getsize(payload_path)
            
            print(f"\n  Payload: {payload_name} ({payload_size} bytes)")
            
            for algo_name, algo_class, rounds in algorithms:
                test_count += 1
                
                try:
                    # Create unique stego image path
                    stego_filename = f"{os.path.splitext(image_name)[0]}_{os.path.splitext(payload_name)[0]}_{algo_name}_stego.png"
                    stego_path = os.path.join(output_dir, stego_filename)
                    
                    print(f"    [{test_count}/{total_tests}] Testing {algo_name}...", end=" ")
                    
                    # Start timing
                    start_time = time.time()
                    
                    # Embed message using the appropriate algorithm
                    if algo_name == 'ML-LSB':
                        stego_path, key, iv = algo_class.embed_message(
                            cover_image_path=cover_image_path,
                            stego_image_path=stego_path,
                            file_path=payload_path,
                            rounds=rounds,
                            is_encrypted=False
                        )
                    else:
                        stego_path, key, iv = algo_class.embed_message(
                            cover_image_path=cover_image_path,
                            stego_image_path=stego_path,
                            file_path=payload_path,
                            is_encrypted=False
                        )
                    
                    embed_time = time.time() - start_time
                    
                    # Calculate metrics
                    mse = MultiLayerLSB.calculate_mse(cover_image_path, stego_path)
                    psnr = MultiLayerLSB.calculate_psnr(cover_image_path, stego_path)
                    ssim = MultiLayerLSB.calculate_ssim(cover_image_path, stego_path)
                    
                    # Calculate capacity and BPP based on algorithm
                    if algo_name == 'ML-LSB':
                        capacity = MultiLayerLSB.calculate_capacity(cover_image_path, rounds)
                        bpp = MultiLayerLSB.calculate_bpp(payload_path, cover_image_path, rounds)
                    elif algo_name == '4-LSB':
                        capacity = algo_class.calculate_capacity(cover_image_path)
                        bpp = MultiLayerLSB.calculate_bpp(payload_path, cover_image_path, rounds=4)
                    else:  # LSB
                        capacity = algo_class.calculate_capacity(cover_image_path)
                        bpp = MultiLayerLSB.calculate_bpp(payload_path, cover_image_path, rounds=1)
                    
                    # Calculate embedding efficiency (payload size / capacity)
                    embedding_efficiency = (payload_size / capacity) * 100 if capacity > 0 else 0
                    
                    # Store results
                    result = {
                        'Image': image_name,
                        'Payload': payload_name,
                        'Payload_Size_Bytes': payload_size,
                        'Algorithm': algo_name,
                        'Rounds': rounds if rounds else (4 if algo_name == '4-LSB' else 1),
                        'MSE': mse,
                        'PSNR_dB': psnr,
                        'SSIM': ssim,
                        'Capacity_Bytes': capacity,
                        'BPP': bpp,
                        'Embedding_Efficiency_%': embedding_efficiency,
                        'Embed_Time_Seconds': embed_time,
                        'Stego_Image': stego_filename
                    }
                    
                    results.append(result)
                    
                    print(f"✓ (MSE: {mse:.4f}, PSNR: {psnr:.2f} dB, SSIM: {ssim:.4f}, BPP: {bpp:.4f})")
                    
                except Exception as e:
                    print(f"✗ Error: {str(e)}")
                    result = {
                        'Image': image_name,
                        'Payload': payload_name,
                        'Payload_Size_Bytes': payload_size,
                        'Algorithm': algo_name,
                        'Rounds': rounds if rounds else (4 if algo_name == '4-LSB' else 1),
                        'MSE': None,
                        'PSNR_dB': None,
                        'SSIM': None,
                        'Capacity_Bytes': None,
                        'BPP': None,
                        'Embedding_Efficiency_%': None,
                        'Embed_Time_Seconds': None,
                        'Stego_Image': None,
                        'Error': str(e)
                    }
                    results.append(result)
    
    # Create DataFrame
    df = pd.DataFrame(results)
    
    # Save full results to CSV
    csv_path = os.path.join(output_dir, 'full_results.csv')
    df.to_csv(csv_path, index=False)
    print(f"\n{'='*80}")
    print(f"Full results saved to: {csv_path}")
    
    # Generate summary statistics
    print(f"\n{'='*80}")
    print("SUMMARY STATISTICS BY ALGORITHM")
    print(f"{'='*80}\n")
    
    summary_stats = df.groupby('Algorithm').agg({
        'MSE': ['mean', 'std', 'min', 'max'],
        'PSNR_dB': ['mean', 'std', 'min', 'max'],
        'SSIM': ['mean', 'std', 'min', 'max'],
        'BPP': ['mean', 'std', 'min', 'max'],
        'Capacity_Bytes': ['mean', 'min', 'max'],
        'Embed_Time_Seconds': ['mean', 'std']
    }).round(4)
    
    print(summary_stats)
    
    # Save summary statistics
    summary_path = os.path.join(output_dir, 'summary_statistics.csv')
    summary_stats.to_csv(summary_path)
    print(f"\nSummary statistics saved to: {summary_path}")
    
    # Generate comparison tables by image
    print(f"\n{'='*80}")
    print("AVERAGE METRICS BY IMAGE AND ALGORITHM")
    print(f"{'='*80}\n")
    
    for metric in ['MSE', 'PSNR_dB', 'SSIM', 'BPP']:
        print(f"\n{metric}:")
        pivot = df.pivot_table(
            values=metric,
            index='Image',
            columns='Algorithm',
            aggfunc='mean'
        ).round(4)
        print(pivot)
        print()
    
    # Generate comparison tables by payload size
    print(f"\n{'='*80}")
    print("AVERAGE METRICS BY PAYLOAD AND ALGORITHM")
    print(f"{'='*80}\n")
    
    for metric in ['MSE', 'PSNR_dB', 'SSIM', 'BPP']:
        print(f"\n{metric}:")
        pivot = df.pivot_table(
            values=metric,
            index='Payload',
            columns='Algorithm',
            aggfunc='mean'
        ).round(4)
        print(pivot)
        print()
    
    # Save pivot tables
    for metric in ['MSE', 'PSNR_dB', 'SSIM', 'BPP']:
        # By image
        pivot_image = df.pivot_table(
            values=metric,
            index='Image',
            columns='Algorithm',
            aggfunc='mean'
        ).round(4)
        pivot_image_path = os.path.join(output_dir, f'{metric}_by_image.csv')
        pivot_image.to_csv(pivot_image_path)
        
        # By payload
        pivot_payload = df.pivot_table(
            values=metric,
            index='Payload',
            columns='Algorithm',
            aggfunc='mean'
        ).round(4)
        pivot_payload_path = os.path.join(output_dir, f'{metric}_by_payload.csv')
        pivot_payload.to_csv(pivot_payload_path)
    
    print(f"\n{'='*80}")
    print(f"All pivot tables saved to: {output_dir}")
    
    # Generate capacity comparison
    print(f"\n{'='*80}")
    print("CAPACITY COMPARISON (Bytes)")
    print(f"{'='*80}\n")
    
    capacity_comparison = df.groupby(['Image', 'Algorithm'])['Capacity_Bytes'].first().unstack()
    print(capacity_comparison)
    capacity_path = os.path.join(output_dir, 'capacity_comparison.csv')
    capacity_comparison.to_csv(capacity_path)
    print(f"\nCapacity comparison saved to: {capacity_path}")
    
    # Generate best algorithm recommendations
    print(f"\n{'='*80}")
    print("ALGORITHM PERFORMANCE RANKING")
    print(f"{'='*80}\n")
    
    # Higher is better for PSNR and SSIM
    # Lower is better for MSE
    # BPP depends on use case
    
    algo_ranking = df.groupby('Algorithm').agg({
        'PSNR_dB': 'mean',
        'SSIM': 'mean',
        'MSE': 'mean',
        'BPP': 'mean',
        'Capacity_Bytes': 'mean'
    }).round(4)
    
    print("Average Performance Metrics:")
    print(algo_ranking)
    print()
    
    print("Rankings (1 = Best):")
    print(f"  PSNR (Higher is better): {algo_ranking['PSNR_dB'].rank(ascending=False).to_dict()}")
    print(f"  SSIM (Higher is better): {algo_ranking['SSIM'].rank(ascending=False).to_dict()}")
    print(f"  MSE (Lower is better): {algo_ranking['MSE'].rank(ascending=True).to_dict()}")
    print(f"  Capacity (Higher is better): {algo_ranking['Capacity_Bytes'].rank(ascending=False).to_dict()}")
    
    print(f"\n{'='*80}")
    print(f"Experiment completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Total tests run: {test_count}")
    print(f"Results directory: {output_dir}")
    print(f"{'='*80}\n")
    
    return df


def generate_latex_tables(df, output_dir):
    """
    Generate LaTeX-formatted tables for research paper inclusion.
    """
    latex_dir = os.path.join(output_dir, 'latex_tables')
    os.makedirs(latex_dir, exist_ok=True)
    
    print(f"\n{'='*80}")
    print("GENERATING LATEX TABLES")
    print(f"{'='*80}\n")
    
    # Table 1: Average metrics by algorithm
    summary = df.groupby('Algorithm').agg({
        'MSE': 'mean',
        'PSNR_dB': 'mean',
        'SSIM': 'mean',
        'BPP': 'mean',
        'Capacity_Bytes': 'mean'
    }).round(4)
    
    latex_summary = summary.to_latex()
    with open(os.path.join(latex_dir, 'summary_table.tex'), 'w') as f:
        f.write(latex_summary)
    print("Summary table saved to: latex_tables/summary_table.tex")
    
    # Table 2: PSNR comparison by image
    psnr_pivot = df.pivot_table(
        values='PSNR_dB',
        index='Image',
        columns='Algorithm',
        aggfunc='mean'
    ).round(2)
    
    latex_psnr = psnr_pivot.to_latex()
    with open(os.path.join(latex_dir, 'psnr_by_image.tex'), 'w') as f:
        f.write(latex_psnr)
    print("PSNR table saved to: latex_tables/psnr_by_image.tex")
    
    # Table 3: SSIM comparison by image
    ssim_pivot = df.pivot_table(
        values='SSIM',
        index='Image',
        columns='Algorithm',
        aggfunc='mean'
    ).round(4)
    
    latex_ssim = ssim_pivot.to_latex()
    with open(os.path.join(latex_dir, 'ssim_by_image.tex'), 'w') as f:
        f.write(latex_ssim)
    print("SSIM table saved to: latex_tables/ssim_by_image.tex")
    
    print(f"\nAll LaTeX tables saved to: {latex_dir}")


if __name__ == "__main__":
    # Run the comprehensive experiment
    df = run_comprehensive_experiment()
    
    # Generate LaTeX tables for paper
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'experiment_results')
    generate_latex_tables(df, output_dir)
    
    print("\n✓ Experiment complete! Check the 'experiment_results' directory for all outputs.")
