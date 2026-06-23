import { Router } from 'express';
import { verifyToken } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

router.get('/me-full', verifyToken, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', req.user.userId)
      .limit(1)
      .single();

    if (error) throw error;
    res.json({ user: data });
  } catch (error) {
    res.status(500).json({ message: 'Debug fetch failed', error: (error as Error).message });
  }
});

export default router;
