from __future__ import annotations

import os

import pandas as pd
from sklearn.model_selection import train_test_split


# ============================================================
# AGRISHIELD AI - RISK DATASET PREPARATION
#
# Input:
#     ai/data/raw/risk/risk_data.csv
#
# Output:
#     ai/data/processed/risk/train.csv
#     ai/data/processed/risk/test.csv
#
# Target:
#     risk_score
# ============================================================


# ============================================================
# 1. BASE DIRECTORY
# ============================================================
#
# Current file:
#
# ai/
# └── training/
#     └── risk/
#         └── prepare_dataset.py
#
# dirname(__file__) -> risk
# ..                  -> training
# ..                  -> ai
#
# Therefore:
#     parents = "..", ".."
# ============================================================

BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        ".."
    )
)


# ============================================================
# 2. PATHS
# ============================================================

RAW_FILE = os.path.join(
    BASE_DIR,
    "data",
    "raw",
    "risk",
    "risk_data.csv"
)


PROCESSED_DIR = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "risk"
)


TRAIN_FILE = os.path.join(
    PROCESSED_DIR,
    "train.csv"
)


TEST_FILE = os.path.join(
    PROCESSED_DIR,
    "test.csv"
)


os.makedirs(
    PROCESSED_DIR,
    exist_ok=True
)


# ============================================================
# 3. CHECK INPUT FILE
# ============================================================

print()
print("=" * 70)
print("          AGRISHIELD AI - RISK DATA PREPARATION")
print("=" * 70)

print()

print(
    "Looking for dataset:"
)

print(
    RAW_FILE
)


if not os.path.exists(
    RAW_FILE
):

    raise FileNotFoundError(

        "\nRisk dataset not found.\n\n"

        "Expected:\n"

        f"{RAW_FILE}\n\n"

        "Run first:\n"

        "python ai/training/generate_dataset.py"

    )


# ============================================================
# 4. LOAD DATASET
# ============================================================

df = pd.read_csv(
    RAW_FILE
)


# ============================================================
# 5. CLEAN COLUMN NAMES
# ============================================================
#
# Handles:
#   leading/trailing spaces
#   BOM characters
#
# Example:
#   " risk_score "
#       ↓
#   "risk_score"
# ============================================================

df.columns = (

    df.columns

    .str.strip()

    .str.replace(
        "\ufeff",
        "",
        regex=False
    )

)


print()

print(
    "Columns detected:"
)

print(
    df.columns.tolist()
)


# ============================================================
# 6. REQUIRED COLUMNS
# ============================================================

required_columns = [

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

    "yield_prediction",

    "disease_probability",

    "historical_loss",

    "risk_score"

]


# ============================================================
# 7. CHECK MISSING COLUMNS
# ============================================================

missing_columns = [

    column

    for column in required_columns

    if column not in df.columns

]


if missing_columns:

    raise ValueError(

        "\nMissing columns:\n"

        f"{missing_columns}\n\n"

        "Available columns:\n"

        f"{df.columns.tolist()}\n"

    )


print()

print(
    "✓ All required columns found."
)


# ============================================================
# 8. SELECT FEATURES
# ============================================================

feature_columns = [

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

    "yield_prediction",

    "disease_probability",

    "historical_loss"

]


target_column = "risk_score"


# ============================================================
# 9. KEEP REQUIRED DATA ONLY
# ============================================================

dataset = df[
    feature_columns + [
        target_column
    ]
].copy()


# ============================================================
# 10. REMOVE DUPLICATE ROWS
# ============================================================

before_duplicates = len(
    dataset
)


dataset = dataset.drop_duplicates()


after_duplicates = len(
    dataset
)


print()

print(
    "Duplicate rows removed:",
    before_duplicates - after_duplicates
)


# ============================================================
# 11. HANDLE NUMERIC COLUMNS
# ============================================================

numeric_columns = [

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

    "yield_prediction",

    "disease_probability",

    "historical_loss",

    "risk_score"

]


for column in numeric_columns:

    dataset[column] = pd.to_numeric(

        dataset[column],

        errors="coerce"

    )


# ============================================================
# 12. CLEAN CATEGORICAL COLUMN
# ============================================================

dataset["crop"] = (

    dataset["crop"]

    .astype(str)

    .str.strip()

    .str.lower()

)


# Replace common invalid string values
invalid_crop_values = [

    "",

    "nan",

    "none",

    "null"

]


dataset.loc[

    dataset["crop"].isin(
        invalid_crop_values
    ),

    "crop"

] = pd.NA


# ============================================================
# 13. HANDLE MISSING VALUES
# ============================================================

print()

print(
    "Missing values before cleaning:"
)

missing_before = (
    dataset.isna().sum()
)

print(
    missing_before[
        missing_before > 0
    ]
)


# Drop rows with missing target
dataset = dataset.dropna(
    subset=[
        target_column
    ]
)


# Numeric feature imputation
for column in numeric_columns:

    if column == target_column:

        continue


    if dataset[column].isna().any():

        median_value = dataset[
            column
        ].median()


        dataset[column] = (
            dataset[column].fillna(
                median_value
            )
        )


# Crop imputation
if dataset["crop"].isna().any():

    mode_values = dataset[
        "crop"
    ].mode()


    if len(mode_values) > 0:

        dataset["crop"] = (
            dataset["crop"]
            .fillna(
                mode_values.iloc[0]
            )
        )


# ============================================================
# 14. REMOVE INVALID TARGET VALUES
# ============================================================

dataset = dataset[

    dataset[target_column]
    .between(
        0,
        100,
        inclusive="both"
    )

]


# ============================================================
# 15. CLIP/VALIDATE IMPORTANT FEATURES
# ============================================================
#
# These are development safeguards.
# ============================================================

dataset["disease_probability"] = (

    dataset[
        "disease_probability"
    ].clip(
        0,
        1
    )

)


dataset["historical_loss"] = (

    dataset[
        "historical_loss"
    ].clip(
        0,
        1
    )

)


dataset["ndvi_mean"] = (

    dataset[
        "ndvi_mean"
    ].clip(
        -1,
        1
    )

)


dataset["ndwi_mean"] = (

    dataset[
        "ndwi_mean"
    ].clip(
        -1,
        1
    )

)


dataset["ndmi_mean"] = (

    dataset[
        "ndmi_mean"
    ].clip(
        -1,
        1
    )

)


# ============================================================
# 16. CHECK DATASET SIZE
# ============================================================

if len(dataset) < 20:

    raise ValueError(

        f"Only {len(dataset)} valid rows remain. "

        "At least 20 rows are recommended for "
        "testing the training pipeline."

    )


# ============================================================
# 17. TRAIN / TEST SPLIT
# ============================================================

train_df, test_df = train_test_split(

    dataset,

    test_size=0.20,

    random_state=42

)


# ============================================================
# 18. SAVE
# ============================================================

train_df.to_csv(

    TRAIN_FILE,

    index=False

)


test_df.to_csv(

    TEST_FILE,

    index=False

)


# ============================================================
# 19. SUMMARY
# ============================================================

print()

print(
    "=" * 70
)

print(
    "                 DATASET SUMMARY"
)

print(
    "=" * 70
)

print()

print(
    "Input rows:",
    len(df)
)

print(
    "Clean rows:",
    len(dataset)
)

print(
    "Training rows:",
    len(train_df)
)

print(
    "Testing rows:",
    len(test_df)
)

print()

print(
    "Features:"
)

for feature in feature_columns:

    print(
        f"  - {feature}"
    )


print()

print(
    "Target:"
)

print(
    f"  - {target_column}"
)


print()

print(
    "Risk score range:"
)

print(
    f"  Min: "
    f"{dataset[target_column].min():.2f}"
)

print(
    f"  Max: "
    f"{dataset[target_column].max():.2f}"
)

print(
    f"  Mean: "
    f"{dataset[target_column].mean():.2f}"
)


print()

print(
    "Saved:"
)

print(
    "Train:",
    TRAIN_FILE
)

print(
    "Test:",
    TEST_FILE
)

print()

print(
    "✓ Risk dataset preparation complete."
)