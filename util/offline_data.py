
import json
import logging
import pandas as pd

from supabase_client_interface import create_supabase_client

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


def process_offline_data_file(in_file, out_file, mode, type, sb_credentials) -> None:
    data_dict = load_offline_data(in_file)

    # Pick table based on type of data.
    table = "MatchData"
    if type == "pit":
        table = "PitData"

    if mode == "csv":
        convert_data_to_csv(data_dict, out_file)
    else:
        upload_data(data_dict, table, sb_credentials)
