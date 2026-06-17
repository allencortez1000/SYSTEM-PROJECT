import { Router } from 'express';
import { calculatePayroll } from '../controllers/payroll';

const router = Router();

router.post('/calculate', (req, res) => {
  try {
    const result = calculatePayroll(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: 'Invalid payroll payload', error: (error as Error).message });
  }
});

export default router;
