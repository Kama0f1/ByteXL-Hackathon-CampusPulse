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
    " " "
    Takes a dictionary of student features and predicts if they will be placed.
    " " "
    if placement_model is None:
        return {"error": "Model not loaded"}
        
    # Convert dictionary to DataFrame for the scikit-learn pipeline
    df = pd.DataFrame([student_data])
    
    # Ensure it only uses the features we trained it on
    features = ['cgpa', 'backlogs', 'attendance_pct', 'assignment_completion_pct', 
                'quiz_avg', 'technical_skill_score', 'communication_score']
    
    # Fill in missing columns with 0 to prevent crashes
    for f in features:
        if f not in df.columns:
            df[f] = 0
            
    df = df[features]
    
    # Predict
    prediction = placement_model.predict(df)[0]
    probability = placement_model.predict_proba(df)[0]
    
    return {
        "prediction": "Placed" if prediction == 1 else "Not Placed",
        "confidence_placed_pct": round(probability[1] * 100, 2)
    }
