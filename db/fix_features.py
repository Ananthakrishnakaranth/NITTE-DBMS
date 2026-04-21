import pandas as pd
import mysql.connector
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from config import Config

csv_path = '/home/pranam/Downloads/DBMS/dataset.csv'
df = pd.read_csv(csv_path, low_memory=False)

def get_first_artist(artists_str):
    if pd.isna(artists_str):
        return 'Unknown Artist'
    return str(artists_str).split(';')[0].strip()

df['artist_first'] = df['artists'].apply(get_first_artist)

numeric_cols = ['danceability', 'energy', 'valence', 'tempo', 'acousticness', 'speechiness', 'instrumentalness', 'liveness']
for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.5)

df.loc[df['tempo'] <= 0, 'tempo'] = 120.0

df = df[['track_name', 'artist_first'] + numeric_cols]
df.columns = ['title', 'artist'] + numeric_cols

conn = mysql.connector.connect(host=Config.DB_HOST, port=Config.DB_PORT, database=Config.DB_NAME, user=Config.DB_USER, password=Config.DB_PASSWORD)
cur = conn.cursor()

batch_size = 5000
total = 0

for start in range(0, len(df), batch_size):
    batch = df.iloc[start:start + batch_size]
    for _, row in batch.iterrows():
        title = str(row['title'])[:200]
        artist = str(row['artist'])[:200]
        danceability = float(row['danceability'])
        energy = float(row['energy'])
        valence = float(row['valence'])
        tempo = float(row['tempo'])
        acousticness = float(row['acousticness'])
        speechiness = float(row['speechiness'])
        instrumentalness = float(row['instrumentalness'])
        liveness = float(row['liveness'])
        
        cur.execute('''
            INSERT IGNORE INTO song_features (song_id, danceability, energy, valence, tempo, acousticness, speechiness, instrumentalness, liveness)
            SELECT s.song_id, %s, %s, %s, %s, %s, %s, %s, %s
            FROM songs s
            WHERE s.title = %s AND s.artist = %s
        ''', (danceability, energy, valence, tempo, acousticness, speechiness, instrumentalness, liveness, title, artist))
    
    conn.commit()
    total += len(batch)
    print(f'Batch {start // batch_size + 1}: inserted {len(batch)}, total {total}')

cur.execute('SELECT COUNT(*) FROM song_features')
print(f'FINAL: {cur.fetchone()[0]} features')
conn.close()