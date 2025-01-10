
import json
import pandas as pd
from supabase import create_client, Client, ClientOptions

UPLOAD_TABLE = "raw_data"

def load_offline_data(file):
    data = []
    with open(file, 'r') as f: 
        data = json.load(f)

    return data

def convert_data_to_csv(data, out_file): 
    df = pd.DataFrame(data)
    with open(out_file, 'w') as f:
        df.to_csv(f, header=True, index=False)

def upload_data(data):
    pass

def process_offline_data_file(in_file, out_file, mode):
    data_dict = load_offline_data(in_file)

    if mode == "csv":
        convert_data_to_csv(data_dict, out_file)
    else:
        upload_data(data_dict)