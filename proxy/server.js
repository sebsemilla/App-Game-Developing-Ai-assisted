// proxy/server.js
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import Replicate from "replicate";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = 3001;

// ── Seguridad: CORS restringido a origen local ────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
];
app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (ej. curl, Postman en dev local)
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS: origen no permitido"));
      }
    },
  }),
);

app.use(express.json({ limit: "10mb" }));

// ── Token ─────────────────────────────────────────────────────────────────────
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) {
  console.error("ERROR: REPLICATE_API_TOKEN no encontrado en .env");
  process.exit(1);
}

const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

// ── Carpeta models ────────────────────────────────────────────────────────────
try {
  await mkdir(path.join(__dirname, "models"), { recursive: true });
} catch (_) {}

// ── Rate limiting: máx 5 generaciones por minuto por IP ──────────────────────
const generateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Intenta en un minuto." },
});

// ── Validación de inputs ──────────────────────────────────────────────────────
const MAX_PROMPT_LENGTH = 500;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB en base64

function validateGenerateInput(req, res, next) {
  const { imageData, prompt } = req.body;

  if (!imageData || typeof imageData !== "string") {
    return res.status(400).json({ error: "imageData es requerido." });
  }
  if (!imageData.startsWith("data:image/")) {
    return res.status(400).json({ error: "imageData debe ser una imagen en base64." });
  }
  // Tamaño aproximado del base64
  const approxBytes = (imageData.length * 3) / 4;
  if (approxBytes > MAX_IMAGE_BYTES) {
    return res.status(413).json({ error: "La imagen supera el tamaño máximo de 8 MB." });
  }
  if (prompt !== undefined && typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt debe ser texto." });
  }
  if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: `El prompt no puede superar ${MAX_PROMPT_LENGTH} caracteres.` });
  }

  next();
}

// ── Endpoint de generación ────────────────────────────────────────────────────
app.post("/api/generate", generateLimiter, validateGenerateInput, async (req, res) => {
  const { imageData, prompt } = req.body;

  try {
    console.log("Generando modelo 3D...");

    const input = {
      image: imageData,
      prompt: prompt || "A stylized 3D character",
    };

    const output = await replicate.run("tencent/hunyuan-3d-3.1", { input });

    let modelUrl = null;
    if (typeof output === "string" && output.startsWith("http")) {
      modelUrl = output;
    } else if (Buffer.isBuffer(output)) {
      const filename = `model_${Date.now()}.glb`;
      const filepath = path.join(__dirname, "models", filename);
      await writeFile(filepath, output);
      modelUrl = `http://localhost:${PORT}/models/${filename}`;
    } else if (output && output.url) {
      modelUrl = output.url;
    } else {
      throw new Error("Formato de salida no reconocido");
    }

    console.log("Modelo generado:", modelUrl);
    res.json({ url: modelUrl });
  } catch (error) {
    console.error("Error en /api/generate:", error);
    res.status(500).json({ error: "Error al generar el modelo. Inténtalo de nuevo." });
  }
});

// ── Archivos estáticos ────────────────────────────────────────────────────────
app.use("/models", express.static(path.join(__dirname, "models")));

// ── Estado de predicción ──────────────────────────────────────────────────────
app.get("/api/status/:id", async (req, res) => {
  const { id } = req.params;
  // Validar que el id solo tenga caracteres alfanuméricos y guiones
  if (!/^[a-zA-Z0-9-]+$/.test(id)) {
    return res.status(400).json({ error: "ID de predicción inválido." });
  }
  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${id}`,
      { headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` } },
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error en /api/status:", error);
    res.status(500).json({ error: "Error al obtener estado." });
  }
});

// ── Iniciar servidor ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});
