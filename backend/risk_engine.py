def assess_academic_risk(row):
    " " "
    Evaluates Academic Risk based on specific SRS thresholds.
    " " "
    cgpa = row.get('cgpa', 10.0)
    attendance = row.get('attendance_pct', 100.0)
    backlogs = row.get('backlogs', 0)
    
    factors = []
    
    if attendance < 75 or cgpa < 6.0 or backlogs >= 2:
        if attendance < 75: factors.append("Critically low attendance")
        if cgpa < 6.0: factors.append("CGPA below 6.0")
        if backlogs >= 2: factors.append("Multiple backlogs")
        return "High", factors
        
    elif attendance < 82 or cgpa < 7.0 or backlogs == 1:
        if attendance < 82: factors.append("Low attendance")
        if cgpa < 7.0: factors.append("CGPA below 7.0")
        if backlogs == 1: factors.append("One backlog")
        return "Medium", factors
        
    return "Low", ["On track academically"]

def assess_placement_risk(row):
    " " "
    Evaluates Placement Readiness based on SRS thresholds.
    " " "
    coding = row.get('coding_score', 0)
    aptitude = row.get('aptitude_score', 0)
    mock = row.get('mock_interview_score', 0)
    
    readiness_score = (coding + aptitude + mock) / 3.0
    factors = []
    
    if readiness_score < 45:
        if coding < 45: factors.append("Low coding score")
        if mock < 45: factors.append("Needs interview prep")
        return "High", round(readiness_score, 2), factors
    elif readiness_score < 60:
        return "Medium", round(readiness_score, 2), ["Borderline scores, needs practice"]
    
    return "Low", round(readiness_score, 2), ["Placement ready"]
