
import datetime

from supabase_client_interface import create_supabase_client
from tba_client import TBAClient

# import types
from supabase import Client

EVENT_TABLE = "Event"

def update_event_info_for_team(sb_credentials, tba_credentials, team_number):
    # Create API clients.
    sb_client = create_supabase_client(sb_credentials)
    tba_client = TBAClient(tba_credentials['base_url'], tba_credentials['api_key'])

    # Get the current year so we can figure out which events we are attending.
    today = datetime.date.today()
    current_year = today.year

    # Query TBA to find all events being attended by the team this year.
    team_events_response = tba_client.get_data(f"/team/frc{team_number}/events/{current_year}")
    team_events = team_events_response.json()

    for i in range(len(team_events)):
        event = team_events[i]

        if 'key' in event and 'short_name' in event and 'start_date' in event and 'end_date' in event:
            event_id = event['key']
            name = event['short_name']
            start = event['start_date']
            end = event['end_date']

            # Publish the event to the Event table.
            event_dict = {
                'event_id': event_id,
                'name': name,
                'start_date': start,
                'end_date': end
            }
            sb_client.table(EVENT_TABLE).upsert(event_dict).execute()

            print(f"{event_id}: {name}, {start} - {end}")


    