"""
Damage Assessment Model Training — EfficientNet-B0 Transfer Learning
====================================================================
Usage:
    cd ai
    python -m training.damage.train [--epochs 5] [--batch-size 32] [--device cuda]

Expects CDC dataset at:
    ai/data/damage_assessment/train/damaged/
    ai/data/damage_assessment/train/non_damaged/
    ai/data/damage_assessment/test/damaged/       (optional test/val set)
    ai/data/damage_assessment/test/non_damaged/

Saves trained model to:
    ai/models/damage/model.pt
    ai/models/damage/class_names.json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import datasets, models, transforms

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR    = Path(__file__).resolve().parents[2]           # ai/
TRAIN_DIR   = BASE_DIR / "data" / "damage_assessment" / "train"
TEST_DIR    = BASE_DIR / "data" / "damage_assessment" / "test"
MODEL_DIR   = BASE_DIR / "models" / "damage"
MODEL_PATH  = MODEL_DIR / "model.pt"
LABELS_PATH = MODEL_DIR / "class_names.json"

MODEL_DIR.mkdir(parents=True, exist_ok=True)

# ── Damage class -> percentage mapping ────────────────────────────────────────
DAMAGE_PCT_MAP = {
    "non_damaged": 0.0,
    "damaged":     0.60,
}


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


def get_transforms(img_size: int = 224):
    train_tf = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomVerticalFlip(),
        transforms.RandomRotation(20),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    return train_tf, val_tf


def build_model(num_classes: int, device: torch.device) -> nn.Module:
    """Load pre-trained EfficientNet-B0, replace final classifier head."""
    print("[INFO] Loading pre-trained EfficientNet-B0 weights...")
    model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1)
    # Freeze backbone layers
    for param in model.parameters():
        param.requires_grad = False
    # Replace classifier head for target classes
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model.to(device)


def train_one_epoch(model, loader, criterion, optimizer, scaler, device: torch.device):
    model.train()
    total_loss, correct, total = 0.0, 0, 0
    total_batches = len(loader)
    is_cuda = device.type == "cuda"

    for batch_idx, (imgs, labels) in enumerate(loader, 1):
        imgs = imgs.to(device, non_blocking=is_cuda)
        labels = labels.to(device, non_blocking=is_cuda)

        optimizer.zero_grad(set_to_none=True)
        with torch.amp.autocast(device_type=device.type, enabled=is_cuda):
            outputs = model(imgs)
            loss = criterion(outputs, labels)

        if scaler is not None and is_cuda:
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            loss.backward()
            optimizer.step()

        batch_size = imgs.size(0)
        total_loss += loss.item() * batch_size
        _, preds = outputs.max(1)
        correct += preds.eq(labels).sum().item()
        total += batch_size

        if batch_idx % 25 == 0 or batch_idx == total_batches:
            running_loss = total_loss / total
            running_acc = correct / total
            print(
                f"  Batch [{batch_idx:03d}/{total_batches:03d}]  "
                f"Loss: {running_loss:.4f}  Acc: {running_acc:.4f} "
                f"({correct}/{total})",
                end="\r",
                flush=True,
            )
    print()
    return total_loss / total, correct / total


@torch.no_grad()
def validate(model, loader, criterion, device: torch.device):
    model.eval()
    total_loss, correct, total = 0.0, 0, 0
    is_cuda = device.type == "cuda"

    for imgs, labels in loader:
        imgs = imgs.to(device, non_blocking=is_cuda)
        labels = labels.to(device, non_blocking=is_cuda)
        with torch.amp.autocast(device_type=device.type, enabled=is_cuda):
            outputs = model(imgs)
            loss = criterion(outputs, labels)

        batch_size = imgs.size(0)
        total_loss += loss.item() * batch_size
        _, preds = outputs.max(1)
        correct += preds.eq(labels).sum().item()
        total += batch_size

    return total_loss / total, correct / total


def main():
    parser = argparse.ArgumentParser(description="AgriShield Damage Assessment Model Training")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs (default: 5)")
    parser.add_argument("--batch-size", type=int, default=32, help="Batch size (default: 32)")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate (default: 1e-4)")
    parser.add_argument("--val-split", type=float, default=0.15, help="Validation split fraction if no test folder (default: 0.15)")
    parser.add_argument("--device", type=str, default=None, help="Device (cuda / cpu). Default: auto-detect")
    parser.add_argument("--quick-test", action="store_true", help="Quick smoke test on a small subset")
    args = parser.parse_args()

    # Determine device
    if args.device:
        device = torch.device(args.device)
    else:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print(f"============================================================")
    print(f" AgriShield — Damage Assessment Model Training")
    print(f"============================================================")
    print(f"[INFO] Device: {device}")
    if device.type == "cuda":
        print(f"[INFO] GPU Name: {torch.cuda.get_device_name(0)}")
        print(f"[INFO] GPU Memory: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.1f} GB")
        torch.backends.cudnn.benchmark = True
    print(f"[INFO] Training Directory: {TRAIN_DIR}")

    if not TRAIN_DIR.exists():
        raise FileNotFoundError(
            f"Dataset not found at {TRAIN_DIR}\n"
            "Please place the CDC damage dataset at:\n"
            "  ai/data/damage_assessment/train/damaged/\n"
            "  ai/data/damage_assessment/train/non_damaged/"
        )

    train_tf, val_tf = get_transforms()

    # Determine train & val datasets
    full_train = datasets.ImageFolder(str(TRAIN_DIR))
    class_names = full_train.classes
    num_classes = len(class_names)

    print(f"[INFO] Found {num_classes} classes: {class_names}")
    print(f"[INFO] Total train images: {len(full_train)}")

    if args.quick_test:
        print("[INFO] --quick-test active: using 200 train and 50 val samples for verification.")
        train_ds = TransformSubset(full_train, list(range(200)), transform=train_tf)
        val_ds   = TransformSubset(full_train, list(range(200, 250)), transform=val_tf)
    elif TEST_DIR.exists() and any(TEST_DIR.iterdir()):
        print(f"[INFO] Using dedicated validation set at: {TEST_DIR}")
        train_ds = TransformSubset(full_train, list(range(len(full_train))), transform=train_tf)
        val_raw = datasets.ImageFolder(str(TEST_DIR))
        val_ds   = TransformSubset(val_raw, list(range(len(val_raw))), transform=val_tf)
    else:
        generator = torch.Generator().manual_seed(42)
        indices = list(range(len(full_train)))
        val_size = int(len(full_train) * args.val_split)
        train_size = len(full_train) - val_size
        shuffled = torch.randperm(len(full_train), generator=generator).tolist()
        train_ds = TransformSubset(full_train, shuffled[:train_size], transform=train_tf)
        val_ds   = TransformSubset(full_train, shuffled[train_size:], transform=val_tf)

    print(f"[INFO] Training samples: {len(train_ds)} | Validation samples: {len(val_ds)}")

    pin_mem = device.type == "cuda"
    train_loader = DataLoader(
        train_ds,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=0,
        pin_memory=pin_mem,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=0,
        pin_memory=pin_mem,
    )

    model = build_model(num_classes, device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=args.lr)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=3, gamma=0.5)
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))

    best_val_acc = 0.0
    epochs = 1 if args.quick_test else args.epochs
    print(f"\n[INFO] Starting training for {epochs} epoch(s)...\n")

    for epoch in range(1, epochs + 1):
        t0 = time.time()
        tr_loss, tr_acc = train_one_epoch(model, train_loader, criterion, optimizer, scaler, device)
        vl_loss, vl_acc = validate(model, val_loader, criterion, device)
        scheduler.step()
        elapsed = time.time() - t0

        print(
            f"Epoch {epoch:02d}/{epochs:02d} | "
            f"Train Loss: {tr_loss:.4f}  Acc: {tr_acc*100:.2f}% | "
            f"Val Loss: {vl_loss:.4f}  Acc: {vl_acc*100:.2f}% | "
            f"Time: {elapsed:.1f}s"
        )

        if vl_acc > best_val_acc or args.quick_test:
            best_val_acc = vl_acc
            torch.save(model.state_dict(), MODEL_PATH)
            print(f"  --> Saved best model checkpoint (val_acc={best_val_acc*100:.2f}%) -> {MODEL_PATH}")

    # Save class labels + damage percentage mapping
    with open(LABELS_PATH, "w") as f:
        json.dump({"classes": class_names, "damage_pct_map": DAMAGE_PCT_MAP}, f, indent=2)
    print(f"\n[INFO] Class labels + damage map saved -> {LABELS_PATH}")
    print(f"[DONE] Best validation accuracy: {best_val_acc*100:.2f}%")


if __name__ == "__main__":
    main()

