
import joblib
import pandas as pd
import os

# Locate the model file in the same directory as this script
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'placement_model.joblib')

# Load the model into memory
try:
    placement_model = joblib.load(MODEL_PATH)
except FileNotFoundError:
    placement_model = None
    print("Warning: placement_model.joblib not found. Predictions will fail.")

def predict_placement(student_data):
<<<<<<< HEAD
    
=======
    """
    Takes a dictionary of student features and predicts if they will be placed,
    along with calculating a Student Success Score and identifying risk flags.
    """
>>>>>>> 12eab360561f4966496529fac7c8dfc295c78aad
    if placement_model is None:
        return {"error": "Model not loaded"}
        
    # --- 1. CALCULATE THE STUDENT SUCCESS SCORE ---
    normalized_cgpa = (student_data.get('cgpa', 0) / 10.0) * 100
    
    # 40% Academics, 40% Skills, 20% Attendance
    success_score = (
        (normalized_cgpa * 0.40) + 
        (student_data.get('technical_skill_score', 0) * 0.40) + 
        (student_data.get('attendance_pct', 0) * 0.20)
    )
    
    # --- 2. GENERATE RISK FLAGS ---
    risk_flags = []
    if student_data.get('backlogs', 0) > 0:
        risk_flags.append(f"Academic Risk: {student_data.get('backlogs')} active backlogs")
    if student_data.get('attendance_pct', 100) < 75:
        risk_flags.append("Engagement Risk: Attendance below 75%")
    if student_data.get('technical_skill_score', 100) < 60:
        risk_flags.append("Placement Risk: Low technical skills")
        
    # --- 3. PREPARE DATA FOR ML MODEL ---
    df = pd.DataFrame([student_data])
    
    features = ['cgpa', 'backlogs', 'attendance_pct', 'assignment_completion_pct', 
                'quiz_avg', 'technical_skill_score', 'communication_score']
    
    for f in features:
        if f not in df.columns:
            df[f] = 0
            
    df = df[features]
    
    # --- 4. PREDICT PLACEMENT ---
    prediction = placement_model.predict(df)[0]
    probability = placement_model.predict_proba(df)[0]
    
    # --- 5. RETURN COMBINED RESULTS (API SAFE) ---
    return {
        "success_score": float(round(success_score, 1)),
        "risk_flags": risk_flags,
        "prediction": "Placed" if prediction == 1 else "Not Placed",
        "confidence_placed_pct": float(round(probability[1] * 100, 2))
    }
