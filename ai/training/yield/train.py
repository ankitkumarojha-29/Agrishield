"""Yield prediction model training - training script."""
import os
import json
import joblib

import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor


BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
    )
)

TRAIN_FILE = os.path.join(
    BASE_DIR,
    "data",
    "processed",
    "yield",
    "train.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models",
    "yield"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


df = pd.read_csv(
    TRAIN_FILE
)


target = "yield"

X = df.drop(
    columns=[target]
)

y = df[target]


categorical_features = [
    "crop"
]

numeric_features = [

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
    "ndmi_mean"

]


preprocessor = ColumnTransformer(

    transformers=[

        (
            "categorical",

            OneHotEncoder(
                handle_unknown="ignore"
            ),

            categorical_features
        )

    ],

    remainder="passthrough"
)


model = RandomForestRegressor(

    n_estimators=300,

    random_state=42,

    n_jobs=-1

)


pipeline = Pipeline(

    steps=[

        (
            "preprocessor",
            preprocessor
        ),

        (
            "model",
            model
        )

    ]

)


pipeline.fit(
    X,
    y
)


model_file = os.path.join(
    MODEL_DIR,
    "yield_model.pkl"
)


joblib.dump(
    pipeline,
    model_file
)


metadata = {

    "model":
    "yield_prediction",

    "version":
    "yield-v1.0.0",

    "algorithm":
    "RandomForestRegressor",

    "features":
    list(X.columns),

    "target":
    target

}


metadata_file = os.path.join(
    MODEL_DIR,
    "metadata.json"
)


with open(
    metadata_file,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        metadata,
        f,
        indent=4
    )


print("[OK] Yield model saved:", model_file)
print("[OK] Metadata saved:", metadata_file)