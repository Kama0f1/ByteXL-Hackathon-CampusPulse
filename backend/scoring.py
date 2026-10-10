import pandas as pd

def calculate_student_success_score(row):
    """
    Calculates the SSS (0-100) based on SRS weights.
    Adjusts weights dynamically if data is missing.
    """
    dimensions = {
        'academic': (row.get('cgpa', float('nan')) / 10.0 * 100, 25),
        'attendance': (row.get('attendance_pct', float('nan')), 20),
        'lms': (row.get('assignment_completion_pct', float('nan')), 15),
        'placement': ((row.get('aptitude_score', float('nan')) + row.get('coding_score', float('nan'))) / 2.0, 20),
        'skills': (row.get('technical_skill_score', float('nan')), 10),
        'engagement': ((row.get('clubs_participation_count', float('nan')) + row.get('events_attended_count', float('nan'))) * 10, 5),
        'feedback': (row.get('satisfaction_score', float('nan')) / 10.0 * 100, 5)
    }
    
    total_score = 0
    total_weight_used = 0
    
    for dim, (score, weight) in dimensions.items():
        if pd.notna(score):
            total_score += min(100, max(0, score)) * (weight / 100.0)
            total_weight_used += weight
            
    if total_weight_used == 0:
        return 0.0, 0.0
        
    final_score = (total_score / (total_weight_used / 100.0))
    return round(final_score, 2), total_weight_used
