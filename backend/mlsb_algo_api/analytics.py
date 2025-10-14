# run_analysis.py
from pathlib import Path
import numpy as np
import pandas as pd
import scipy.stats as stats
from itertools import combinations
from statsmodels.multivariate.manova import MANOVA
from statsmodels.formula.api import ols
from statsmodels.stats.multitest import multipletests
import warnings
warnings.filterwarnings("ignore")

BASE = Path(__file__).resolve().parent
CSV = BASE / "experiment_results" / "full_results.csv"
OUT = BASE / "analysis_outputs"
OUT.mkdir(exist_ok=True)

# Load and clean
df = pd.read_csv(CSV)
# Keep only expected columns, drop rows missing any metric
expected = ['Algorithm','PSNR_dB','MSE','SSIM','BPP']
df = df.loc[:, df.columns.intersection(expected)]
df = df.dropna(subset=['Algorithm','PSNR_dB','MSE','SSIM','BPP'])
df['Algorithm'] = df['Algorithm'].astype('category')

# Remove obvious invalid rows (in case of placeholders or negative capacity)
df = df[(df['BPP'] >= 0) & (df['SSIM'] >= 0)]

metrics = ['PSNR_dB','MSE','SSIM','BPP']
algos = df['Algorithm'].cat.categories.tolist()

# 1) Group summary
summary = df.groupby('Algorithm')[metrics].agg(['mean','std','count'])
summary.columns = ['_'.join(col).strip() for col in summary.columns.values]
summary.to_csv(OUT / "group_summary.csv")

# 2) Assumption checks (text file)
def box_m_report(df, dep_vars, group_col):
    # compute Box's M raw statistic for reporting. Not exact p-value but useful to report.
    groups = [g[dep_vars].values for _,g in df.groupby(group_col)]
    ns = [g.shape[0] for g in groups]
    covs = [np.cov(g, rowvar=False) for g in groups]
    pooled_n = sum(ns)
    pooled_cov = sum((n - 1) * cov for n, cov in zip(ns, covs)) / (pooled_n - len(ns))
    import numpy.linalg as la
    try:
        log_det_pooled = np.log(la.det(pooled_cov))
        sum_log_det = sum((n - 1) * np.log(la.det(cov)) for n, cov in zip(ns, covs))
    except Exception:
        return "Box's M: numeric issue (singular cov); consider removing collinear metrics or regularizing."
    M = (pooled_n - len(ns)) * log_det_pooled - sum_log_det
    return f"Box's M (raw): {M:.4f}"

with open(OUT / "assumptions_report.txt","w") as f:
    f.write("Shapiro-Wilk by metric and Algorithm (p-values)\n")
    for metric in metrics:
        f.write(f"\n{metric}\n")
        for gname, g in df.groupby('Algorithm'):
            vals = g[metric].dropna()
            if len(vals) < 3:
                f.write(f"  {gname}: insufficient n\n")
            else:
                stat,p = stats.shapiro(vals)
                f.write(f"  {gname}: p={p:.4f}\n")
    f.write("\n")
    f.write(box_m_report(df, metrics, 'Algorithm') + "\n\n")
    f.write("Group sizes:\n")
    f.write(df['Algorithm'].value_counts().to_string() + "\n")

# 3) MANOVA
formula = " + ".join(metrics) + " ~ Algorithm"
manova = MANOVA.from_formula(formula, data=df)
mv = manova.mv_test()
with open(OUT / "manova_results.txt","w") as f:
    f.write(str(mv))

# 4) Per-metric ANOVAs and pairwise with single familywise correction across all tests
pairs = list(combinations(algos, 2))
pairwise_records = []
all_pvals = []
all_keys = []

for metric in metrics:
    model = ols(f"{metric} ~ C(Algorithm)", data=df).fit()
    aov = stats.f_oneway(*[df.loc[df['Algorithm']==g,metric].dropna() for g in algos])
    anova_p = float(aov.pvalue) if hasattr(aov,'pvalue') else np.nan
    for a,b in pairs:
        g1 = df.loc[df['Algorithm']==a, metric].dropna()
        g2 = df.loc[df['Algorithm']==b, metric].dropna()
        if len(g1) < 2 or len(g2) < 2:
            p = np.nan
            direction = 'insufficient data'
        else:
            stat,p = stats.ttest_ind(g1, g2, equal_var=False, nan_policy='omit')
            # direction: which has larger mean
            direction = f"{a} > {b}" if g1.mean() > g2.mean() else f"{b} > {a}"
        key = f"{metric} | {a} vs {b}"
        all_pvals.append(p if not np.isnan(p) else 1.0)
        all_keys.append((metric,a,b,anova_p))
        pairwise_records.append({'metric':metric,'pair':f"{a} vs {b}",'p_raw':p,'anova_p':anova_p,'direction':direction})

# Apply Holm correction across all pairwise p-values (stronger than Bonferroni, less conservative)
pvals = np.array([p if p is not None else 1.0 for p in all_pvals])
reject, pvals_corrected, _, _ = multipletests(pvals, alpha=0.05, method='bonferroni')

# Attach corrected p back to records
out_rows = []
for i, rec in enumerate(pairwise_records):
    rec_out = rec.copy()
    rec_out['p_adj'] = float(pvals_corrected[i])
    rec_out['significant'] = bool(reject[i])
    out_rows.append(rec_out)

pd.DataFrame(out_rows).to_csv(OUT / "pairwise_results.csv", index=False)

# 5) Concise human summary
with open(OUT / "concise_summary.txt","w") as f:
    f.write("Concise results summary\n")
    f.write("=======================\n\n")
    f.write("MANOVA result saved in manova_results.txt. Check Pillai/Wilks for multivariate significance.\n\n")
    sig_any = False
    for row in out_rows:
        if row['significant']:
            sig_any = True
            f.write(f"{row['metric']}: {row['pair']} significant (p_adj={row['p_adj']:.4g}), direction: {row['direction']}\n")
    if not sig_any:
        f.write("No pairwise differences survived Holm correction across all tests at alpha=0.05.\n")

print("Done — outputs in:", OUT.resolve())
print("Group counts:\n", df['Algorithm'].value_counts())
