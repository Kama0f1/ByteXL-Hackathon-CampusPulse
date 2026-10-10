"""
prediction.py - Multi-model machine learning pipeline for Campus Pulse.

Trains and evaluates multiple regression and classification models using scikit-learn
to predict student success scores, academic risk levels, and placement probabilities.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge, Lasso
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC, SVR

logger = logging.getLogger(__name__)


class StudentPredictor:
    """Orchestrates data loading, feature engineering, model training, and predictions."""

    def __init__(self, data_dir: str | Path = "data") -> None:
        self.data_dir = Path(data_dir)
        self.models: Dict[str, Any] = {}
        self.metrics_report: Dict[str, Any] = {}

    def load_and_merge_data(self) -> pd.DataFrame:
        """Loads all CSV data sources and merges them on student_id."""
        files = {
            "academic": "Academic.csv",
            "attendance": "Attendance.csv",
            "lms": "LMS.csv",
            "placement": "Placement.csv",
            "skills": "Skills.csv",
            "engagement": "Engagement.csv",
            "feedback": "Feedback.csv",
        }

        dfs: Dict[str, pd.DataFrame] = {}
        for key, filename in files.items():
            path = self.data_dir / filename
            if path.exists():
                try:
                    df = pd.read_csv(path)
                    # Normalize column names to lowercase
                    df.columns = [c.strip().lower() for c in df.columns]
                    # Ensure student_id alias is standardized
                    if "student_id" not in df.columns and "id" in df.columns:
                        df = df.rename(columns={"id": "student_id"})
                    dfs[key] = df
                except Exception as exc:
                    logger.warning("Could not load %s: %s", filename, exc)

        if not dfs:
            raise FileNotFoundError(f"No CSV datasets found in {self.data_dir.resolve()}")

        # Start with academic or the first available dataset
        base_key = next(iter(dfs))
        merged = dfs[base_key]

        for key, df in dfs.items():
            if key == base_key:
                continue
            if "student_id" in merged.columns and "student_id" in df.columns:
                merged = pd.merge(merged, df, on="student_id", how="outer", suffixes=("", f"_{key}"))

        return merged

    def prepare_features(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
        """Preprocesses merged data into feature matrices and target vectors."""
        # Drop identifier or non-predictive text columns if present
        drop_cols = [c for c in ["student_id", "name", "email", "feedback_text"] if c in df.columns]
        feature_df = df.drop(columns=drop_cols, errors="ignore")

        # Create target variables if they don't explicitly exist
        # 1. Success Score (Regression target: 0-100 composite)
        if "success_score" not in feature_df.columns:
            # Estimate from cgpa, attendance, etc., if available
            cgpa_col = next((c for c in feature_df.columns if "cgpa" in c), None)
            att_col = next((c for c in feature_df.columns if "attendance" in c), None)
            
            base_score = 50.0
            if cgpa_col and att_col:
                feature_df["success_score"] = (feature_df[cgpa_col] / 10.0 * 50) + (feature_df[att_col] * 0.5)
            else:
                feature_df["success_score"] = np.random.uniform(40, 95, size=len(feature_df))

        # 2. Risk Flag (Classification target: 1 = High/Academic Risk, 0 = Low Risk)
        if "risk_flag" not in feature_df.columns:
            risk_col = next((c for c in feature_df.columns if "risk" in c and c != "risk_flag"), None)
            if risk_col:
                feature_df["risk_flag"] = (feature_df[risk_col] > 50).astype(int)
            else:
                feature_df["risk_flag"] = (feature_df["success_score"] < 60).astype(int)

        y_reg = feature_df["success_score"]
        y_clf = feature_df["risk_flag"]
        X = feature_df.drop(columns=["success_score", "risk_flag"], errors="ignore")

        # Keep only numeric features for baseline modeling
        X = X.select_dtypes(include=[np.number])

        return X, y_reg, y_clf

    def train_models(self) -> Dict[str, Any]:
        """Trains multiple regression and classification algorithms and evaluates performance."""
        df = self.load_and_merge_data()
        X, y_reg, y_clf = self.prepare_features(df)

        if X.empty:
            raise ValueError("Feature matrix X is empty. Check your input CSV files.")

        # Train/Test splits
        X_train, X_test, y_reg_train, y_reg_test = train_test_split(X, y_reg, test_size=0.2, random_state=42)
        _, _, y_clf_train, y_clf_test = train_test_split(X, y_clf, test_size=0.2, random_state=42)

        # Regression Models pipeline dictionary
        reg_estimators = {
            "linear_regression": LinearRegression(),
            "ridge": Ridge(),
            "lasso": Lasso(),
            "random_forest_regressor": RandomForestRegressor(n_estimators=100, random_state=42),
            "gradient_boosting_regressor": GradientBoostingRegressor(random_state=42),
            "svr": SVR(),
            "knn_regressor": KNeighborsRegressor(),
        }

        reg_results = {}
        for name, model in reg_estimators.items():
            pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                ("model", model)
            ])
            pipe.fit(X_train, y_reg_train)
            preds = pipe.predict(X_test)
            rmse = float(np.sqrt(mean_squared_error(y_reg_test, preds)))
            r2 = float(r2_score(y_reg_test, preds))
            
            self.models[f"reg_{name}"] = pipe
            reg_results[name] = {"rmse": rmse, "r2_score": r2}

        # Classification Models pipeline dictionary
        clf_estimators = {
            "logistic_regression": LogisticRegression(max_iter=1000),
            "random_forest_classifier": RandomForestClassifier(n_estimators=100, random_state=42),
            "gradient_boosting_classifier": GradientBoostingClassifier(random_state=42),
            "svc": SVC(probability=True),
            "knn_classifier": KNeighborsClassifier(),
        }

        clf_results = {}
        for name, model in clf_estimators.items():
            pipe = Pipeline([
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
                ("model", model)
            ])
            pipe.fit(X_train, y_clf_train)
            preds = pipe.predict(X_test)
            acc = float(accuracy_score(y_clf_test, preds))
            
            try:
                probs = pipe.predict_proba(X_test)[:, 1]
                auc = float(roc_auc_score(y_clf_test, probs))
            except Exception:
                auc = None

            self.models[f"clf_{name}"] = pipe
            clf_results[name] = {"accuracy": acc, "roc_auc": auc}

        self.metrics_report = {
            "regression_evaluation": reg_results,
            "classification_evaluation": clf_results,
            "features_used": list(X.columns),
        }

        return self.metrics_report

    def predict_student(self, student_features: dict[str, Any]) -> dict[str, Any]:
        """Applies trained pipelines to predict success score and risk probability for a single student."""
        if not self.models:
            self.train_models()

        input_df = pd.DataFrame([student_features])
        
        # Predict success score using Random Forest Regressor
        reg_model = self.models.get("reg_random_forest_regressor")
        predicted_success = float(reg_model.predict(input_df)[0]) if reg_model and not input_df.empty else 0.0

        # Predict risk probability using Gradient Boosting Classifier
        clf_model = self.models.get("clf_gradient_boosting_classifier")
        risk_prob = 0.0
        if clf_model:
            try:
                risk_prob = float(clf_model.predict_proba(input_df)[0][1]) * 100
            except Exception:
                pass

        return {
            "predicted_success_score": round(predicted_success, 2),
            "predicted_risk_probability": round(risk_prob, 2),
        }