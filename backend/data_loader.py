import pandas as pd
import os

def load_and_clean_data(data_dir='../data'):
    """
    Reads the 7 campus datasets, cleans missing values, and merges them on student_id.
    """
    # 1. Load datasets
    academic_df = pd.read_csv(os.path.join(data_dir, 'Academic.csv'))
    attendance_df = pd.read_csv(os.path.join(data_dir, 'Attendance.csv'))
    lms_df = pd.read_csv(os.path.join(data_dir, 'LMS.csv'))
    placement_df = pd.read_csv(os.path.join(data_dir, 'Placement.csv'))
    skills_df = pd.read_csv(os.path.join(data_dir, 'Skills.csv'))
    engagement_df = pd.read_csv(os.path.join(data_dir, 'Engagement.csv'))
    feedback_df = pd.read_csv(os.path.join(data_dir, 'Feedback.csv'))

    # 2. Clean Data: Replace missing values with the column mean
    placement_df['coding_score'] = placement_df['coding_score'].fillna(placement_df['coding_score'].mean())
    lms_df['quiz_avg'] = lms_df['quiz_avg'].fillna(lms_df['quiz_avg'].mean())
    skills_df['communication_score'] = skills_df['communication_score'].fillna(skills_df['communication_score'].mean())

    # 3. Merge everything into one master dataset
    master_df = academic_df.merge(attendance_df, on='student_id', how='outer')
    master_df = master_df.merge(lms_df, on='student_id', how='outer')
    master_df = master_df.merge(placement_df, on='student_id', how='outer')
    master_df = master_df.merge(skills_df, on='student_id', how='outer')
    master_df = master_df.merge(engagement_df, on='student_id', how='outer')
    master_df = master_df.merge(feedback_df, on='student_id', how='outer')

    return master_df

if __name__ == "__main__":
    # Quick test to ensure it works when you run this file directly
    df = load_and_clean_data(data_dir='../data')
    print(f"Data successfully loaded and merged! Shape: {df.shape}")