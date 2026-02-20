import "dotenv/config";
import cors from "cors";
import express from "express";
import { buildRoutes } from "./http/routes";

const app = express();
app.use(cors());
app.use(express.json());

app.use(buildRoutes());

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on ${port}`);
});
