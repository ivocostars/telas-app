process.env.TZ = "America/Argentina/Buenos_Aires";

import app from "./app.js";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Timezone: ${process.env.TZ}`);
});

export default app;
