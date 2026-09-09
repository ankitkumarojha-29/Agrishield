"""Crop health model evaluation script."""
from __future__ import annotations

import json
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import datasets, models, transforms

from evaluation.metrics import calculate_classification_metrics

BASE_DIR = Path(__file__).resolve().parents[2]  # ai/
DATA_DIR = BASE_DIR / "data" / "crop_health" / "PlantVillage"
MODEL_DIR = BASE_DIR / "models" / "crop_health"
MODEL_PATH = MODEL_DIR / "model.pt"
LABELS_PATH = MODEL_DIR / "class_names.json"
REPORT_DIR = BASE_DIR / "evaluation" / "reports"
OUTPUT_FILE = REPORT_DIR / "crop_health_metrics.json"

REPORT_DIR.mkdir(parents=True, exist_ok=True)


class TransformSubset(Dataset):
    """Wraps an ImageFolder dataset with dedicated subset indices and transforms."""
    def __init__(self, full_dataset: datasets.ImageFolder, indices: list[int], transform=None):
        self.full_dataset = full_dataset
        self.indices = indices
        self.transform = transform

    def __len__(self) -> int:
        return len(self.indices)

    def __getitem__(self, idx: int):
        path, label = self.full_dataset.samples[self.indices[idx]]
        image = self.full_dataset.loader(path)
        if self.transform is not None:
            image = self.transform(image)
        return image, label


def build_model(num_classes: int) -> nn.Module:
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model


def evaluate_crop_health_model(val_split: float = 0.15, batch_size: int = 64, device_str: str | None = None) -> dict:
    device = torch.device(device_str if device_str else ("cuda" if torch.cuda.is_available() else "cpu"))
    print(f"[INFO] Evaluating Crop Health Model on device: {device}")

    if not MODEL_PATH.exists() or not LABELS_PATH.exists():
        raise FileNotFoundError(f"Model or label file not found in {MODEL_DIR}")
    if not DATA_DIR.exists():
        raise FileNotFoundError(f"Dataset not found at {DATA_DIR}")

    with open(LABELS_PATH, "r", encoding="utf-8") as f:
        classes = json.load(f)

    model = build_model(len(classes))
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.to(device)
    model.eval()

    val_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    full_dataset = datasets.ImageFolder(str(DATA_DIR))
    generator = torch.Generator().manual_seed(42)
    val_size = int(len(full_dataset) * val_split)
    train_size = len(full_dataset) - val_size
    shuffled = torch.randperm(len(full_dataset), generator=generator).tolist()
    val_indices = shuffled[train_size:]

    val_ds = TransformSubset(full_dataset, val_indices, transform=val_tf)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=0)

    all_preds = []
    all_targets = []

    print(f"[INFO] Evaluating {len(val_ds)} validation images across {len(classes)} classes...")
    with torch.no_grad():
        for imgs, labels in val_loader:
            imgs = imgs.to(device)
            outputs = model(imgs)
            preds = outputs.argmax(dim=1).cpu().tolist()
            all_preds.extend(preds)
            all_targets.extend(labels.tolist())

    metrics = calculate_classification_metrics(all_preds, all_targets, target_names=classes)
    metrics["model"] = "crop_health-effnet-b0-v1.0.0"
    metrics["architecture"] = "EfficientNet-B0"
    metrics["total_validation_samples"] = len(val_ds)
    metrics["total_dataset_samples"] = len(full_dataset)
    metrics["classes"] = classes

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=4)

    print()
    print("========== CROP HEALTH MODEL ==========")
    print(f"Accuracy         : {metrics['accuracy'] * 100:.2f}%")
    print(f"F1 Score (macro) : {metrics['f1_macro']:.4f}")
    print(f"F1 Score (weighted): {metrics['f1_weighted']:.4f}")
    print(f"Precision (macro): {metrics['precision_macro']:.4f}")
    print(f"Recall (macro)   : {metrics['recall_macro']:.4f}")
    print(f"Validation Samples: {metrics['total_validation_samples']}")
    print()
    print("✓ Metrics saved:", OUTPUT_FILE)
    return metrics


if __name__ == "__main__":
    evaluate_crop_health_model()
