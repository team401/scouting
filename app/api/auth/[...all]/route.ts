async function handler() {
  return Response.json(
    { error: 'Scouting accounts are managed through Team 401 Ops.' },
    { status: 404 },
  );
}

export const GET = handler;
export const POST = handler;
