import sqlite3
from pathlib import Path

db = Path('data/alerts.db')
conn = sqlite3.connect(str(db))
deleted = conn.execute("DELETE FROM alerts WHERE confidence < 0.1 OR camera_id LIKE '%cam5%'").rowcount
conn.commit()
total = conn.execute('SELECT COUNT(*) FROM alerts').fetchone()[0]
conn.close()
print(f'Deleted {deleted} junk alerts. Remaining: {total}')
