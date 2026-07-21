import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { supabase } from '../src/lib/supabase';

dotenv.config();

type AppUserRow = {
  id: string;
  username: string;
  email: string | null;
  password: string | null;
};

function isBcryptHash(value: string) {
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

async function main() {
  const { data: users, error: selectError } = await supabase
    .from('app_users')
    .select('id, username, email, password, password_hash');

  if (selectError) {
    throw selectError;
  }

  const rows = (users || []) as AppUserRow[];
  const targets = rows.filter((user) => {
    const stored = String(user.password || '');
    return stored.length > 0 && !isBcryptHash(stored);
  });

  if (targets.length === 0) {
    console.log('No app_users passwords need hashing.');
    return;
  }

  for (const user of targets) {
    const plainPassword = String(user.password || '');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        password: hashedPassword,
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`Hashed password for ${user.username} (${user.email || 'no email'})`);
  }

  console.log(`Done. Updated ${targets.length} app_users record(s).`);
}

main().catch((error) => {
  console.error('Failed to hash app user passwords:');
  console.error(error);
  process.exit(1);
});
