import dotenv from 'dotenv';
import { supabase } from '../src/lib/supabase';

dotenv.config();

type AppUserRow = {
  id: string;
  username: string;
  email: string | null;
  password: string | null;
  password_hash: string | null;
};

function isBcryptHash(value: string) {
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

async function main() {
  const { data: users, error } = await supabase
    .from('app_users')
    .select('id, username, email, password, password_hash');

  if (error) {
    throw error;
  }

  const rows = (users || []) as AppUserRow[];
  const insecureUsers = rows.filter((user) => {
    const stored = String(user.password_hash || user.password || '');
    return stored.length > 0 && !isBcryptHash(stored);
  });

  if (insecureUsers.length === 0) {
    console.log('All app_users passwords are bcrypt-hashed.');
    return;
  }

  console.log(`Found ${insecureUsers.length} app_users record(s) with non-bcrypt passwords:`);
  for (const user of insecureUsers) {
    console.log(`- ${user.username} (${user.email || 'no email'})`);
  }

  process.exitCode = 1;
}

main().catch((error) => {
  console.error('Failed to check app user passwords:');
  console.error(error);
  process.exit(1);
});
