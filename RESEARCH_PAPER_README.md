# SecureSight IEEE Research Paper

This directory contains the IEEE-formatted research paper for the SecureSight Technologies project.

## Files

- **SecureSight_IEEE_Paper.tex** - Main IEEE conference paper in LaTeX format

## Compiling the Paper

### Option 1: Online (Recommended for Quick View)
1. Visit [Overleaf](https://www.overleaf.com/)
2. Create a new project → Upload Project
3. Upload `SecureSight_IEEE_Paper.tex`
4. Compile to PDF (automatic)

### Option 2: Local Compilation (macOS)

#### Prerequisites
```bash
# Install MacTeX (full LaTeX distribution)
brew install --cask mactex

# Or install BasicTeX (minimal, ~100MB)
brew install --cask basictex

# If using BasicTeX, install additional packages:
sudo tlmgr update --self
sudo tlmgr install IEEEtran cite amsmath
```

#### Compile
```bash
cd "/Users/yashpatel/Desktop/PROJECTS  /ss_site/SecureSight-Technologies"

# Compile LaTeX to PDF
pdflatex SecureSight_IEEE_Paper.tex

# Run twice for proper references
pdflatex SecureSight_IEEE_Paper.tex

# For bibliography processing (if needed)
bibtex SecureSight_IEEE_Paper
pdflatex SecureSight_IEEE_Paper.tex
pdflatex SecureSight_IEEE_Paper.tex
```

### Option 3: Using latexmk (Automated)
```bash
# Install latexmk (comes with MacTeX)
latexmk -pdf SecureSight_IEEE_Paper.tex

# Clean auxiliary files
latexmk -c
```

## Paper Structure

### Abstract
Concise summary of the system, architecture, and key results.

### 1. Introduction
- Motivation for AI-powered surveillance
- System overview and objectives
- Key contributions

### 2. Related Work
- Object detection in surveillance (YOLOv8)
- Violence detection (CNN-RNN architectures)
- Multi-camera streaming systems

### 3. System Architecture
- Frontend layer (Next.js, React, TypeScript)
- Backend layer (FastAPI, YOLO, OpenCV)
- Camera integration (MJPEG, HLS, RTSP)

### 4. Implementation Details
- Frontend technology stack
- Backend technology stack
- Detection pipeline optimizations
- WebSocket protocol
- Alert rule engine
- Violence detection model

### 5. Experimental Setup
- Deployment configuration (CPU-only)
- Camera configuration (8 streams)
- Model selection (YOLOv8n)

### 6. Results and Discussion
- Performance metrics (45.2ms avg inference)
- Threat detection accuracy (82-94%)
- System scalability (8 concurrent streams)
- Latency analysis (118-188ms end-to-end)
- Strengths, limitations, and future work

### 7. System Features
- UI enhancements (glassmorphism, animations)
- Authentication & security
- Camera management
- Alert history

### 8. Deployment Architecture
- Docker containerization
- Nginx reverse proxy
- Production deployment guide

### 9. Conclusion
Summary of achievements and future directions.

### References
12 academic and technical references including:
- YOLOv8 (Ultralytics)
- Violence detection research
- FastAPI, Next.js, OpenCV documentation
- WebSocket and HLS RFCs
- COCO dataset, GRU architecture papers

## Key Metrics Highlighted

| Metric | Value |
|--------|-------|
| Average Inference Time | 45.2ms |
| Detection Confidence | 0.87 (person class) |
| Alert Latency | <100ms |
| Concurrent Streams | 8 |
| Memory Usage | 1.2GB/stream |
| Person Detection TP | 94% |
| Weapon Detection TP | 89% |
| Violence Detection TP | 82% |

## Citation

If using this work, please cite:

```bibtex
@inproceedings{patel2026securesight,
  title={SecureSight: A Real-Time AI-Powered Surveillance Platform with Multi-Stream Threat Detection},
  author={Patel, Yash},
  booktitle={IEEE Conference Proceedings},
  year={2026},
  organization={SecureSight Technologies}
}
```

## Document Class

The paper uses the IEEE conference format (`IEEEtran` document class) which is the standard for:
- IEEE conferences and symposiums
- Technical journals
- Workshop papers

## Customization

To customize the paper:

1. **Change author info**: Edit lines 13-18
2. **Update abstract**: Modify lines 24-32
3. **Add experimental results**: Update Tables I and II (lines 400-450)
4. **Include figures**: Add `\includegraphics` commands with your screenshots
5. **Expand references**: Add to `\begin{thebibliography}` section

## Graphics (Optional Enhancement)

To add system architecture diagrams:

```latex
\begin{figure}[htbp]
\centerline{\includegraphics[width=\columnwidth]{architecture.png}}
\caption{SecureSight System Architecture}
\label{fig:architecture}
\end{figure}
```

Place image files in the same directory as the .tex file.

## Output

The compiled PDF will be:
- **Format**: IEEE conference two-column layout
- **Pages**: ~8-10 pages
- **Paper size**: US Letter (8.5" × 11")
- **Font**: Times Roman 10pt

## Troubleshooting

**Error: `IEEEtran.cls` not found**
```bash
sudo tlmgr install IEEEtran
```

**Error: Citation undefined**
```bash
# Run pdflatex → bibtex → pdflatex → pdflatex
pdflatex SecureSight_IEEE_Paper.tex
bibtex SecureSight_IEEE_Paper
pdflatex SecureSight_IEEE_Paper.tex
pdflatex SecureSight_IEEE_Paper.tex
```

**Error: Package not found**
```bash
sudo tlmgr install <package-name>
```

## Professional Printing

For conference submission or professional printing:
- Use 600 DPI for embedded images
- Convert to PDF/A for archival compliance
- Ensure all fonts are embedded
- Use color-safe palette for grayscale printing

---

**Document Info:**
- Created: February 2026
- LaTeX Engine: pdfLaTeX
- Template: IEEEtran Conference
- License: MIT (SecureSight Technologies)
