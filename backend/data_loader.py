"""Validate all seven exports before merging; impute only supported scores."""
from pathlib import Path

import numpy as np
import pandas as pd

SCHEMAS = {
    "Academic.csv": {"cgpa": (0, 10), "backlogs": (0, 30), "semester": (1, 8)},
    "Attendance.csv": {"attendance_pct": (0, 100), "classes_attended": (0, 1000)},
    "LMS.csv": {"assignment_completion_pct": (0, 100), "lms_logins_30d": (0, 1000), "quiz_avg": (0, 100)},
    "Placement.csv": {"aptitude_score": (0, 100), "coding_score": (0, 100), "mock_interview_score": (0, 100), "placement_outcome": None},
    "Skills.csv": {"technical_skill_score": (0, 100), "communication_score": (0, 100), "projects_count": (0, 100), "certifications_count": (0, 100)},
    "Engagement.csv": {"clubs_participation_count": (0, 50), "events_attended_count": (0, 200)},
    "Feedback.csv": {"satisfaction_score": (0, 10), "support_need_category": None},
}
IMPUTABLE = {"quiz_avg", "coding_score", "communication_score"}
COUNTS = {"backlogs", "semester", "classes_attended", "lms_logins_30d", "projects_count", "certifications_count", "clubs_participation_count", "events_attended_count"}


def load_and_clean_data(data_dir="../data"):
    frames = []
    expected_ids = None
    for filename, schema in SCHEMAS.items():
        frame = pd.read_csv(Path(data_dir) / filename, dtype=str, keep_default_na=False)
        frame.columns = frame.columns.str.strip().str.lower()
        if frame.columns.duplicated().any():
            raise ValueError(f"{filename}: duplicate column names")
        missing = {"student_id", *schema} - set(frame.columns)
        if missing:
            raise ValueError(f"{filename}: missing columns: {', '.join(sorted(missing))}")
        if frame.empty:
            raise ValueError(f"{filename}: no student rows")
        frame = frame[["student_id", *schema]].copy()
        frame["student_id"] = frame["student_id"].str.strip()
        if frame["student_id"].str.lower().isin(["", "nan", "null"]).any() or frame["student_id"].duplicated().any():
            raise ValueError(f"{filename}: blank or duplicate student_id")
        ids = set(frame["student_id"])
        if expected_ids is not None and ids != expected_ids:
            raise ValueError(f"{filename}: student IDs must match the other sources; {len(expected_ids - ids)} missing, {len(ids - expected_ids)} unexpected")
        expected_ids = ids
        for column, bounds in schema.items():
            values = frame[column].str.strip()
            blank = values.str.lower().isin(["", "nan", "null"])
            if bounds is None:
                if column == "support_need_category":
                    frame[column] = values.mask(blank, "None")
                else:
                    values = values.str.title()
                    if not values.isin(["Placed", "Not Placed"]).all():
                        raise ValueError(f"{filename}: invalid placement_outcome")
                    frame[column] = values
                continue
            numeric = pd.to_numeric(values.mask(blank), errors="coerce")
            bad = ~blank & (~np.isfinite(numeric) | ~numeric.between(*bounds))
            if column in COUNTS:
                bad |= ~blank & numeric.mod(1).ne(0)
            if bad.any():
                raise ValueError(f"{filename}: invalid {column}; expected {bounds[0]}–{bounds[1]}" + (" whole numbers" if column in COUNTS else ""))
            if blank.any():
                if column not in IMPUTABLE or blank.all():
                    raise ValueError(f"{filename}: {column} has missing values that cannot be filled")
                numeric = numeric.fillna(numeric.mean())
            frame[column] = numeric
        frames.append(frame)
    master = frames[0]
    for frame in frames[1:]:
        master = master.merge(frame, on="student_id", how="inner", validate="one_to_one")
    return master


if __name__ == "__main__":
    print(load_and_clean_data(Path(__file__).resolve().parent.parent / "data").shape)
