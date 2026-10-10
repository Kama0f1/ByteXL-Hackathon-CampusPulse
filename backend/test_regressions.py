"""Run with python -m unittest discover -s backend -p test_*.py -v."""
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import unittest

import pandas as pd

import campus_service as campus
from data_loader import load_and_clean_data
from prediction import predict_placement
import risk_engine
from scoring import calculate_student_success_score


class RegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load_and_clean_data(campus.DATA_DIR)
        cls.cohort = campus.get_campus()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.original_store = campus.STORE_PATH
        campus.STORE_PATH = Path(self.temp.name) / "nested" / "store.json"

    def tearDown(self):
        campus.STORE_PATH = self.original_store
        self.temp.cleanup()

    def test_all_profiles_scores_flags_and_factor_shares(self):
        self.assertEqual(len(self.cohort.students), 1000)
        for student in self.cohort.students:
            profile = campus.get_student(student.sid)
            json.dumps(profile, allow_nan=False)
            for domain, high, medium, points in (
                ("academic", risk_engine.ACADEMIC_HIGH, risk_engine.ACADEMIC_MEDIUM,
                 risk_engine.academic_points(student.history["academics"][-1], student.history["attendance"][-1], student.history["lms"][-1], student.backlogs)),
                ("placement", risk_engine.PLACEMENT_HIGH, risk_engine.PLACEMENT_MEDIUM,
                 risk_engine.placement_points(student.history["placement"][-1], student.mock, student.history["academics"][-1] / 10, student.projects)),
            ):
                risk = profile[domain]
                self.assertEqual(risk["level"], risk_engine.level(risk["index"], high, medium))
                total = sum(points.values())
                if total:
                    self.assertAlmostEqual(sum(f["share"] for f in risk["factors"]), 1)
                    self.assertEqual({f["factor"] for f in risk["factors"]}, {f for f, p in points.items() if p > 0})
                    for factor in risk["factors"]:
                        self.assertAlmostEqual(factor["share"], points[factor["factor"]] / total, places=5)

    def test_prediction_uses_same_score_for_full_student_record(self):
        row = self.data.iloc[0].to_dict()
        prediction = predict_placement(row)
        self.assertEqual(prediction["success_score"], self.cohort.by_id[row["student_id"]].row["successScore"])
        self.assertEqual(prediction["score_weight_coverage_pct"], 100)

    def test_missing_dimensions_report_reduced_score_coverage(self):
        score, coverage = calculate_student_success_score({"cgpa": 8})
        self.assertEqual((score, coverage), (80, 25))
        self.assertEqual(calculate_student_success_score({}), (0, 0))

    def test_concurrent_suggestion_and_post_retries_create_one_action(self):
        for mode in ("suggestion", "post"):
            with self.subTest(mode=mode):
                campus.STORE_PATH = Path(self.temp.name) / mode / "store.json"
                student_id = "STU472"
                barrier = threading.Barrier(12)
                def assign(_):
                    barrier.wait()
                    return (campus.assign_suggested_intervention(student_id, "assigned") if mode == "suggestion"
                            else campus.create_intervention(student_id, None, None, None))
                with ThreadPoolExecutor(max_workers=12) as executor:
                    items = list(executor.map(assign, range(12)))
                self.assertEqual(len({i["interventionId"] for i in items}), 1)
                self.assertEqual(len(campus._load_store()["created"]), 1)
                self.assertEqual(campus._load_store()["created"][0]["studentId"], student_id)

    def test_saved_actions_survive_new_python_process(self):
        item = campus.create_intervention("STU472", None, None, None)
        campus.update_intervention_status(item["interventionId"], "completed")
        alert_id = campus.get_alerts()["alerts"][0]["alertId"]
        segment_id = campus.get_segments()["segments"][0]["segmentId"]
        campus.set_alert_handled(alert_id, True)
        campus.set_group_plan(segment_id, True)
        code = "import json, campus_service as c; print(json.dumps(c._load_store()))"
        env = {**os.environ, "CAMPUS_STORE_PATH": str(campus.STORE_PATH)}
        output = subprocess.check_output([sys.executable, "-c", code], cwd=Path(campus.__file__).parent, env=env, text=True)
        saved = json.loads(output)
        self.assertEqual(saved["status"][item["interventionId"]], "completed")
        self.assertIn(alert_id, saved["handledAlerts"])
        self.assertIn(segment_id, saved["groupPlans"])
        self.assertEqual(len(list(campus.STORE_PATH.parent.iterdir())), 1)

    def test_corrupt_store_is_not_silently_discarded(self):
        campus.STORE_PATH.parent.mkdir(parents=True)
        campus.STORE_PATH.write_text("broken", encoding="utf-8")
        with self.assertRaises(json.JSONDecodeError):
            campus.create_intervention("STU472", None, None, None)
        self.assertEqual(campus.STORE_PATH.read_text(), "broken")

    def test_csv_validation_blocks_missing_invalid_and_mismatched_records(self):
        cases = [("Academic.csv", "backlogs", ""), ("Academic.csv", "backlogs", "1.5"),
                 ("LMS.csv", "quiz_avg", ""), ("Attendance.csv", "attendance_pct", "101"),
                 ("Academic.csv", "student_id", ""), ("Academic.csv", "student_id", "OTHER")]
        for filename, column, value in cases:
            with self.subTest(filename=filename, column=column, value=value):
                folder = Path(self.temp.name) / "fixtures"
                folder.mkdir(exist_ok=True)
                for source in campus.DATA_DIR.glob("*.csv"):
                    frame = pd.read_csv(source, dtype=str, keep_default_na=False).head(3)
                    if source.name == filename:
                        if column == "quiz_avg":
                            frame[column] = value
                        else:
                            frame.loc[0, column] = value
                    frame.to_csv(folder / source.name, index=False)
                with self.assertRaises(ValueError):
                    load_and_clean_data(folder)

    def test_current_data_imputes_supported_scores_and_preserves_categories(self):
        self.assertFalse(self.data.isna().any().any())
        self.assertIn("None", set(self.data["support_need_category"]))
        self.assertEqual(self.data["student_id"].nunique(), 1000)


if __name__ == "__main__":
    unittest.main()
