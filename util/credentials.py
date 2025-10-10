
import json

# Public supabase credentials.
SUPABASE_URL = "https://oltmplswnrxlhmordqki.supabase.co"
SUPABASE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG1wbHN3bnJ4bGhtb3JkcWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDg1ODAsImV4cCI6MjA3NTUyNDU4MH0.K78JxtZvx2QUS2B8YimMjYzA5f5olHag-3QVoM6-Or0"

def get_tba_credentials(input_creds, file="private_credentials.json"):
    tba_creds = None
    if input_creds is not None:
        tba_creds = json.loads(input_creds)
    else:
        with open(file, 'r') as f:
            prv_creds = json.load(f)
            tba_creds = prv_creds['tba']
    
    return tba_creds

def get_supabase_credentials():
    return {
        "url": SUPABASE_URL, 
        "token": SUPABASE_TOKEN
    }