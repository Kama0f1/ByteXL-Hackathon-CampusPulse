from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

def segment_students(df, n_clusters=4):
    """
    Uses Scikit-Learn K-Means to cluster students based on numerical features.
    """
    features = ['cgpa', 'attendance_pct', 'assignment_completion_pct', 
                'coding_score', 'technical_skill_score']
    
    cluster_data = df[features].fillna(df[features].mean())
    
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(cluster_data)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df['cluster_id'] = kmeans.fit_predict(scaled_data)
    
    return df
