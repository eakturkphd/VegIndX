# VegIndX 1.0

**VegIndX** is a Google Earth Engine (GEE) application designed for computing, visualizing, and exporting multiple vegetation indices (NDVI, EVI, SAVI, etc.) from Landsat 8 imagery.  

This tool was developed as part of the study:  
> Akturk, E. (2025). *A geospatial approach to vegetation monitoring: Multi-indices analysis with Landsat 8 via Google Earth Engine*.  
> [ResearchGate Link](https://www.researchgate.net/publication/384297529_A_geospatial_approach_to_vegetation_monitoring_Multi-indices_analysis_with_Landsat_8_via_Google_Earth_Engine)

---

## ✨ Features
- ROI selection at **Country** or **Province** level using FAO GAUL boundaries.  
- Flexible **date range filtering** for Landsat 8 imagery.  
- Preview of RGB composites before analysis.  
- Computation and visualization of **25+ vegetation indices**.  
- Export functionality to save selected indices as **GeoTIFF** on Google Drive.  
- Simple, interactive **user interface** with GEE’s `ui.Panel`.

---

## 🚀 How to Use

1. Open the [Google Earth Engine Code Editor](https://code.earthengine.google.com/).
2. Copy and paste the full `VegIndX.js` script into the editor.
3. Run the script.
4. In the left panel:
   - **Select ROI**: Choose *Country* or *Province*.  
   - **Select Dates**: Enter a start and end date (format `YYYY-MM-DD`).  
   - **Load RGB**: Preview Landsat RGB composite.  
   - **Select Vegetation Index**: Choose an index to compute and visualize.  
   - **Export**: Export the selected index to Google Drive.  

---

## 📊 Vegetation Indices Included
VegIndX currently supports a wide range of indices, including:  
`NDVI, DVI, EVI, GEMI, GARI, GCI, GDVI, GLI, GNDVI, GOSAVI, GRVI, GSAVI, GVI, IPVI, MNLI, MSAVI2, MSR, NLI, OSAVI, RDVI, SAVI, SR, TDVI, VARI, WDRVI.`

---

## 📖 Citation
If you use VegIndX in your research, please cite the following study:

> Akturk, E. (2025). *A geospatial approach to vegetation monitoring: Multi-indices analysis with Landsat 8 via Google Earth Engine. 9th Advanced Engineering Days (AED), 9-10 July 2024, Tebriz, IRAN*.  

---

## ⚖️ License
This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.

---

## 👩‍💻 Author
**Dr. Emre Akturk**  
Kastamonu University, Faculty of Forestry  
Director, GIS and Remote Sensing Research and Application Center  


