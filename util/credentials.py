
import json

# Public supabase credentials.
SUPABASE_URL = "https://oltmplswnrxlhmordqki.supabase.co"
SUPABASE_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG1wbHN3bnJ4bGhtb3JkcWtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk0ODU4MCwiZXhwIjoyMDc1NTI0NTgwfQ.DYUq_sjd2fl1E3j5eeCEW79QIY9VCHQE-rasa88troE"

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