"""
AgriShield AI - Synthetic Dataset Generator

Generates synthetic tabular datasets for local development:

1. Yield prediction
2. Risk scoring
3. Shared farm features

IMPORTANT:
-----------
These datasets are SYNTHETIC.

They are useful for:
- testing the complete ML pipeline
- validating preprocessing
- testing model training
- testing API/inference
- getting baseline metrics

They are NOT suitable as evidence of real-world model accuracy.
Replace with real agricultural observations before making
real-world performance claims.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


# ============================================================
# CONFIGURATION
# ============================================================

RANDOM_SEED = 42

N_YIELD = 20_000
N_RISK = 20_000

rng = np.random.default_rng(
    RANDOM_SEED
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(
    __file__
).resolve().parents[1]


RAW_DIR = (
    BASE_DIR
    / "data"
    / "raw"
)


YIELD_DIR = (
    RAW_DIR
    / "yield"
)


RISK_DIR = (
    RAW_DIR
    / "risk"
)


FEATURE_DIR = (
    RAW_DIR
    / "farm_features"
)


YIELD_DIR.mkdir(
    parents=True,
    exist_ok=True
)

RISK_DIR.mkdir(
    parents=True,
    exist_ok=True
)

FEATURE_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# CROP CONFIGURATION
# ============================================================

CROPS = [
    "soybean",
    "wheat",
    "rice",
    "maize",
    "cotton",
    "chickpea"
]


CROP_BASE_YIELD = {
    # India national average yields in tons/ha (PMFBY / ICAR 2023-24 estimates)
    # inference.py multiplies by 1000 to get kg/ha — so these must stay in t/ha
    "soybean":  1.10,   # India avg ~1,050–1,200 kg/ha; was incorrectly 2.7
    "wheat":    3.30,   # India avg ~3,100–3,500 kg/ha; reasonable
    "rice":     2.30,   # Paddy India avg ~2,100–2,400 kg/ha; was incorrectly 4.1
    "maize":    3.00,   # India avg ~2,900–3,100 kg/ha; was incorrectly 4.4
    "cotton":   0.55,   # Seed cotton lint-equivalent ~500–600 kg/ha
    "chickpea": 1.00,   # India avg ~900–1,050 kg/ha; was incorrectly 2.1
}


CROP_AREA_MIN = {
    "soybean": 0.5,
    "wheat": 0.5,
    "rice": 0.5,
    "maize": 0.5,
    "cotton": 0.5,
    "chickpea": 0.5
}


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def clip(
    values: np.ndarray,
    low: float,
    high: float
) -> np.ndarray:

    return np.clip(
        values,
        low,
        high
    )


def sigmoid(
    values: np.ndarray
) -> np.ndarray:

    return 1.0 / (
        1.0 + np.exp(-values)
    )


# ============================================================
# GENERATE COMMON FARM FEATURES
# ============================================================

def generate_common_features(
    n: int
) -> pd.DataFrame:

    crop = rng.choice(
        CROPS,
        size=n
    )


    area_ha = rng.uniform(
        0.5,
        10.0,
        n
    )


    # --------------------------------------------------------
    # Weather
    # --------------------------------------------------------

    rainfall = clip(
        rng.normal(
            650,
            220,
            n
        ),
        150,
        1400
    )


    rainfall_7d = clip(
        rng.gamma(
            shape=2.2,
            scale=15,
            size=n
        ),
        0,
        180
    )


    rainfall_30d = clip(
        rainfall * rng.uniform(
            0.65,
            1.25,
            n
        ),
        100,
        1500
    )


    temperature_mean = clip(
        rng.normal(
            27.5,
            4.5,
            n
        ),
        15,
        42
    )


    temperature_max = clip(
        temperature_mean
        + rng.normal(
            7.0,
            2.0,
            n
        ),
        20,
        50
    )


    temperature_min = clip(
        temperature_mean
        - rng.normal(
            7.0,
            2.0,
            n
        ),
        5,
        35
    )


    humidity = clip(
        rng.normal(
            67,
            14,
            n
        ),
        25,
        98
    )


    wind_speed = clip(
        rng.normal(
            14,
            6,
            n
        ),
        1,
        40
    )


    # --------------------------------------------------------
    # Soil
    # --------------------------------------------------------

    soil_ph = clip(
        rng.normal(
            6.7,
            0.7,
            n
        ),
        4.8,
        8.2
    )


    nitrogen = clip(
        rng.normal(
            240,
            70,
            n
        ),
        60,
        450
    )


    phosphorus = clip(
        rng.normal(
            24,
            9,
            n
        ),
        5,
        60
    )


    potassium = clip(
        rng.normal(
            180,
            55,
            n
        ),
        50,
        350
    )


    organic_carbon = clip(
        rng.normal(
            0.75,
            0.25,
            n
        ),
        0.15,
        2.0
    )


    # --------------------------------------------------------
    # Satellite indices
    #
    # Deliberately correlated with water, soil, temperature.
    # --------------------------------------------------------

    moisture_signal = (
        rainfall_7d / 100.0
        + humidity / 100.0
        + ndmi_offset_if_needed(n)
    )


    ndmi_mean = clip(
        0.18
        + 0.22 * (
            rainfall_7d / 100.0
        )
        + 0.05 * (
            humidity / 100.0
        )
        - 0.015 * (
            temperature_mean - 25
        )
        + rng.normal(
            0,
            0.07,
            n
        ),
        -0.40,
        0.70
    )


    ndwi_mean = clip(
        -0.18
        + 0.20 * (
            rainfall_7d / 100.0
        )
        + 0.10 * (
            humidity / 100.0
        )
        - 0.03 * (
            temperature_mean - 25
        )
        + rng.normal(
            0,
            0.07,
            n
        ),
        -0.80,
        0.60
    )


    ndvi_mean = clip(
        0.55
        + 0.16 * ndmi_mean
        + 0.08 * ndwi_mean
        + 0.00030 * nitrogen
        + 0.00050 * phosphorus
        + 0.00025 * potassium
        - 0.015 * np.abs(
            soil_ph - 6.7
        )
        - 0.012 * np.maximum(
            temperature_mean - 32,
            0
        )
        + rng.normal(
            0,
            0.08,
            n
        ),
        0.10,
        0.95
    )


    # --------------------------------------------------------
    # NDVI distribution features
    # --------------------------------------------------------

    ndvi_min = clip(
        ndvi_mean
        - rng.uniform(
            0.10,
            0.30,
            n
        ),
        -1,
        1
    )


    ndvi_max = clip(
        ndvi_mean
        + rng.uniform(
            0.08,
            0.20,
            n
        ),
        -1,
        1
    )


    ndvi_std = clip(
        rng.normal(
            0.09,
            0.03,
            n
        ),
        0.02,
        0.25
    )


    ndwi_min = clip(
        ndwi_mean
        - rng.uniform(
            0.05,
            0.20,
            n
        ),
        -1,
        1
    )


    ndwi_max = clip(
        ndwi_mean
        + rng.uniform(
            0.05,
            0.20,
            n
        ),
        -1,
        1
    )


    ndmi_min = clip(
        ndmi_mean
        - rng.uniform(
            0.05,
            0.18,
            n
        ),
        -1,
        1
    )


    ndmi_max = clip(
        ndmi_mean
        + rng.uniform(
            0.05,
            0.18,
            n
        ),
        -1,
        1
    )


    # --------------------------------------------------------
    # Crop development features
    # --------------------------------------------------------

    growth_stage = rng.integers(
        1,
        6,
        n
    )


    sowing_delay_days = clip(
        rng.normal(
            4,
            6,
            n
        ),
        -10,
        30
    )


    # --------------------------------------------------------
    # Extreme weather indicators
    # --------------------------------------------------------

    heat_stress_days = np.maximum(
        temperature_max - 35,
        0
    )


    excessive_rainfall_days = np.maximum(
        rainfall_7d - 90,
        0
    ) / 10.0


    # --------------------------------------------------------
    # Disease probability
    #
    # Used later for the risk model.
    # --------------------------------------------------------

    disease_raw = (

        -2.0

        + 0.035 * (
            humidity - 65
        )

        + 0.45 * (
            rainfall_7d / 50
        )

        - 2.0 * (
            ndvi_mean - 0.55
        )

        + 0.08 * (
            temperature_mean - 25
        )

        + rng.normal(
            0,
            0.45,
            n
        )

    )


    disease_probability = clip(
        sigmoid(disease_raw),
        0.01,
        0.98
    )


    # --------------------------------------------------------
    # Historical loss rate
    # --------------------------------------------------------

    historical_loss = clip(

        0.10

        + 0.25 * disease_probability

        + 0.015 * heat_stress_days

        + 0.02 * excessive_rainfall_days

        + 0.20 * np.maximum(
            0.40 - ndvi_mean,
            0
        )

        + rng.normal(
            0,
            0.08,
            n
        ),

        0.0,

        1.0

    )


    df = pd.DataFrame({

        "crop":
        crop,

        "area_ha":
        np.round(
            area_ha,
            3
        ),

        "rainfall":
        np.round(
            rainfall,
            2
        ),

        "rainfall_7d":
        np.round(
            rainfall_7d,
            2
        ),

        "rainfall_30d":
        np.round(
            rainfall_30d,
            2
        ),

        "temp_mean":
        np.round(
            temperature_mean,
            2
        ),

        "temp_max":
        np.round(
            temperature_max,
            2
        ),

        "temp_min":
        np.round(
            temperature_min,
            2
        ),

        "humidity":
        np.round(
            humidity,
            2
        ),

        "wind_speed":
        np.round(
            wind_speed,
            2
        ),

        "soil_ph":
        np.round(
            soil_ph,
            2
        ),

        "nitrogen":
        np.round(
            nitrogen,
            2
        ),

        "phosphorus":
        np.round(
            phosphorus,
            2
        ),

        "potassium":
        np.round(
            potassium,
            2
        ),

        "organic_carbon":
        np.round(
            organic_carbon,
            3
        ),

        "ndvi_mean":
        np.round(
            ndvi_mean,
            4
        ),

        "ndvi_min":
        np.round(
            ndvi_min,
            4
        ),

        "ndvi_max":
        np.round(
            ndvi_max,
            4
        ),

        "ndvi_std":
        np.round(
            ndvi_std,
            4
        ),

        "ndwi_mean":
        np.round(
            ndwi_mean,
            4
        ),

        "ndwi_min":
        np.round(
            ndwi_min,
            4
        ),

        "ndwi_max":
        np.round(
            ndwi_max,
            4
        ),

        "ndmi_mean":
        np.round(
            ndmi_mean,
            4
        ),

        "ndmi_min":
        np.round(
            ndmi_min,
            4
        ),

        "ndmi_max":
        np.round(
            ndmi_max,
            4
        ),

        "growth_stage":
        growth_stage,

        "sowing_delay_days":
        np.round(
            sowing_delay_days,
            2
        ),

        "heat_stress_days":
        np.round(
            heat_stress_days,
            2
        ),

        "excessive_rainfall_index":
        np.round(
            excessive_rainfall_days,
            3
        ),

        "disease_probability":
        np.round(
            disease_probability,
            4
        ),

        "historical_loss":
        np.round(
            historical_loss,
            4
        )

    })


    return df


# ============================================================
# HELPER USED ABOVE
# ============================================================

def ndmi_offset_if_needed(
    n: int
) -> np.ndarray:

    # Small stochastic term used only while generating
    # synthetic data.
    return rng.normal(
        0,
        0.02,
        n
    )


# ============================================================
# GENERATE YIELD TARGET
# ============================================================

def generate_yield_target(
    df: pd.DataFrame
) -> np.ndarray:

    crop_base = df[
        "crop"
    ].map(
        CROP_BASE_YIELD
    ).to_numpy()


    # --------------------------------------------------------
    # Soil quality
    # --------------------------------------------------------

    soil_score = (

        0.55
        + 0.20 * (
            df["nitrogen"].to_numpy()
            / 300.0
        )
        + 0.10 * (
            df["phosphorus"].to_numpy()
            / 30.0
        )
        + 0.10 * (
            df["potassium"].to_numpy()
            / 200.0
        )

    )


    # --------------------------------------------------------
    # Water suitability
    # --------------------------------------------------------

    rainfall = df[
        "rainfall"
    ].to_numpy()


    rainfall_score = np.exp(

        -(
            (
                rainfall - 700
            )
            /
            350
        ) ** 2

    )


    # --------------------------------------------------------
    # Temperature suitability
    # --------------------------------------------------------

    temperature = df[
        "temp_mean"
    ].to_numpy()


    temperature_score = np.exp(

        -(
            (
                temperature - 27
            )
            /
            7
        ) ** 2

    )


    # --------------------------------------------------------
    # Vegetation signal
    # --------------------------------------------------------

    ndvi = df[
        "ndvi_mean"
    ].to_numpy()


    ndmi = df[
        "ndmi_mean"
    ].to_numpy()


    ndwi = df[
        "ndwi_mean"
    ].to_numpy()


    vegetation_score = (

        0.55

        + 0.75 * (
            ndvi - 0.55
        )

        + 0.35 * ndmi

        + 0.15 * (
            ndwi + 0.15
        )

    )


    # --------------------------------------------------------
    # Stress penalties
    # --------------------------------------------------------

    heat_penalty = (

        0.035
        *
        df[
            "heat_stress_days"
        ].to_numpy()

    )


    rainfall_penalty = (

        0.020
        *
        df[
            "excessive_rainfall_index"
        ].to_numpy()

    )


    sowing_penalty = (

        0.008
        *
        np.maximum(
            df[
                "sowing_delay_days"
            ].to_numpy(),
            0
        )

    )


    # --------------------------------------------------------
    # Final yield multiplier
    # --------------------------------------------------------

    multiplier = (

        0.65

        + 0.20 * soil_score

        + 0.20 * rainfall_score

        + 0.20 * temperature_score

        + 0.45 * vegetation_score

        - heat_penalty

        - rainfall_penalty

        - sowing_penalty

    )


    multiplier = clip(
        multiplier,
        0.35,
        1.45
    )


    yield_value = (

        crop_base
        * multiplier

        + rng.normal(
            0,
            0.22,
            len(df)
        )

    )


    return clip(
        yield_value,
        0.1,   # floor: 100 kg/ha (severe failure)
        5.5,   # cap:   5,500 kg/ha — high-end achievable in India under irrigation
    )


# ============================================================
# GENERATE RISK TARGET
# ============================================================

def generate_risk_target(
    df: pd.DataFrame
) -> tuple[np.ndarray, dict]:

    # --------------------------------------------------------
    # Weather risk
    # --------------------------------------------------------

    weather_risk = (

        0.30
        *
        clip(
            (
                df["heat_stress_days"]
                / 10
            ),
            0,
            1
        )

        + 0.20
        *
        clip(
            (
                df[
                    "excessive_rainfall_index"
                ]
                / 8
            ),
            0,
            1
        )

    )


    # --------------------------------------------------------
    # Crop-health risk
    # --------------------------------------------------------

    crop_health_risk = (

        0.35
        *
        df[
            "disease_probability"
        ].to_numpy()

        + 0.35
        *
        clip(
            (
                0.75
                -
                df[
                    "ndvi_mean"
                ].to_numpy()
            )
            /
            0.50,
            0,
            1
        )

    )


    # --------------------------------------------------------
    # Moisture risk
    # --------------------------------------------------------

    moisture_risk = (

        0.25
        *
        clip(
            (
                0.05
                -
                df[
                    "ndmi_mean"
                ].to_numpy()
            )
            /
            0.40,
            0,
            1
        )

    )


    # --------------------------------------------------------
    # Soil risk
    # --------------------------------------------------------

    ph_risk = clip(

        np.abs(
            df[
                "soil_ph"
            ].to_numpy()
            -
            6.7
        )
        /
        1.8,

        0,

        1

    )


    nutrient_risk = clip(

        1
        -
        (
            (
                df["nitrogen"].to_numpy()
                / 300
            )
            +
            (
                df["phosphorus"].to_numpy()
                / 30
            )
            +
            (
                df["potassium"].to_numpy()
                / 200
            )
        )
        / 3,

        0,

        1

    )


    soil_risk = (

        0.20 * ph_risk
        + 0.20 * nutrient_risk

    )


    # --------------------------------------------------------
    # Historical risk
    # --------------------------------------------------------

    history_risk = (

        0.25
        *
        df[
            "historical_loss"
        ].to_numpy()

    )


    # --------------------------------------------------------
    # Combined latent risk
    # --------------------------------------------------------

    latent_score = (

        weather_risk
        + crop_health_risk
        + moisture_risk
        + soil_risk
        + history_risk

    )


    # --------------------------------------------------------
    # Convert to 0-100 score
    # --------------------------------------------------------

    risk_score = (

        100
        *
        sigmoid(
            (
                latent_score
                -
                0.38
            )
            * 5.0
        )

    )


    # Noise
    risk_score += rng.normal(
        0,
        4.0,
        len(df)
    )


    risk_score = clip(
        risk_score,
        0,
        100
    )


    # --------------------------------------------------------
    # Factors for future explainability work
    # --------------------------------------------------------

    factor_components = {

        "weather_risk":
        weather_risk,

        "crop_health_risk":
        crop_health_risk,

        "moisture_risk":
        moisture_risk,

        "soil_risk":
        soil_risk,

        "historical_risk":
        history_risk

    }


    return (
        risk_score,
        factor_components
    )


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 75)
    print("        AGRISHIELD AI - SYNTHETIC DATA GENERATOR")
    print("=" * 75)

    print()

    print(
        "Generating synthetic agricultural datasets..."
    )

    print(
        f"Yield samples : {N_YIELD:,}"
    )

    print(
        f"Risk samples  : {N_RISK:,}"
    )

    print(
        f"Random seed   : {RANDOM_SEED}"
    )

    print()


    # ========================================================
    # YIELD DATASET
    # ========================================================

    yield_df = generate_common_features(
        N_YIELD
    )


    yield_target = generate_yield_target(
        yield_df
    )


    yield_df["yield"] = np.round(
        yield_target,
        3
    )


    # --------------------------------------------------------
    # Save yield data
    # --------------------------------------------------------

    yield_file = (
        YIELD_DIR
        / "yield_data.csv"
    )


    yield_df.to_csv(
        yield_file,
        index=False
    )


    print(
        "✓ Yield dataset:",
        yield_file
    )


    # ========================================================
    # RISK DATASET
    # ========================================================

    risk_df = generate_common_features(
        N_RISK
    )


    risk_target, risk_components = (
        generate_risk_target(
            risk_df
        )
    )


    # Add yield prediction proxy.
    #
    # IMPORTANT:
    # This is a simulated upstream feature for development.
    # Later your actual yield model will generate this value.
    # ========================================================

    simulated_yield = generate_yield_target(
        risk_df
    )


    risk_df["yield_prediction"] = np.round(
        simulated_yield,
        3
    )


    risk_df["risk_score"] = np.round(
        risk_target,
        2
    )


    # --------------------------------------------------------
    # Save risk data
    # --------------------------------------------------------

    risk_file = (
        RISK_DIR
        / "risk_data.csv"
    )


    risk_df.to_csv(
        risk_file,
        index=False
    )


    print(
        "✓ Risk dataset:",
        risk_file
    )


    # ========================================================
    # COMMON FEATURE DATASET
    # ========================================================

    feature_df = generate_common_features(
        max(
            N_YIELD,
            N_RISK
        )
    )


    # Add simulated yield/risk-related values
    feature_df["yield_estimate"] = np.round(

        generate_yield_target(
            feature_df
        ),

        3

    )


    risk_values, _ = (
        generate_risk_target(
            feature_df
        )
    )


    feature_df["risk_score_estimate"] = np.round(

        risk_values,

        2

    )


    feature_file = (
        FEATURE_DIR
        / "farm_features.csv"
    )


    feature_df.to_csv(
        feature_file,
        index=False
    )


    print(
        "✓ Common feature dataset:",
        feature_file
    )


    # ========================================================
    # METADATA
    # ========================================================

    metadata = {

        "generator":
        "AgriShield AI synthetic agricultural data generator",

        "synthetic":
        True,

        "warning":
        (
            "These datasets are synthetic and are intended "
            "for development/testing only. They must not be "
            "presented as real-world model validation data."
        ),

        "random_seed":
        RANDOM_SEED,

        "datasets": {

            "yield": {

                "file":
                str(
                    yield_file
                ),

                "rows":
                int(
                    len(yield_df)
                ),

                "target":
                "yield",

                "target_unit":
                "tonnes_per_hectare"

            },

            "risk": {

                "file":
                str(
                    risk_file
                ),

                "rows":
                int(
                    len(risk_df)
                ),

                "target":
                "risk_score",

                "target_range":
                "0-100"

            },

            "farm_features": {

                "file":
                str(
                    feature_file
                ),

                "rows":
                int(
                    len(feature_df)
                )

            }

        },

        "feature_groups": {

            "weather": [

                "rainfall",
                "rainfall_7d",
                "rainfall_30d",
                "temp_mean",
                "temp_max",
                "temp_min",
                "humidity",
                "wind_speed"

            ],

            "soil": [

                "soil_ph",
                "nitrogen",
                "phosphorus",
                "potassium",
                "organic_carbon"

            ],

            "satellite": [

                "ndvi_mean",
                "ndvi_min",
                "ndvi_max",
                "ndvi_std",
                "ndwi_mean",
                "ndwi_min",
                "ndwi_max",
                "ndmi_mean",
                "ndmi_min",
                "ndmi_max"

            ],

            "crop": [

                "crop",
                "growth_stage",
                "sowing_delay_days"

            ],

            "risk": [

                "disease_probability",
                "historical_loss",
                "heat_stress_days",
                "excessive_rainfall_index"

            ]

        },

        "not_generated": [

            "crop disease images",
            "crop damage images",
            "YOLO labels",
            "soil OCR document images"

        ]

    }


    metadata_file = (
        RAW_DIR
        / "dataset_metadata.json"
    )


    with open(

        metadata_file,

        "w",

        encoding="utf-8"

    ) as file:

        json.dump(
            metadata,
            file,
            indent=4
        )


    print(
        "✓ Metadata:",
        metadata_file
    )


    # ========================================================
    # QUICK STATISTICS
    # ========================================================

    print()
    print(
        "=" * 75
    )

    print(
        "                   DATASET SUMMARY"
    )

    print(
        "=" * 75
    )

    print()


    print(
        "Yield target:"
    )

    print(
        f"  Mean   : "
        f"{yield_df['yield'].mean():.3f}"
    )

    print(
        f"  Median : "
        f"{yield_df['yield'].median():.3f}"
    )

    print(
        f"  Min    : "
        f"{yield_df['yield'].min():.3f}"
    )

    print(
        f"  Max    : "
        f"{yield_df['yield'].max():.3f}"
    )


    print()

    print(
        "Risk target:"
    )

    print(
        f"  Mean   : "
        f"{risk_df['risk_score'].mean():.2f}"
    )

    print(
        f"  Median : "
        f"{risk_df['risk_score'].median():.2f}"
    )

    print(
        f"  Min    : "
        f"{risk_df['risk_score'].min():.2f}"
    )

    print(
        f"  Max    : "
        f"{risk_df['risk_score'].max():.2f}"
    )


    print()

    print(
        "✓ Synthetic dataset generation complete."
    )


if __name__ == "__main__":
    main()