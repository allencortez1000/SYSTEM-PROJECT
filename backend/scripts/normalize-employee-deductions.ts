import dotenv from 'dotenv';
import { supabase } from '../src/lib/supabase';

dotenv.config();

async function main() {
  const fieldsToNormalize = {
    sss_amount: 0,
    pagibig_amount: 0,
    philhealth_amount: 0,
  } as const;

  const { data: employees, error: selectError } = await supabase
    .from('employees')
    .select('id, employee_no, full_name, sss_amount, pagibig_amount, philhealth_amount');

  if (selectError) {
    throw selectError;
  }

  const rowsToUpdate = (employees || []).filter((employee: any) =>
    employee.sss_amount == null || employee.pagibig_amount == null || employee.philhealth_amount == null,
  );

  if (rowsToUpdate.length === 0) {
    console.log('No employee deduction values need normalization.');
    return;
  }

  for (const employee of rowsToUpdate) {
    const payload = {
      ...fieldsToNormalize,
      sss_amount: employee.sss_amount == null ? 0 : Number(employee.sss_amount),
      pagibig_amount: employee.pagibig_amount == null ? 0 : Number(employee.pagibig_amount),
      philhealth_amount: employee.philhealth_amount == null ? 0 : Number(employee.philhealth_amount),
    };

    const { error: updateError } = await supabase
      .from('employees')
      .update(payload)
      .eq('id', employee.id);

    if (updateError) {
      throw updateError;
    }

    console.log(
      `Updated ${employee.employee_no || employee.id} (${employee.full_name || 'Unknown'}) -> ` +
        `SSS=${payload.sss_amount}, Pag-IBIG=${payload.pagibig_amount}, PhilHealth=${payload.philhealth_amount}`,
    );
  }

  console.log(`Done. Normalized ${rowsToUpdate.length} employee record(s).`);
}

main().catch((error) => {
  console.error('Failed to normalize employee deductions:');
  console.error(error);
  process.exit(1);
});
