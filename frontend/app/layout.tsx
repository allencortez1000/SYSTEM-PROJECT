import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { NotificationProvider } from './components/notification';
import DashboardShell from './components/dashboard-shell';

export const metadata: Metadata = {
  title: 'HR & Payroll Management System',
  description: 'Enterprise-grade HR, payroll, attendance, and compliance management platform.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NotificationProvider>
          <DashboardShell>{children}</DashboardShell>
        </NotificationProvider>
      </body>
    </html>
  );
}
