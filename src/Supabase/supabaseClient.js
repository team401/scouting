import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_ANON_KEY;
const supabase = createClient("https://hsmkwrrptltywjqljrpf.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbWt3cnJwdGx0eXdqcWxqcnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk3Mjg0OTIsImV4cCI6MjA0NTMwNDQ5Mn0.uyG-NkGTE--L4aFt96vEy5a6UuwntYxWLouQrG9tLGM");

export default supabase;
