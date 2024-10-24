import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_ANON_KEY;

const supabase = createClient("https://hsmkwrrptltywjqljrpf.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbWt3cnJwdGx0eXdqcWxqcnBmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTcyODQ5MiwiZXhwIjoyMDQ1MzA0NDkyfQ.qgVkNvWkDXiaiS9GDzG-1fFYkf3KnheVpIJr4B3XfFk");


export default supabase;
