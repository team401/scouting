# Team 401 Copper Scout -  a First Robotics Competition Scouting App

## How to use

[clone the repo](https://github.com/team401/scouting):

<!-- #default-branch-switch -->

```bash
git clone https://github.com/team401/scouting
cd scouting
```

Add The Blue Alliance API Key ([free at](thebluealliance.com)) to data.tsx file

Add Supabase URL and Anion key to ```./src/Supabase/.env.local```

Install all dependencies: 
```bash
npm install
```

then start in production mode:
```bash
npm start
```

or start in development mode:
```bash
npm run dev
```


## Features

- ***Offline data collection***: users can populate scouting form and a QR Code is automatically generated on submission that contains comma seperated values to import into Google Spreadsheet or custom script
- ***Comprehensive data graphs***: Once all data is sent to supabase, users are able to look at graphs viewing averages of all inputted data such as: teleop speaker points, teleop amp points, auto points, and endgame points.
- ***Online data submission***: When Wifi or cellular service is available, the form will automatically submit to a supabase database and calculate averages

## Technology

- ***React***: Used to handle views of application and form submission
- ***Typescript***: statically-typed language to promote early type error detection
- ***react-qr-code***: Library used to efficiently generate QR Codes containing form data if no internet is available
- ***Material-UI / Tailwind CSS***: Material UI Components used (Autofill etc) in conjuction with tailwind CSS to provide a dynamic webpage that conforms to mobile and web usage
- ***Supabase***: handles all relevant data submission from scouting form and queries for graphs
