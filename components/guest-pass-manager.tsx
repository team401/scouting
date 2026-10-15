'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, LoaderCircle, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmActionDialog } from '@/components/confirm-action-dialog';

type GuestPass = {
  id: string;
  userId: string;
  name: string;
  expiresAt: number;
  revokedAt: number | null;
  createdAt: number;
  memberDisabled: number;
  expired: number;
};

export function GuestPassManager() {
  const [passes, setPasses] = useState<GuestPass[]>([]);
  const [name, setName] = useState('');
  const [hours, setHours] = useState(24);
  const [newCode, setNewCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    pass: GuestPass;
    action: 'revoke' | 'remove';
  } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/guest-passes', { cache: 'no-store' });
    if (!response.ok) return;
    const body = (await response.json()) as { passes: GuestPass[] };
    setPasses(body.passes);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createPass() {
    setBusy(true);
    setMessage('');
    const response = await fetch('/api/guest-passes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, expiresInHours: hours }),
    });
    const body = (await response.json()) as { error?: string; code?: string };
    setBusy(false);
    if (!response.ok || !body.code) {
      setMessage(body.error ?? 'Could not create the guest pass.');
      return;
    }
    setNewCode(body.code);
    setName('');
    setMessage(
      'Guest pass created. Copy it now; it is not stored in readable form.',
    );
    await load();
  }

  async function revokePass(pass: GuestPass) {
    const response = await fetch('/api/guest-passes', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: pass.id }),
    });
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? `${pass.name}'s guest access was revoked.`
        : (body.error ?? 'Could not revoke the guest pass.'),
    );
    if (response.ok) await load();
    return response.ok;
  }

  async function removePass(pass: GuestPass) {
    const response = await fetch('/api/guest-passes', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: pass.id, action: 'remove' }),
    });
    const body = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? `${pass.name} was removed.`
        : (body.error ?? 'Could not remove the guest pass.'),
    );
    if (response.ok) await load();
    return response.ok;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner-team guest access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Create one shared code for a partner team. Each visiting scout enters
          the code and their own name. Revoking the code signs out the entire
          guest group.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Partner team or group</Label>
            <Input
              id="guest-name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="Team 1234"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guest-duration">Expires after</Label>
            <select
              id="guest-duration"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
            >
              <option value={8}>8 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
              <option value={168}>7 days</option>
            </select>
          </div>
          <Button
            disabled={busy || name.trim().length < 2}
            onClick={createPass}
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
            Create pass
          </Button>
        </div>
        {newCode && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              New team code — shown only now
            </p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto text-base font-semibold">
                {newCode}
              </code>
              <Button
                size="icon"
                variant="outline"
                aria-label="Copy team code"
                onClick={() => void navigator.clipboard.writeText(newCode)}
              >
                <Copy />
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          {passes.map((pass) => {
            const active =
              !pass.revokedAt && !pass.expired && !pass.memberDisabled;
            return (
              <div className="member-row" key={pass.id}>
                <div>
                  <strong>{pass.name}</strong>
                  <small>
                    Expires {new Date(pass.expiresAt).toLocaleString()}
                  </small>
                </div>
                <Badge variant={active ? 'default' : 'outline'}>
                  {active ? <Check /> : <X />}
                  {pass.revokedAt
                    ? 'Revoked'
                    : pass.expired
                      ? 'Expired'
                      : pass.memberDisabled
                        ? 'Disabled'
                        : 'Active'}
                </Badge>
                {active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingAction({ pass, action: 'revoke' })}
                  >
                    Revoke
                  </Button>
                )}
                {!active && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setPendingAction({ pass, action: 'remove' })}
                  >
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
          {!passes.length && (
            <p className="text-sm text-muted-foreground">
              No guest passes yet.
            </p>
          )}
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
      <ConfirmActionDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={
          pendingAction?.action === 'revoke'
            ? `Revoke access for ${pendingAction.pass.name}?`
            : `Remove ${pendingAction?.pass.name ?? 'this guest pass'}?`
        }
        description={
          pendingAction?.action === 'revoke'
            ? 'Everyone using this team code will be signed out. Historical scouting data will be kept.'
            : 'This removes the pass from the guest list. Historical scouting data will be kept.'
        }
        confirmLabel={
          pendingAction?.action === 'revoke' ? 'Revoke access' : 'Remove pass'
        }
        destructive
        onConfirm={() => {
          if (!pendingAction) return false;
          return pendingAction.action === 'revoke'
            ? revokePass(pendingAction.pass)
            : removePass(pendingAction.pass);
        }}
      />
    </Card>
  );
}
