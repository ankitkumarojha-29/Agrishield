# AgriShield AI — Model Evaluation & Performance Statistics

Generated: 2026-09-06  
Environment: PyTorch + CUDA, scikit-learn, FastAPI microservice

---

## Executive Summary

| Model | Task | Architecture / Algorithm | Primary Metric | Score | Status |
|---|---|---|---|---|---|
| **Crop Yield Prediction** | Regression (`kg/ha` / `t/ha`) | `RandomForestRegressor` (300 trees) | **R² Score** | **0.9728** | Production Ready |
| **Farm Risk Scoring** | Multi-factor Risk (`0–100`) | `RandomForestRegressor` (300 trees) | **R² Score** | **0.8705** | Production Ready |
| **Damage Assessment** | Binary CV Classification | `EfficientNet-B0` Transfer Learning | **Accuracy** | **83.70%** | Production Ready |
| **Crop Health / Pest & Disease** | 15-class CV Classification | `EfficientNet-B0` Transfer Learning | **Accuracy** | **87.82%** | Production Ready |

---

## 1. Crop Yield Prediction Model (`yield`)

- **Artifacts**: `ai/models/yield/yield_model.pkl`, `metadata.json`
- **Algorithm**: Scikit-Learn `Pipeline` with `ColumnTransformer` (OneHotEncoder + passthrough) and `RandomForestRegressor(n_estimators=300, random_state=42)`
- **Evaluation Dataset**: `ai/data/processed/yield/test.csv` (8,000 holdout test samples)
- **Features Used**:
  - `crop`, `area_ha`, `rainfall`, `temp_mean`, `humidity`
  - `soil_ph`, `nitrogen`, `phosphorus`, `potassium`
  - `ndvi_mean`, `ndwi_mean`, `ndmi_mean`
- **Target**: Crop yield in tons/ha (`t/ha`), converted to `kg/ha` during inference.

### Performance Metrics
- **Mean Absolute Error (MAE)**: `0.1911 t/ha` (~191.1 kg/ha error)
- **Root Mean Squared Error (RMSE)**: `0.2390 t/ha`
- **Coefficient of Determination (R²)**: **`0.9728`**

---

## 2. Farm Risk Scoring Model (`risk`)

- **Artifacts**: `ai/models/risk/risk_model.pkl`, `metadata.json`
- **Algorithm**: `RandomForestRegressor(n_estimators=300, random_state=42)`
- **Evaluation Dataset**: `ai/data/processed/risk/test.csv` (8,000 holdout test samples)
- **Features Used**: Weather variability, drought/flood indicators, soil nutrient deficits, historical claim losses, NDVI vegetation vigor.
- **Target**: Composite farm risk score (`0.0 – 100.0`).

### Performance Metrics
- **Mean Absolute Error (MAE)**: `4.9657` points (out of 100)
- **Root Mean Squared Error (RMSE)**: `6.4411`
- **Coefficient of Determination (R²)**: **`0.8705`**

---

## 3. Post-Disaster Damage Assessment Model (`damage`)

- **Artifacts**: `ai/models/damage/model.pt`, `class_names.json`
- **Architecture**: `EfficientNet-B0` (ImageNet-1K pretrained backbone with fine-tuned binary classifier head)
- **Evaluation Dataset**: `ai/data/damage_assessment/test/` (2,000 balanced test images)
  - `damaged`: 1,000 images
  - `non_damaged`: 1,000 images
- **Input Dimensions**: `3 × 224 × 224` normalised RGB tensor

### Performance Metrics
- **Overall Accuracy**: **`83.70%`**
- **Macro F1-Score**: `0.8369`
- **Macro Precision**: `0.8378`
- **Macro Recall**: `0.8370`

#### Class Breakdown
| Class | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| `damaged` | 85.40% | 81.30% | 0.8330 | 1,000 |
| `non_damaged` | 82.16% | 86.10% | 0.8408 | 1,000 |

#### Confusion Matrix
```
               Predicted Damaged   Predicted Non-Damaged
Actual Damaged:        813                  187
Actual Non-Damaged:    139                  861
```

---

## 4. Crop Health & Disease Classification Model (`crop_health`)

- **Artifacts**: `ai/models/crop_health/model.pt`, `class_names.json`
- **Architecture**: `EfficientNet-B0` (ImageNet-1K pretrained backbone with fine-tuned 15-class classifier head)
- **Evaluation Dataset**: `ai/data/crop_health/PlantVillage/` (3,095 validation images across 15 classes, 15% holdout split)
- **Input Dimensions**: `3 × 224 × 224` normalised RGB tensor

### Performance Metrics
- **Overall Accuracy**: **`87.82%`**
- **Weighted F1-Score**: `0.8747`
- **Macro F1-Score**: `0.8604`
- **Macro Precision**: `0.8865`
- **Macro Recall**: `0.8450`
- **Number of Classes**: 15 classes covering Pepper, Potato, and Tomato diseases + healthy controls

---

## Report Files Generated
1. [ai/evaluation/reports/all_models_summary.json](file:///c:/Users/mayank/Desktop/AgriShield/ai/evaluation/reports/all_models_summary.json)
2. [ai/evaluation/reports/yield_metrics.json](file:///c:/Users/mayank/Desktop/AgriShield/ai/evaluation/reports/yield_metrics.json)
3. [ai/evaluation/reports/risk_metrics.json](file:///c:/Users/mayank/Desktop/AgriShield/ai/evaluation/reports/risk_metrics.json)
4. [ai/evaluation/reports/damage_metrics.json](file:///c:/Users/mayank/Desktop/AgriShield/ai/evaluation/reports/damage_metrics.json)
5. [ai/evaluation/reports/crop_health_metrics.json](file:///c:/Users/mayank/Desktop/AgriShield/ai/evaluation/reports/crop_health_metrics.json)
