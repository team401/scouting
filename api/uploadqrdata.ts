import type { VercelRequest, VercelResponse } from '@vercel/node';
import { matchScoutTable } from "../src/lib/constants";
import { supabase } from '../src/lib/supabase-client';

// invocation is /api/uploadqrdata?data=....
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { data } = req.query;

  if (!data || typeof data !== 'string') {
    res.status(400).send('Missing or invalid data parameter');
    return;
  }

  try {
    const submitData = JSON.parse(decodeURIComponent(data));

    console.log("Submitting");
    console.log(submitData);
    const { error } = await supabase.from(matchScoutTable).insert(submitData);

    if (error) {
        res.status(200).send(`
          <html>
            <head>
              <title>Data Processing Error</title>
            </head>
            <body>
              <h1>An error occurred submitting the data to the database.</h1>
              <pre>{error}</pre>
            </body>
          </html>
        `);
    } else {
        const sd = submitData;
        res.status(200).send(`
          <html>
            <head>
              <title>Data Processed</title>
            </head>
            <body>
              <h1>Data successfully processed.</h1>
              <p>Scout name: ${sd['prematch.scout_name']}</p>
              <p>Scout team: ${sd['prematch.scout_team']}</p>
              <p>Match number : ${sd['prematch.match_number']}</p>
            </body>
          </html>
        `);
    }
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).send('Error processing data');
  }
}
