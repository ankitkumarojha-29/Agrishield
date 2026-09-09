"""Evaluation metrics calculation for AgriShield AI models."""
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


def calculate_accuracy(predictions, ground_truth):
    """Calculate model classification accuracy."""
    return float(accuracy_score(ground_truth, predictions))


def calculate_f1_score(predictions, ground_truth, average="weighted"):
    """Calculate F1 score (default weighted average)."""
    return float(f1_score(ground_truth, predictions, average=average, zero_division=0))


def calculate_precision(predictions, ground_truth, average="weighted"):
    """Calculate Precision (default weighted average)."""
    return float(precision_score(ground_truth, predictions, average=average, zero_division=0))


def calculate_recall(predictions, ground_truth, average="weighted"):
    """Calculate Recall (default weighted average)."""
    return float(recall_score(ground_truth, predictions, average=average, zero_division=0))


def calculate_confusion_matrix(predictions, ground_truth, labels=None):
    """Calculate confusion matrix as a nested list."""
    cm = confusion_matrix(ground_truth, predictions, labels=labels)
    return cm.tolist()


def calculate_classification_metrics(predictions, ground_truth, target_names=None):
    """Calculate comprehensive classification metrics dictionary."""
    acc = calculate_accuracy(predictions, ground_truth)
    f1_macro = float(f1_score(ground_truth, predictions, average="macro", zero_division=0))
    f1_weighted = float(f1_score(ground_truth, predictions, average="weighted", zero_division=0))
    prec_macro = float(precision_score(ground_truth, predictions, average="macro", zero_division=0))
    prec_weighted = float(precision_score(ground_truth, predictions, average="weighted", zero_division=0))
    rec_macro = float(recall_score(ground_truth, predictions, average="macro", zero_division=0))
    rec_weighted = float(recall_score(ground_truth, predictions, average="weighted", zero_division=0))
    cm = calculate_confusion_matrix(predictions, ground_truth)

    report_dict = classification_report(
        ground_truth,
        predictions,
        target_names=target_names,
        output_dict=True,
        zero_division=0
    )

    return {
        "accuracy": acc,
        "f1_macro": f1_macro,
        "f1_weighted": f1_weighted,
        "precision_macro": prec_macro,
        "precision_weighted": prec_weighted,
        "recall_macro": rec_macro,
        "recall_weighted": rec_weighted,
        "confusion_matrix": cm,
        "classification_report": report_dict,
    }


def calculate_regression_metrics(predictions, ground_truth):
    """Calculate standard regression metrics: MAE, RMSE, R2."""
    mae = float(mean_absolute_error(ground_truth, predictions))
    rmse = float(np.sqrt(mean_squared_error(ground_truth, predictions)))
    r2 = float(r2_score(ground_truth, predictions))
    return {
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2,
    }
