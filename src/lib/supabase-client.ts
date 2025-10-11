
import { createClient } from '@supabase/supabase-js'

export const projectId = "oltmplswnrxlhmordqki"
export const supabase = createClient("https://" + projectId + ".supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdG1wbHN3bnJ4bGhtb3JkcWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDg1ODAsImV4cCI6MjA3NTUyNDU4MH0.K78JxtZvx2QUS2B8YimMjYzA5f5olHag-3QVoM6-Or0");
