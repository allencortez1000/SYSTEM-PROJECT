import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { supabase } from '../src/lib/supabase';

dotenv.config();

async function main() {
  const username = process.argv[2] || 'admin';
  const newPassword = process.argv[3];

  if (!newPassword) {
    console.error('Usage: ts-node scripts/reset-admin-password.ts <username> <newPassword>');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const { data: existingUser, error: selectError } = await supabase
    .from('app_users')
    .select('id, username, email')
    .eq('username', username)
    .limit(1);

  if (selectError) {
    throw selectError;
  }

  const user = existingUser && existingUser.length > 0 ? existingUser[0] : null;

  if (!user) {
    throw new Error(`User not found: ${username}`);
  }

  const { error: updateError } = await supabase
    .from('app_users')
    .update({
      password: hashedPassword,
      is_active: true,
    })
    .eq('id', user.id);

  if (updateError) {
    throw updateError;
  }

  console.log(`Password updated for ${user.username} (${user.email || 'no email'})`);
}

main().catch((error) => {
  console.error('Failed to reset admin password:');
  console.error(error);
  process.exit(1);
});
