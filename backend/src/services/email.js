export async function sendOtpEmail(email, code) {
  console.log(`\n── login code for ${email}: ${code} (expires in 10 min) ──\n`);
}

export async function sendWeeklySummaryEmail(email, weekEndingDate, content) {
  console.log(
    `\n── weekly summary for ${email} (week ending ${weekEndingDate}) ──\n${content}\n`,
  );
}
