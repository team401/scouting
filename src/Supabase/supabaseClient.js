import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_ANON_KEY;
const supabase = createClient("https://hsmkwrrptltywjqljrpf.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96a3lrcm11aWtxZ3JqZndlbXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg1NTgzOTQsImV4cCI6MjAyNDEzNDM5NH0.uw5P0WARTEleBzhNtraLsCEO2wp781rSzggxDI9dm8s");

export default supabase;
