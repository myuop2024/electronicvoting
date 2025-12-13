# Paper Ballot OCR Pipeline - Setup Guide

## Overview

The ObserverNet platform includes a sophisticated Optical Character Recognition (OCR) pipeline for processing paper ballots. This enables hybrid voting scenarios where some voters submit physical ballots that are digitized and verified.

**Features:**
- **Automated mark detection** - Identifies filled bubbles, checkmarks, and X marks
- **Confidence scoring** - Assigns confidence level to each detected mark
- **Human review queue** - Low-confidence ballots are flagged for manual review
- **Redacted images** - PII is redacted before storage
- **Blockchain anchoring** - Approved ballots are committed to Fabric ledger
- **Audit trail** - Complete provenance from upload to tally

---

## Architecture

```
Paper Ballot → Upload → OCR Processing → Confidence Check
                                              ↓
                              Low ← ─ ─ ─ ─  High?
                               ↓              ↓
                          Review Queue    Auto-Approve
                               ↓              ↓
                          Admin Review ─────→ Blockchain
                               ↓              ↓
                          Approve/Reject → Tally
```

---

## Installation

### Option 1: Full OCR Stack (Recommended for Production)

Install all OCR dependencies:

```bash
cd apps/api

# Install PaddleOCR and PaddlePaddle
poetry install --extras "ocr"

# Or manually:
pip install paddleocr paddlepaddle pillow pytesseract numpy opencv-python

# Install Tesseract OCR engine
# Ubuntu/Debian:
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-eng

# macOS:
brew install tesseract

# CentOS/RHEL:
sudo yum install tesseract

# Verify installation
tesseract --version
python -c "from paddleocr import PaddleOCR; print('PaddleOCR installed')"
```

### Option 2: Tesseract Only (Lightweight)

For text-only extraction without advanced mark detection:

```bash
# Install Pillow and pytesseract
poetry add pillow pytesseract

# Install Tesseract engine (see above)

# PaddleOCR will not be used - mark detection uses geometric algorithms
```

### Option 3: Mock Mode (Development)

No installation needed. The OCR service automatically falls back to mock mode when dependencies are missing.

---

## Configuration

### Environment Variables

```bash
# Set Tesseract binary path (if not in PATH)
export TESSERACT_CMD=/usr/local/bin/tesseract

# Enable/disable PaddleOCR
export PADDLE_OCR_ENABLED=true

# OCR language (default: en)
export PADDLE_OCR_LANG=en

# Use GPU acceleration (requires CUDA)
export PADDLE_OCR_USE_GPU=false

# Confidence thresholds
export OCR_MIN_CONFIDENCE=0.7  # Below this goes to review queue
export OCR_AUTO_APPROVE_CONFIDENCE=0.95  # Above this auto-approves
```

### Paper Ballot Templates

Create ballot templates to guide OCR processing:

```json
{
  "template_id": "board_election_2024",
  "ballot_type": "bubble_sheet",
  "contests": [
    {
      "contest_id": "president",
      "title": "Board President",
      "detection_regions": [
        {
          "option_id": "alice",
          "bubble_location": {"x": 100, "y": 200, "width": 30, "height": 30}
        },
        {
          "option_id": "bob",
          "bubble_location": {"x": 100, "y": 250, "width": 30, "height": 30}
        }
      ]
    }
  ]
}
```

---

## Usage

### API Endpoints

#### 1. Upload Paper Ballot

```bash
POST /api/v1/paper/{election_id}/upload

Content-Type: multipart/form-data

Form Data:
- image: <ballot image file (JPG/PNG/PDF)>
- voter_code: <optional access code>
- metadata: <optional JSON metadata>

Response:
{
  "ballot_id": "ppr_abc123",
  "status": "processing",
  "confidence": 0.85,
  "requires_review": true
}
```

#### 2. Get Pending Reviews

```bash
GET /api/v1/paper/{election_id}/pending

Response:
{
  "ballots": [
    {
      "id": "ppr_abc123",
      "uploaded_at": "2024-01-15T10:30:00Z",
      "confidence": 0.65,
      "ocr_results": {
        "contests": [
          {
            "contest_id": "president",
            "detected_options": ["alice"],
            "confidence": 0.65
          }
        ]
      },
      "redacted_image_url": "/api/v1/paper/ballot/ppr_abc123/image"
    }
  ]
}
```

#### 3. Submit Review

```bash
POST /api/v1/paper/ballot/{ballot_id}/review

{
  "action": "approve",  // or "reject"
  "corrections": {
    "president": ["alice"]  // Corrected selections
  },
  "notes": "OCR correctly detected selection"
}

Response:
{
  "status": "approved",
  "ballot_id": "ppr_abc123"
}
```

#### 4. Approve Ballot (Creates Digital Ballot)

```bash
POST /api/v1/paper/ballot/{ballot_id}/approve

Response:
{
  "ballot_id": "bal_digital_xyz",
  "commitment_hash": "abc123...",
  "fabric_tx_id": "fabric-tx-789",
  "status": "submitted"
}
```

---

## Mark Detection Algorithms

### 1. Fill Ratio Algorithm

Detects filled bubbles by analyzing the ratio of dark pixels:

```python
def detect_fill_ratio(bubble_region):
    """
    Calculate percentage of dark pixels in bubble.

    Thresholds:
    - > 60%: Filled
    - 30-60%: Unclear (needs review)
    - < 30%: Empty
    """
    total_pixels = bubble_region.width * bubble_region.height
    dark_pixels = count_pixels_below_threshold(bubble_region, threshold=128)
    fill_ratio = dark_pixels / total_pixels

    if fill_ratio > 0.6:
        return "filled", confidence=0.9
    elif fill_ratio > 0.3:
        return "unclear", confidence=0.5
    else:
        return "empty", confidence=0.9
```

### 2. Checkmark Detection

Detects checkmarks and X marks using Hough line transform:

```python
def detect_checkmark(region):
    """
    Detect checkmarks by finding two intersecting lines.

    - Extract edges using Canny
    - Find lines using Hough transform
    - Check for intersection at characteristic angles
    """
    edges = cv2.Canny(region, 50, 150)
    lines = cv2.HoughLinesP(edges, ...)

    # Checkmark: two lines at ~45° and ~135°
    if has_intersecting_lines(lines, angles=[45, 135]):
        return "checkmark", confidence=0.85
```

### 3. Text Extraction

For write-in candidates or verification numbers:

```python
def extract_text(region):
    """
    Extract text using Tesseract OCR.

    - Preprocess image (deskew, denoise, binarize)
    - Run Tesseract with appropriate config
    - Post-process results (spell check, formatting)
    """
    preprocessed = preprocess_for_ocr(region)
    text = pytesseract.image_to_string(preprocessed, config='--psm 7')
    confidence = get_text_confidence(text)

    return text, confidence
```

---

## Workflow Integration

### 1. Election Setup

```python
# Admin creates election and enables paper ballots
POST /api/v1/elections
{
  "name": "Board Election 2024",
  "allow_paper_ballots": true,
  "paper_ballot_template_id": "board_2024",
  "require_human_review": true,  // All ballots go to review
  "auto_approve_threshold": 0.95  // Auto-approve if confidence > 95%
}
```

### 2. Ballot Processing

```python
# Upload ballot image
POST /api/v1/paper/{election_id}/upload
- Image is preprocessed (deskew, denoise)
- OCR detects marks
- Confidence score calculated
- If confidence < threshold → review queue
- If confidence >= threshold → auto-approve (if enabled)
```

### 3. Human Review

```python
# Admin reviews pending ballots
GET /api/v1/paper/{election_id}/pending

# Admin sees:
# - Redacted ballot image (PII removed)
# - OCR detected selections
# - Confidence scores
# - Original metadata (timestamp, code)

# Admin approves or rejects:
POST /api/v1/paper/ballot/{id}/review
{
  "action": "approve",
  "corrections": {...}  // If OCR was wrong
}
```

### 4. Blockchain Anchoring

```python
# Approved ballot → digital ballot
POST /api/v1/paper/ballot/{id}/approve

# System:
# 1. Creates encrypted ballot from selections
# 2. Generates commitment hash
# 3. Submits to Fabric blockchain
# 4. Stores blockchain TX ID
# 5. Adds to tally
# 6. Sends confirmation (if contact provided)
```

---

## Security Considerations

### PII Redaction

Before storing or displaying ballot images:

```python
def redact_ballot_image(image):
    """
    Remove personally identifiable information.

    - Detect and blur barcodes
    - Detect and blur signature areas
    - Detect and blur handwritten notes
    - Preserve only voting mark regions
    """
    redacted = image.copy()

    # Blur barcode regions
    barcodes = detect_barcodes(image)
    for bbox in barcodes:
        redacted = blur_region(redacted, bbox)

    # Blur signature areas (bottom 20% of page)
    signature_area = (0, 0.8 * height, width, height)
    redacted = blur_region(redacted, signature_area)

    return redacted
```

### Audit Trail

Every OCR operation is logged:

```python
# Audit log entries:
- ballot_uploaded: timestamp, user, metadata
- ocr_processed: confidence, detected_marks, time_ms
- review_submitted: reviewer, action, corrections
- ballot_approved: final_selections, blockchain_tx
- ballot_rejected: reason, reviewer, timestamp
```

---

## Performance Optimization

### Batch Processing

Process multiple ballots concurrently:

```python
# Worker queue for OCR jobs
celery -A observernet_worker worker \
  --queue=ocr \
  --concurrency=4

# Ballots are processed in parallel
# Results are cached in Redis
```

### GPU Acceleration

For high-volume elections:

```python
# Enable CUDA for PaddleOCR
export PADDLE_OCR_USE_GPU=true

# Verify GPU usage
nvidia-smi

# Expected: 2-3x speedup for mark detection
```

---

## Troubleshooting

### Low Detection Accuracy

```bash
# Check image quality
convert ballot.jpg -resize 200% ballot_upscaled.jpg

# Adjust preprocessing
export OCR_DESKEW_ENABLED=true
export OCR_DENOISE_LEVEL=2

# Use higher resolution scans (300 DPI minimum)
```

### Tesseract Not Found

```bash
# Set explicit path
export TESSERACT_CMD=/usr/local/bin/tesseract

# Verify
tesseract --version
which tesseract
```

### PaddleOCR Import Error

```bash
# Reinstall with specific version
pip uninstall paddleocr paddlepaddle
pip install paddlepaddle==2.6.0 paddleocr==2.7.3

# Check for conflicts
pip check
```

---

## Testing

```bash
# Unit tests for OCR algorithms
pytest tests/unit/test_ocr.py -v

# Integration tests with sample ballots
pytest tests/integration/test_paper_ballots.py -v

# Load test OCR endpoint
k6 run tests/load/ocr_upload.js
```

---

## Best Practices

1. **Use high-quality scans**: 300 DPI minimum, grayscale or color
2. **Standardize ballot design**: Consistent bubble size and spacing
3. **Always enable human review**: For critical elections
4. **Monitor confidence scores**: Track accuracy over time
5. **Test with sample ballots**: Before election day
6. **Train staff**: On review interface and correction procedures
7. **Implement double-review**: For contested races
8. **Archive original images**: Securely with encryption

---

## Future Enhancements

- [ ] Machine learning model training on historical ballots
- [ ] Support for more ballot types (ranked choice, write-ins)
- [ ] Multi-page ballot processing
- [ ] Real-time OCR preview during scanning
- [ ] Automated ballot sorting and batching
- [ ] Integration with physical scanner hardware
- [ ] Advanced anomaly detection (fraudulent ballots)

---

## Support

For OCR-related issues:
- Documentation: https://docs.observernet.org/ocr
- Technical support: ocr-support@observernet.org
- Report issues: https://github.com/observernet/platform/issues
