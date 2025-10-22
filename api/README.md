
Getting the Vercel server function in api/uploadqrdata.ts to run proved
difficult because of the different resolution strategies used by vite
(the loader for the front-end) and by vercel's loader.

During development, run

```
npm run dev
```

in one terminal, this will serve the frontend at `localhost:5173`.

In another terminal, run
```
vercel dev --listen 3000
```
which will run the vercel function backend on port 3000.
`vite.config.ts` contains the necessary proxy setup to forward
`localhost:5173/api` to `localhost:3000/api`.

