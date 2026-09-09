"""Yield prediction model training - evaluation."""
import os
import json
import joblib

import pandas as pd

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

import numpy as np


BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
    )
)


TEST_FILE = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "yield",
    "test.csv"
)

MODEL_FILE = os.path.join(
    BASE_DIR,
    "models",
    "yield",
    "yield_model.pkl"
)

REPORT_DIR = os.path.join(
    BASE_DIR,
    "evaluation",
    "reports"
)

os.makedirs(
    REPORT_DIR,
    exist_ok=True
)


df = pd.read_csv(
    TEST_FILE
)

X = df.drop(
    columns=["yield"]
)

y = df["yield"]


model = joblib.load(
    MODEL_FILE
)


pred = model.predict(
    X
)


mae = mean_absolute_error(
    y,
    pred
)

rmse = np.sqrt(
    mean_squared_error(
        y,
        pred
    )
)

r2 = r2_score(
    y,
    pred
)


metrics = {

    "model":
    "yield-v1.0.0",

    "MAE":
    float(mae),

    "RMSE":
    float(rmse),

    "R2":
    float(r2)

}


output_file = os.path.join(
    REPORT_DIR,
    "yield_metrics.json"
)


with open(
    output_file,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        metrics,
        f,
        indent=4
    )


print()
print(
    "========== YIELD MODEL =========="
)

print(
    f"MAE  : {mae:.4f}"
)

print(
    f"RMSE : {rmse:.4f}"
)

print(
    f"R²   : {r2:.4f}"
)

print()
print(
    "✓ Metrics saved:",
    output_file
)