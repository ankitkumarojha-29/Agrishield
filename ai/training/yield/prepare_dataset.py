"""Yield prediction model training - data preparation."""
import os
import pandas as pd
from sklearn.model_selection import train_test_split


BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        ".."
    )
)

RAW_FILE = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "yield",
    "yield_data.csv"
)

PROCESSED_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "yield"
)

os.makedirs(
    PROCESSED_DIR,
    exist_ok=True
)


df = pd.read_csv(
    RAW_FILE
)

print("Rows:", len(df))
print("Columns:", list(df.columns))


required = [
    "crop",
    "area_ha",
    "rainfall",
    "temp_mean",
    "humidity",
    "soil_ph",
    "nitrogen",
    "phosphorus",
    "potassium",
    "ndvi_mean",
    "ndwi_mean",
    "ndmi_mean",
    "yield"
]

missing = [
    col for col in required
    if col not in df.columns
]

if missing:
    raise ValueError(
        f"Missing columns: {missing}"
    )


df = df.dropna(
    subset=required
)


train_df, test_df = train_test_split(
    df,
    test_size=0.20,
    random_state=42
)

train_file = os.path.join(
    PROCESSED_DIR,
    "train.csv"
)

test_file = os.path.join(
    PROCESSED_DIR,
    "test.csv"
)

train_df.to_csv(
    train_file,
    index=False
)

test_df.to_csv(
    test_file,
    index=False
)

print(
    f"Train rows: {len(train_df)}"
)

print(
    f"Test rows: {len(test_df)}"
)

print(
    "Saved:"
)

print(train_file)
print(test_file)
