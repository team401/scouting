'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ResetPasswordPage() {
  return (
    <main className="auth-shell">
      <Link href="/sign-in" className="back-link">
        <ArrowLeft /> Back to sign in
      </Link>
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>Password reset moved to Team 401 Ops</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Scouting now uses the same Firebase account as Team 401 Ops. Request
            a new reset email from the scouting sign-in page; the link in that
            email updates your shared password.
          </p>
          <Button
            nativeButton={false}
            className="w-full"
            render={<Link href="/forgot-password" />}
          >
            Request a reset email
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
