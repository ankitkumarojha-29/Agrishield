"""Damage assessment model evaluation script."""
from __future__ import annotations

import json
import os
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

from evaluation.metrics import calculate_classification_metrics

BASE_DIR = Path(__file__).resolve().parents[2]  # ai/
TEST_DIR = BASE_DIR / "data" / "damage_assessment" / "test"
MODEL_DIR = BASE_DIR / "models" / "damage"
MODEL_PATH = MODEL_DIR / "model.pt"
LABELS_PATH = MODEL_DIR / "class_names.json"
REPORT_DIR = BASE_DIR / "evaluation" / "reports"
OUTPUT_FILE = REPORT_DIR / "damage_metrics.json"

REPORT_DIR.mkdir(parents=True, exist_ok=True)


def build_model(num_classes: int) -> nn.Module:
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def evaluate_damage_model(batch_size: int = 32, device_str: str | None = None) -> dict:
    device = torch.device(device_str if device_str else ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"[INFO] Evaluating Damage Assessment Model on device: {device}")

    if not MODEL_PATH.exists() or not LABELS_PATH.exists():
        raise FileNotFoundError(f"Model or label file not found in {MODEL_DIR}")
    if not TEST_DIR.exists():
        raise FileNotFoundError(f"Test dataset directory not found at {TEST_DIR}")

    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)
    classes = meta["classes"] if isinstance(meta, dict) else meta

    model = build_model(len(classes))
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.to(device)
    model.eval()

    val_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    test_dataset = datasets.ImageFolder(str(TEST_DIR), transform=val_tf)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    all_preds = []
    all_targets = []

    print(f"[INFO] Evaluating {len(test_dataset)} test images across {len(classes)} classes...")
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs = imgs.to(device)
            outputs = model(imgs)
            preds = outputs.argmax(dim=1).cpu().tolist()
            all_preds.extend(preds)
            all_targets.extend(labels.tolist())

    metrics = calculate_classification_metrics(all_preds, all_targets, target_names=test_dataset.classes)
    metrics["model"] = "damage-effnet-b0-v1.0.0"
    metrics["architecture"] = "EfficientNet-B0"
    metrics["total_test_samples"] = len(test_dataset)
    metrics["classes"] = classes

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=4)

    print()
    print("========== DAMAGE ASSESSMENT MODEL ==========")
    print(f"Accuracy         : {metrics['accuracy'] * 100:.2f}%")
    print(f"F1 Score (macro) : {metrics['f1_macro']:.4f}")
    print(f"Precision (macro): {metrics['precision_macro']:.4f}")
    print(f"Recall (macro)   : {metrics['recall_macro']:.4f}")
    print(f"Total Test Samples: {metrics['total_test_samples']}")
    print()
    print("✓ Metrics saved:", OUTPUT_FILE)
    return metrics


if __name__ == "__main__":
    evaluate_damage_model()
