import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

const users = [
  {
    id: 1,
    email: 'admin@hrpayroll.local',
    passwordHash: bcrypt.hashSync('Admin@123', 10),
    role: 'super-admin',
    name: 'Super Administrator',
  },
];

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((candidate) => candidate.email === email);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET ?? 'secret',
    { expiresIn: '8h' }
  );

  res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

export default router;
