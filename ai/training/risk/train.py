"""Risk scoring model training - training script."""
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
    "risk",
    "train.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models",
    "risk"
)

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)


df = pd.read_csv(
    TRAIN_FILE
)


target = "risk_score"


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
    "ndmi_mean",
    "yield_prediction",
    "disease_probability",
    "historical_loss"
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
    "risk_model.pkl"
)


joblib.dump(
    pipeline,
    model_file
)


metadata = {

    "model":
    "risk_score",

    "version":
    "risk-v1.0.0",

    "algorithm":
    "RandomForestRegressor",

    "target":
    target,

    "features":
    list(X.columns)

}


with open(

    os.path.join(
        MODEL_DIR,
        "metadata.json"
    ),

    "w",

    encoding="utf-8"

) as f:

    json.dump(
        metadata,
        f,
        indent=4
    )


print(
    "✓ Risk model saved:",
    model_file
)