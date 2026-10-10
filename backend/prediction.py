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
    """
    Takes a dictionary of student features and predicts if they will be placed,
    calculates a Success Score, identifies risk flags, and segments the student.
    """
    if placement_model is None:
        return {"error": "Model not loaded"}
        
    # --- 1. CALCULATE THE STUDENT SUCCESS SCORE ---
    normalized_cgpa = (student_data.get('cgpa', 0) / 10.0) * 100
    
    success_score = (
        (normalized_cgpa * 0.40) + 
        (student_data.get('technical_skill_score', 0) * 0.40) + 
        (student_data.get('attendance_pct', 0) * 0.20)
    )
    
    # --- 2. GENERATE RISK FLAGS ---
    risk_flags = []
    backlogs = student_data.get('backlogs', 0)
    attendance = student_data.get('attendance_pct', 100)
    tech_skills = student_data.get('technical_skill_score', 100)
    cgpa = student_data.get('cgpa', 10.0)
    
    if backlogs > 0:
        risk_flags.append(f"Academic Risk: {backlogs} active backlogs")
    if attendance < 75:
        risk_flags.append("Engagement Risk: Attendance below 75%")
    if tech_skills < 60:
        risk_flags.append("Placement Risk: Low technical skills")
        
    # --- 3. STUDENT SEGMENTATION (BONUS CREDIT) ---
    segment = "Standard Progress" # Default
    
    if cgpa >= 7.5 and tech_skills >= 75:
        segment = "High Performer - Ready for Placement"
    elif cgpa >= 7.5 and tech_skills < 60:
        segment = "High Academic / Low Placement Readiness"
    elif cgpa < 6.5 and tech_skills >= 75:
        segment = "High Skill / Academic Risk"
    elif attendance < 60 and student_data.get('assignment_completion_pct', 100) < 60:
        segment = "Disengaged - Needs Immediate Intervention"
    elif cgpa < 6.0 and backlogs > 1:
        segment = "Critical Academic Risk"

    # --- 4. PREPARE DATA FOR ML MODEL ---
    df = pd.DataFrame([student_data])
    
    features = ['cgpa', 'backlogs', 'attendance_pct', 'assignment_completion_pct', 
                'quiz_avg', 'technical_skill_score', 'communication_score']
    
    for f in features:
        if f not in df.columns:
            df[f] = 0
            
    df = df[features]
    
    # --- 5. PREDICT PLACEMENT ---
    prediction = placement_model.predict(df)[0]
    probability = placement_model.predict_proba(df)[0]
    
    # --- 6. RETURN COMBINED RESULTS ---
    return {
        "success_score": float(round(success_score, 1)),
        "segment": segment,  # NEW: Added for the frontend dashboard!
        "risk_flags": risk_flags,
        "prediction": "Placed" if prediction == 1 else "Not Placed",
        "confidence_placed_pct": float(round(probability[1] * 100, 2))
    }
