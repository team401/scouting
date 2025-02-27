
import datetime

from supabase_client_interface import create_supabase_client
from tba_client import TBAClient

# import types
from supabase import Client

EVENT_TABLE = "Event"
TEAM_TABLE = "Team"

def update_attendance_list_for_all_events(sb_credentials, tba_credentials):
    # Get the list of event IDs
    sb_client = create_supabase_client(sb_credentials)
    events = sb_client.table(EVENT_TABLE).select("*").execute()

    for e in events.data:
        print(e)
        update_team_info_for_event(sb_credentials, tba_credentials, e['event_id'])


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


def update_team_info_for_event(sb_credentials, tba_credentials, event_id):
    # Create API clients.
    sb_client = create_supabase_client(sb_credentials)
    tba_client = TBAClient(tba_credentials['base_url'], tba_credentials['api_key'])

    # Query TBA to find all teams at the specified event
    event_teams_response = tba_client.get_data(f"/event/{event_id}/teams")
    event_teams = event_teams_response.json()

    if 'Error' in event_teams:
        return

    for i in range(len(event_teams)):
        team = event_teams[i]

        if 'team_number' in team and 'nickname' in team and 'start_date':
            name = team['nickname']
            number = team['team_number']

            # Publish the event to the Event table.
            team_dict = {
                'event_id': event_id,
                'name': name,
                'team_number': number,
                'key': f"{event_id}_{number}"
            }
            sb_client.table(TEAM_TABLE).upsert(team_dict).execute()
