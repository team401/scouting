

from supabase import create_client, Client, ClientOptions

def create_supabase_client(credentials) -> Client:
    supabase_client: Client = create_client(
            supabase_url=credentials['url'], 
            supabase_key=credentials['token'], 
            options=ClientOptions(auto_refresh_token=False, postgrest_client_timeout=30))
    return supabase_client