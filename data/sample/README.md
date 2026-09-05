# OILWATCH Sample Data Directory

This directory holds sample satellite synthetic tiles and reference datasets for test execution.

## Sample Sentinel-1 SAR Scenarios

1. **`medium_slick`**: Simulates a cohesive raw crude discharge in C-band VV polarization with sharp edge gradient damping.
2. **`weathered`**: Simulates an emulsified, wind-drifted oil sheen fragmented into multiple ribbons and streaks.
3. **`clean_ocean`**: Simulates open sea surface radar backscatter with nominal wave clutter and zero anomalous slicks.

The backend pipeline includes autonomous generators (`generate_synthetic_sar_sample`) so that testing and hackathon judging can occur without requiring multi-gigabyte ESA Copernicus Sentinel-1 SAFE archives to be downloaded locally.
