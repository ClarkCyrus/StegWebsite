# Visualization Guide for ML-LSB Experiment Results

## Overview
This guide explains how to use the enhanced `visualize_results.py` script to generate comprehensive graphical charts for analyzing steganography algorithm performance.

## Prerequisites

### Install Required Dependencies
```bash
pip install pandas matplotlib seaborn scipy pillow numpy
```

Or install from the requirements file:
```bash
cd backend
pip install -r requirements.txt
```

## Running the Visualization Script

### Basic Usage
```bash
cd backend/mlsb_algo_api
python visualize_results.py
```

The script will automatically:
1. Look for `experiment_results/full_results.csv`
2. Generate all visualizations
3. Save them to `experiment_results/visualizations/`

## Generated Charts

### 1. **Image Comparisons** (`*_comparison.png`)
- Side-by-side visual comparison of cover and stego images
- Displays metrics (MSE, PSNR, SSIM, BPP) for each algorithm
- One chart per image-payload combination

### 2. **Basic Metrics Summary** (`metrics_summary.png`)
- 4-panel chart showing PSNR, SSIM, MSE, and BPP trends
- Compares all three algorithms across different payloads
- Line plots with markers

### 3. **Metric Distribution Box Plots** (`metrics_boxplots.png`)
- Shows statistical distribution of each metric
- Displays mean, median, quartiles, and outliers
- Helps identify algorithm consistency and variance

### 4. **PSNR vs SSIM Scatter Plot** (`psnr_vs_ssim_scatter.png`)
- Correlation between PSNR and SSIM metrics
- Color-coded by algorithm
- Useful for understanding quality metric relationships

### 5. **MSE vs BPP Scatter Plot** (`mse_vs_bpp_scatter.png`)
- Shows relationship between embedding capacity and distortion
- Logarithmic scale for MSE
- Helps evaluate capacity-quality tradeoff

### 6. **Metrics Heatmap by Image** (`metrics_heatmap_by_image.png`)
- 4-panel heatmap showing average metrics per image
- Easy comparison across different test images
- Color-coded: green (good) to red (poor)

### 7. **Metrics vs Payload Size** (`metrics_vs_payload_size.png`)
- Trend lines showing how metrics change with payload size
- X-axis: Payload size in KB
- Helps understand scalability of algorithms

### 8. **Statistical Summary Table** (`statistical_summary.png`)
- Comprehensive table with mean ± standard deviation
- Includes PSNR, SSIM, MSE, BPP, time, and efficiency
- Color-coded by algorithm for easy reading

### 9. **Algorithm Radar Chart** (`algorithm_radar_chart.png`)
- Pentagon chart comparing normalized metrics
- Shows overall algorithm performance profile
- Metrics: PSNR, SSIM, BPP, Speed, Efficiency

### 10. **Correlation Matrix** (`correlation_matrix.png`)
- Heatmap showing correlations between all metrics
- Values range from -1 (negative) to +1 (positive)
- Helps identify metric dependencies

## Key Metrics Explained

### MSE (Mean Squared Error)
- **Lower is better**
- Measures pixel-level differences between cover and stego images
- Range: 0 (identical) to higher values (more distortion)

### PSNR (Peak Signal-to-Noise Ratio)
- **Higher is better**
- Measured in decibels (dB)
- Typical values: 30-50 dB (higher = better quality)
- >40 dB is considered excellent

### SSIM (Structural Similarity Index)
- **Higher is better**
- Range: 0 to 1 (1 = identical images)
- Measures perceptual similarity
- >0.95 is considered excellent

### BPP (Bits Per Pixel)
- **Higher = more capacity**
- Indicates embedding capacity
- LSB: ~1 BPP, 4-LSB: ~4 BPP, ML-LSB: ~8 BPP

## Customization

### Modify Colors
Edit the color dictionary in `visualize_results.py`:
```python
colors = {'LSB': '#2ecc71', '4-LSB': '#3498db', 'ML-LSB': '#e74c3c'}
```

### Change Output Resolution
Modify the `dpi` parameter in `plt.savefig()` calls:
```python
plt.savefig(output_path, dpi=300, bbox_inches='tight')  # Higher quality
```

### Add Custom Charts
Add new functions following this pattern:
```python
def create_custom_chart(results_csv_path):
    df = pd.read_csv(results_csv_path)
    df = df[df['MSE'].notna()]
    
    # Your visualization code here
    
    viz_dir = os.path.join(os.path.dirname(results_csv_path), 'visualizations')
    plt.savefig(os.path.join(viz_dir, 'custom_chart.png'), dpi=150)
    plt.close()
```

Then call it in the `__main__` section.

## Troubleshooting

### "Results file not found"
- Make sure you've run `experiment.py` first to generate `full_results.csv`
- Check that the file exists in `experiment_results/` directory

### Import Errors
- Install missing dependencies: `pip install pandas matplotlib seaborn scipy`
- Ensure you're using Python 3.7+

### Empty or Corrupted Charts
- Verify that `full_results.csv` contains valid data
- Check for NaN values in metric columns
- Ensure at least one successful experiment result exists

### Memory Issues
- Reduce DPI in `plt.savefig()` calls
- Process fewer images at once
- Close figures explicitly with `plt.close()`

## Output Directory Structure
```
experiment_results/
├── full_results.csv
├── visualizations/
│   ├── *_comparison.png (multiple files)
│   ├── metrics_summary.png
│   ├── metrics_boxplots.png
│   ├── psnr_vs_ssim_scatter.png
│   ├── mse_vs_bpp_scatter.png
│   ├── metrics_heatmap_by_image.png
│   ├── metrics_vs_payload_size.png
│   ├── statistical_summary.png
│   ├── algorithm_radar_chart.png
│   └── correlation_matrix.png
```

## Tips for Analysis

1. **Start with the statistical summary** to get overall performance metrics
2. **Use box plots** to identify outliers and consistency
3. **Check scatter plots** to understand metric relationships
4. **Review heatmaps** to see which images work best with each algorithm
5. **Examine trend lines** to understand how payload size affects quality
6. **Use radar chart** for quick algorithm comparison

## Example Workflow

```bash
# 1. Run experiments
cd backend/mlsb_algo_api
python experiment.py

# 2. Generate visualizations
python visualize_results.py

# 3. View results
cd experiment_results/visualizations
# Open PNG files with your preferred image viewer
```

## Advanced Usage

### Generate Only Specific Charts
Modify the `__main__` section to comment out unwanted functions:
```python
if __name__ == "__main__":
    # ... setup code ...
    
    # visualize_comparison(results_csv, results_dir)  # Skip this
    # create_metrics_summary_chart(results_csv, results_dir)  # Skip this
    create_detailed_metrics_charts(results_csv)  # Only run this
```

### Export Data for External Analysis
```python
import pandas as pd
df = pd.read_csv('experiment_results/full_results.csv')
df.to_excel('analysis.xlsx', index=False)  # Requires openpyxl
```

## Questions or Issues?
Check the main experiment documentation or review the code comments in `visualize_results.py`.
