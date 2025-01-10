
import json
import logging
import pandas as pd
from supabase import create_client, Client, ClientOptions

from public_credentials import SUPABASE_URL, SUPABASE_TOKEN

UPLOAD_TABLE = "raw_data"


def create_supabase_client(credentials) -> Client:
    supabase_client: Client = create_client(
            supabase_url=credentials['url'], 
            supabase_key=credentials['token'], 
            options=ClientOptions(auto_refresh_token=False, postgrest_client_timeout=30))
    return supabase_client

def load_offline_data(file) -> list:
    data = []
    with open(file, 'r') as f: 
        data = json.load(f)

    return data

def convert_data_to_csv(data, out_file) -> None: 
    df = pd.DataFrame(data)
    with open(out_file, 'w') as f:
        df.to_csv(f, header=True, index=False)

def upload_data(data, table: str, credentials: dict) -> None:
    sb_client = create_supabase_client(credentials)

    try:
        sb_client.table(table).insert(data).execute()
    except Exception as e:
        logging.error(e)


def process_offline_data_file(in_file, out_file, mode, table="MatchData", credentials={"url": SUPABASE_URL, "token": SUPABASE_TOKEN}) -> None:
    data_dict = load_offline_data(in_file)

    if mode == "csv":
        convert_data_to_csv(data_dict, out_file)
    else:
        upload_data(data_dict, table, credentials)