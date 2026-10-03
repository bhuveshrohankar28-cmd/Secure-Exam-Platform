import app from "./src/app";
import { startExpirySweeper } from "./src/services/attemptService";

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Secure Exam Backend running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}\n`);

  // Closes attempts whose timer ran out (e.g. the student closed the tab).
  startExpirySweeper();
});