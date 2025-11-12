import os
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from PIL import Image
import numpy as np
import seaborn as sns
from scipy import stats


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


def create_detailed_metrics_charts(results_csv_path):
    """
    Create detailed charts focusing on MSE, PSNR, SSIM, and BPP metrics.
    """
    df = pd.read_csv(results_csv_path)
    df = df[df['MSE'].notna()]
    
    viz_dir = os.path.join(os.path.dirname(results_csv_path), 'visualizations')
    os.makedirs(viz_dir, exist_ok=True)
    
    print("\n" + "="*80)
    print("GENERATING DETAILED METRICS CHARTS")
    print("="*80)
    
    algorithms = ['LSB', '4-LSB', 'ML-LSB']
    colors = {'LSB': '#2ecc71', '4-LSB': '#3498db', 'ML-LSB': '#e74c3c'}
    
    # 1. Box plots for each metric
    print("\n[1/8] Creating box plots for metric distributions...")
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Metric Distributions by Algorithm', fontsize=16, fontweight='bold')
    
    metrics = [('PSNR_dB', 'PSNR (dB)'), ('SSIM', 'SSIM'), ('MSE', 'MSE'), ('BPP', 'BPP')]
    positions = [(0, 0), (0, 1), (1, 0), (1, 1)]
    
    for (metric, label), pos in zip(metrics, positions):
        data_to_plot = [df[df['Algorithm'] == algo][metric].values for algo in algorithms]
        bp = axes[pos].boxplot(data_to_plot, labels=algorithms, patch_artist=True,
                               showmeans=True, meanline=True)
        
        # Color the boxes
        for patch, algo in zip(bp['boxes'], algorithms):
            patch.set_facecolor(colors[algo])
            patch.set_alpha(0.6)
        
        axes[pos].set_ylabel(label, fontsize=12, fontweight='bold')
        axes[pos].set_title(f'{label} Distribution', fontsize=13, fontweight='bold')
        axes[pos].grid(True, alpha=0.3, axis='y')
        
        if metric == 'MSE':
            axes[pos].set_yscale('log')
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'metrics_boxplots.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("✓ Saved: metrics_boxplots.png")
    
    # 2. Scatter plot: PSNR vs SSIM
    print("[2/8] Creating PSNR vs SSIM scatter plot...")
    fig, ax = plt.subplots(figsize=(12, 8))
    
    for algo in algorithms:
        algo_data = df[df['Algorithm'] == algo]
        ax.scatter(algo_data['PSNR_dB'], algo_data['SSIM'], 
                  label=algo, color=colors[algo], alpha=0.6, s=100, edgecolors='black')
    
    ax.set_xlabel('PSNR (dB)', fontsize=13, fontweight='bold')
    ax.set_ylabel('SSIM', fontsize=13, fontweight='bold')
    ax.set_title('PSNR vs SSIM Correlation', fontsize=15, fontweight='bold')
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'psnr_vs_ssim_scatter.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("✓ Saved: psnr_vs_ssim_scatter.png")
    
    # 3. MSE vs BPP scatter plot
    print("[3/8] Creating MSE vs BPP scatter plot...")
    fig, ax = plt.subplots(figsize=(12, 8))
    
    for algo in algorithms:
        algo_data = df[df['Algorithm'] == algo]
        ax.scatter(algo_data['BPP'], algo_data['MSE'], 
                  label=algo, color=colors[algo], alpha=0.6, s=100, edgecolors='black')
    
    ax.set_xlabel('BPP (Bits Per Pixel)', fontsize=13, fontweight='bold')
    ax.set_ylabel('MSE', fontsize=13, fontweight='bold')
    ax.set_title('MSE vs BPP Relationship', fontsize=15, fontweight='bold')
    ax.set_yscale('log')
    ax.legend(fontsize=11)
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'mse_vs_bpp_scatter.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("✓ Saved: mse_vs_bpp_scatter.png")
    
    # 4. Heatmap of average metrics by image and algorithm
    print("[4/8] Creating heatmap of metrics by image...")
    fig, axes = plt.subplots(2, 2, figsize=(18, 14))
    fig.suptitle('Average Metrics by Image and Algorithm', fontsize=16, fontweight='bold')
    
    for (metric, label), ax in zip(metrics, axes.flat):
        pivot_data = df.pivot_table(values=metric, index='Image', columns='Algorithm', aggfunc='mean')
        pivot_data = pivot_data[algorithms]  # Ensure correct order
        
        sns.heatmap(pivot_data, annot=True, fmt='.3f', cmap='RdYlGn_r' if metric == 'MSE' else 'RdYlGn',
                   ax=ax, cbar_kws={'label': label}, linewidths=0.5)
        ax.set_title(f'Average {label} by Image', fontsize=13, fontweight='bold')
        ax.set_xlabel('Algorithm', fontsize=11, fontweight='bold')
        ax.set_ylabel('Image', fontsize=11, fontweight='bold')
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'metrics_heatmap_by_image.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("✓ Saved: metrics_heatmap_by_image.png")
    
    # 5. Line plots showing metric trends with payload size
    print("[5/8] Creating metric trends by payload size...")
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Metric Trends vs Payload Size', fontsize=16, fontweight='bold')
    
    # Group by payload size and algorithm
    grouped = df.groupby(['Payload_Size_Bytes', 'Algorithm']).agg({
        'PSNR_dB': 'mean',
        'SSIM': 'mean',
        'MSE': 'mean',
        'BPP': 'mean'
    }).reset_index()
    
    for (metric, label), ax in zip(metrics, axes.flat):
        for algo in algorithms:
            algo_data = grouped[grouped['Algorithm'] == algo].sort_values('Payload_Size_Bytes')
            ax.plot(algo_data['Payload_Size_Bytes'] / 1000, algo_data[metric], 
                   marker='o', linewidth=2.5, label=algo, color=colors[algo], markersize=8)
        
        ax.set_xlabel('Payload Size (KB)', fontsize=12, fontweight='bold')
        ax.set_ylabel(label, fontsize=12, fontweight='bold')
        ax.set_title(f'{label} vs Payload Size', fontsize=13, fontweight='bold')
        ax.legend(fontsize=10)
        ax.grid(True, alpha=0.3)
        
        if metric == 'MSE':
            ax.set_yscale('log')
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'metrics_vs_payload_size.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("✓ Saved: metrics_vs_payload_size.png")
    
    # 6. Statistical comparison table
    print("[6/8] Creating statistical summary table...")
    fig, ax = plt.subplots(figsize=(14, 8))
    ax.axis('tight')
    ax.axis('off')
    
    stats_data = []
    for algo in algorithms:
        algo_df = df[df['Algorithm'] == algo]
        stats_data.append([
            algo,
            f"{algo_df['PSNR_dB'].mean():.2f} ± {algo_df['PSNR_dB'].std():.2f}",
            f"{algo_df['SSIM'].mean():.4f} ± {algo_df['SSIM'].std():.4f}",
            f"{algo_df['MSE'].mean():.4f} ± {algo_df['MSE'].std():.4f}",
            f"{algo_df['BPP'].mean():.4f} ± {algo_df['BPP'].std():.4f}",
            f"{algo_df['Embed_Time_Seconds'].mean():.3f}s",
            f"{algo_df['Embedding_Efficiency_%'].mean():.1f}%"
        ])
    
    table = ax.table(cellText=stats_data,
                    colLabels=['Algorithm', 'PSNR (dB)', 'SSIM', 'MSE', 'BPP', 'Avg Time', 'Efficiency'],
                    cellLoc='center',
                    loc='center',
                    colWidths=[0.12, 0.15, 0.15, 0.15, 0.15, 0.13, 0.13])
    
    table.auto_set_font_size(False)
    table.set_fontsize(11)
    table.scale(1, 2.5)
    
    # Style header
    for i in range(7):
        table[(0, i)].set_facecolor('#34495e')
        table[(0, i)].set_text_props(weight='bold', color='white')
    
    # Color rows by algorithm
    for i, algo in enumerate(algorithms, start=1):
        table[(i, 0)].set_facecolor(colors[algo])
        table[(i, 0)].set_text_props(weight='bold', color='white')
        for j in range(1, 7):
            table[(i, j)].set_facecolor(colors[algo])
            table[(i, j)].set_alpha(0.2)
    
    plt.title('Statistical Summary of Metrics (Mean ± Std)', fontsize=15, fontweight='bold', pad=20)
    plt.savefig(os.path.join(viz_dir, 'statistical_summary.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("✓ Saved: statistical_summary.png")
    
    # 7. Radar chart comparing algorithms
    print("[7/8] Creating radar chart for algorithm comparison...")
    fig, ax = plt.subplots(figsize=(10, 10), subplot_kw=dict(projection='polar'))
    
    # Normalize metrics to 0-1 scale for comparison
    categories = ['PSNR', 'SSIM', 'BPP', 'Speed', 'Efficiency']
    N = len(categories)
    
    angles = [n / float(N) * 2 * np.pi for n in range(N)]
    angles += angles[:1]
    
    ax.set_theta_offset(np.pi / 2)
    ax.set_theta_direction(-1)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, fontsize=12, fontweight='bold')
    
    for algo in algorithms:
        algo_df = df[df['Algorithm'] == algo]
        
        # Normalize values (higher is better for all)
        psnr_norm = algo_df['PSNR_dB'].mean() / df['PSNR_dB'].max()
        ssim_norm = algo_df['SSIM'].mean()
        bpp_norm = algo_df['BPP'].mean() / df['BPP'].max()
        speed_norm = 1 - (algo_df['Embed_Time_Seconds'].mean() / df['Embed_Time_Seconds'].max())
        efficiency_norm = algo_df['Embedding_Efficiency_%'].mean() / 100
        
        values = [psnr_norm, ssim_norm, bpp_norm, speed_norm, efficiency_norm]
        values += values[:1]
        
        ax.plot(angles, values, 'o-', linewidth=2, label=algo, color=colors[algo])
        ax.fill(angles, values, alpha=0.15, color=colors[algo])
    
    ax.set_ylim(0, 1)
    ax.set_title('Algorithm Performance Radar Chart\n(Normalized Metrics)', 
                fontsize=15, fontweight='bold', pad=20)
    ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), fontsize=11)
    ax.grid(True)
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'algorithm_radar_chart.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("✓ Saved: algorithm_radar_chart.png")
    
    # 8. Correlation matrix
    print("[8/8] Creating correlation matrix...")
    fig, ax = plt.subplots(figsize=(10, 8))
    
    corr_metrics = ['PSNR_dB', 'SSIM', 'MSE', 'BPP', 'Payload_Size_Bytes', 
                    'Embed_Time_Seconds', 'Embedding_Efficiency_%']
    corr_data = df[corr_metrics].corr()
    
    sns.heatmap(corr_data, annot=True, fmt='.2f', cmap='coolwarm', center=0,
               square=True, linewidths=1, cbar_kws={"shrink": 0.8}, ax=ax)
    
    ax.set_title('Correlation Matrix of All Metrics', fontsize=15, fontweight='bold', pad=15)
    
    plt.tight_layout()
    plt.savefig(os.path.join(viz_dir, 'correlation_matrix.png'), dpi=150, bbox_inches='tight')
    plt.close()
    print("✓ Saved: correlation_matrix.png")
    
    print("\n" + "="*80)
    print("✓ All detailed metrics charts generated successfully!")
    print(f"Location: {viz_dir}")
    print("="*80)


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
    print("\nStarting visualization generation...\n")
    
    # 1. Visual comparisons of images
    visualize_comparison(results_csv, results_dir)
    
    # 2. Basic summary charts
    create_metrics_summary_chart(results_csv, results_dir)
    
    # 3. Detailed metrics analysis
    create_detailed_metrics_charts(results_csv)
    
    print("\n" + "="*80)
    print("✓ ALL VISUALIZATIONS COMPLETE!")
    print("="*80)
    print(f"\nGenerated Charts:")
    print("  • Image comparisons (side-by-side with metrics)")
    print("  • Basic metrics summary")
    print("  • Box plots (metric distributions)")
    print("  • Scatter plots (PSNR vs SSIM, MSE vs BPP)")
    print("  • Heatmaps (metrics by image)")
    print("  • Trend lines (metrics vs payload size)")
    print("  • Statistical summary table")
    print("  • Radar chart (algorithm comparison)")
    print("  • Correlation matrix")
    print(f"\nLocation: {os.path.join(results_dir, 'visualizations')}")
    print("="*80)
