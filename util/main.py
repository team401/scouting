

import argparse

from offline_data import process_offline_data_file 
from event_info import update_event_info_for_team

from credentials import get_supabase_credentials, get_tba_credentials

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", default="offline", choices=["offline", "event"])
    parser.add_argument("--infile", default="data.json")
    parser.add_argument("--outfile", default="data.csv")
    parser.add_argument("--offline_mode", default="upload", choices=["csv", "upload"])
    parser.add_argument("--type", default="match", choices=["match", "pit"])
    parser.add_argument("--tba_creds", default=None)
    parser.add_argument("--team_number", default=401)
    args = parser.parse_args()

    # Load credentials
    sb_creds = get_supabase_credentials()
    tba_creds = get_tba_credentials(args.tba_creds)
        
    # Parse the JSON array in the provided file into a CSV or upload directly to supabase based on mode.
    if args.mode == "offline":
        process_offline_data_file(args.infile, args.outfile, args.offline_mode, args.type, sb_creds)
    elif args.mode == "event":
        update_event_info_for_team(sb_creds, tba_creds, args.team_number)

