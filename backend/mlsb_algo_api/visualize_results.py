import os
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from PIL import Image
import numpy as np


def visualize_comparison(results_csv_path, output_dir):
    """
    Create side-by-side visual comparisons of cover and stego images with metrics.
    
    Args:
        results_csv_path (str): Path to the full_results.csv file
        output_dir (str): Directory containing the stego images
    """
    # Read results
    df = pd.read_csv(results_csv_path)
    
    # Filter out failed experiments
    df = df[df['MSE'].notna()]
    
    # Get unique images and payloads
    images = df['Image'].unique()
    payloads = df['Payload'].unique()
    
    # Create visualization directory
    viz_dir = os.path.join(os.path.dirname(results_csv_path), 'visualizations')
    os.makedirs(viz_dir, exist_ok=True)
    
    print("=" * 80)
    print("GENERATING VISUAL COMPARISONS")
    print("=" * 80)
    print(f"Output directory: {viz_dir}\n")
    
    comparison_count = 0
    
    for image_name in images:
        for payload_name in payloads:
            # Get results for this image-payload combination
            subset = df[(df['Image'] == image_name) & (df['Payload'] == payload_name)]
            
            if len(subset) == 0:
                continue
            
            comparison_count += 1
            
            # Load cover image
            cover_path = os.path.join(os.path.dirname(output_dir), 'tests', 'cover_image', image_name)
            
            if not os.path.exists(cover_path):
                print(f"⚠ Cover image not found: {cover_path}")
                continue
            
            cover_img = Image.open(cover_path).convert('RGB')
            
            # Create figure with subplots: 1 cover + 3 stego images
            fig, axes = plt.subplots(2, 2, figsize=(16, 16))
            fig.suptitle(f'{image_name} + {payload_name}\nPayload Size: {subset.iloc[0]["Payload_Size_Bytes"]} bytes', 
                        fontsize=16, fontweight='bold')
            
            # Plot cover image
            axes[0, 0].imshow(cover_img)
            axes[0, 0].set_title('Cover Image (Original)', fontsize=14, fontweight='bold')
            axes[0, 0].axis('off')
            
            # Add cover image info
            cover_text = f"Resolution: {cover_img.size[0]}×{cover_img.size[1]}\n"
            cover_text += f"Size: {os.path.getsize(cover_path) / 1024:.1f} KB"
            axes[0, 0].text(0.02, 0.98, cover_text, 
                          transform=axes[0, 0].transAxes,
                          fontsize=10, verticalalignment='top',
                          bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
            
            # Plot stego images for each algorithm
            algorithms = ['LSB', '4-LSB', 'ML-LSB']
            positions = [(0, 1), (1, 0), (1, 1)]
            colors = ['#2ecc71', '#3498db', '#e74c3c']  # Green, Blue, Red
            
            for idx, (algo, pos, color) in enumerate(zip(algorithms, positions, colors)):
                algo_data = subset[subset['Algorithm'] == algo]
                
                if len(algo_data) == 0:
                    axes[pos].axis('off')
                    axes[pos].text(0.5, 0.5, f'{algo}\nNot Available', 
                                 ha='center', va='center', fontsize=14,
                                 transform=axes[pos].transAxes)
                    continue
                
                row = algo_data.iloc[0]
                stego_path = os.path.join(output_dir, row['Stego_Image'])
                
                if not os.path.exists(stego_path):
                    axes[pos].axis('off')
                    axes[pos].text(0.5, 0.5, f'{algo}\nImage Not Found', 
                                 ha='center', va='center', fontsize=14,
                                 transform=axes[pos].transAxes)
                    continue
                
                # Load and display stego image
                stego_img = Image.open(stego_path).convert('RGB')
                axes[pos].imshow(stego_img)
                axes[pos].set_title(f'{algo} Stego Image', fontsize=14, fontweight='bold', color=color)
                axes[pos].axis('off')
                
                # Create metrics text box
                metrics_text = f"METRICS:\n"
                metrics_text += f"━━━━━━━━━━━━━━━━━━━━\n"
                metrics_text += f"MSE: {row['MSE']:.4f}\n"
                metrics_text += f"PSNR: {row['PSNR_dB']:.2f} dB\n"
                metrics_text += f"SSIM: {row['SSIM']:.4f}\n"
                metrics_text += f"BPP: {row['BPP']:.4f}\n"
                metrics_text += f"━━━━━━━━━━━━━━━━━━━━\n"
                metrics_text += f"Capacity: {row['Capacity_Bytes'] / 1024:.1f} KB\n"
                metrics_text += f"Efficiency: {row['Embedding_Efficiency_%']:.1f}%\n"
                metrics_text += f"Time: {row['Embed_Time_Seconds']:.3f}s"
                
                # Add text box with metrics
                axes[pos].text(0.02, 0.98, metrics_text,
                             transform=axes[pos].transAxes,
                             fontsize=9, verticalalignment='top',
                             family='monospace',
                             bbox=dict(boxstyle='round', facecolor=color, alpha=0.15, 
                                     edgecolor=color, linewidth=2))
            
            # Adjust layout
            plt.tight_layout()
            
            # Save figure
            output_filename = f"{os.path.splitext(image_name)[0]}_{os.path.splitext(payload_name)[0]}_comparison.png"
            output_path = os.path.join(viz_dir, output_filename)
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            
            print(f"✓ [{comparison_count}] Generated: {output_filename}")
    
    print(f"\n{'='*80}")
    print(f"✓ Generated {comparison_count} visual comparisons")
    print(f"Location: {viz_dir}")
    print(f"{'='*80}\n")


def create_metrics_summary_chart(results_csv_path, output_dir):
    """
    Create summary charts comparing metrics across algorithms.
    """
    df = pd.read_csv(results_csv_path)
    df = df[df['MSE'].notna()]
    
    viz_dir = os.path.join(os.path.dirname(results_csv_path), 'visualizations')
    os.makedirs(viz_dir, exist_ok=True)
    
    print("\nGenerating summary charts...")
    
    # 1. PSNR comparison by payload size
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Algorithm Performance Comparison', fontsize=16, fontweight='bold')
    
    # Group by payload and algorithm
    grouped = df.groupby(['Payload', 'Algorithm']).agg({
        'PSNR_dB': 'mean',
        'SSIM': 'mean',
        'MSE': 'mean',
        'BPP': 'mean'
    }).reset_index()
    
    algorithms = ['LSB', '4-LSB', 'ML-LSB']
    colors = ['#2ecc71', '#3498db', '#e74c3c']
    
    # PSNR chart
    for algo, color in zip(algorithms, colors):
        algo_data = grouped[grouped['Algorithm'] == algo]
        axes[0, 0].plot(range(len(algo_data)), algo_data['PSNR_dB'], 
                       marker='o', linewidth=2, label=algo, color=color)
    axes[0, 0].set_xlabel('Payload Index', fontsize=12)
    axes[0, 0].set_ylabel('PSNR (dB)', fontsize=12)
    axes[0, 0].set_title('PSNR vs Payload Size', fontsize=14, fontweight='bold')
    axes[0, 0].legend()
    axes[0, 0].grid(True, alpha=0.3)
    
    # SSIM chart
    for algo, color in zip(algorithms, colors):
        algo_data = grouped[grouped['Algorithm'] == algo]
        axes[0, 1].plot(range(len(algo_data)), algo_data['SSIM'], 
                       marker='s', linewidth=2, label=algo, color=color)
    axes[0, 1].set_xlabel('Payload Index', fontsize=12)
    axes[0, 1].set_ylabel('SSIM', fontsize=12)
    axes[0, 1].set_title('SSIM vs Payload Size', fontsize=14, fontweight='bold')
    axes[0, 1].legend()
    axes[0, 1].grid(True, alpha=0.3)
    
    # MSE chart
    for algo, color in zip(algorithms, colors):
        algo_data = grouped[grouped['Algorithm'] == algo]
        axes[1, 0].plot(range(len(algo_data)), algo_data['MSE'], 
                       marker='^', linewidth=2, label=algo, color=color)
    axes[1, 0].set_xlabel('Payload Index', fontsize=12)
    axes[1, 0].set_ylabel('MSE', fontsize=12)
    axes[1, 0].set_title('MSE vs Payload Size', fontsize=14, fontweight='bold')
    axes[1, 0].legend()
    axes[1, 0].grid(True, alpha=0.3)
    axes[1, 0].set_yscale('log')
    
    # BPP chart
    for algo, color in zip(algorithms, colors):
        algo_data = grouped[grouped['Algorithm'] == algo]
        axes[1, 1].plot(range(len(algo_data)), algo_data['BPP'], 
                       marker='d', linewidth=2, label=algo, color=color)
    axes[1, 1].set_xlabel('Payload Index', fontsize=12)
    axes[1, 1].set_ylabel('BPP (Bits Per Pixel)', fontsize=12)
    axes[1, 1].set_title('BPP vs Payload Size', fontsize=14, fontweight='bold')
    axes[1, 1].legend()
    axes[1, 1].grid(True, alpha=0.3)
    
    plt.tight_layout()
    summary_path = os.path.join(viz_dir, 'metrics_summary.png')
    plt.savefig(summary_path, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"✓ Generated: metrics_summary.png")


if __name__ == "__main__":
    # Define paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    results_dir = os.path.join(base_dir, 'experiment_results')
    results_csv = os.path.join(results_dir, 'full_results.csv')
    
    if not os.path.exists(results_csv):
        print(f"Error: Results file not found at {results_csv}")
        print("Please run experiment.py first.")
        exit(1)
    
    # Generate visualizations
    visualize_comparison(results_csv, results_dir)
    
    # Generate summary charts
    create_metrics_summary_chart(results_csv, results_dir)
    
    print("\n✓ All visualizations complete!")
    print(f"Check the 'experiment_results/visualizations' directory.")
