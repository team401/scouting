import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_ANON_KEY;
const supabase = createClient("https://awofyvgmlvauknayxexr.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3b2Z5dmdtbHZhdWtuYXl4ZXhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDU3OTU1MzIsImV4cCI6MjAyMTM3MTUzMn0.VirN_00l39NHrc4mEW18ACH3amyEWCxez4cAK4ZjISs");

export default supabase;
