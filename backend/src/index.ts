import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import employeeRouter from './routes/employees';
import payrollRouter from './routes/payroll';

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.get('/', (_, res) => {
  res.json({ message: 'HR & Payroll Management System API' });
});

app.use('/api/auth', authRouter);
app.use('/api/employees', employeeRouter);
app.use('/api/payroll', payrollRouter);

app.listen(PORT, () => {
  console.log(`Backend is running on port ${PORT}`);
});
