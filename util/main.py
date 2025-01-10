

import argparse
from offline_data import process_offline_data_file 


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--infile", default="data.json")
    parser.add_argument("--outfile", default="data.csv")
    parser.add_argument("--offline_mode", default="csv", choices=["csv", "upload"])
    args = parser.parse_args()

    # Parse the JSON array in the provided file into a CSV or upload directly to supabase based on mode.
    process_offline_data_file(args.infile, args.outfile, args.offline_mode)
