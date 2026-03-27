// proxy/server.js
import express from "express";
import cors from "cors";
import Replicate from "replicate";
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Verificar token
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
if (!REPLICATE_API_TOKEN) {
  console.error("❌ ERROR: REPLICATE_API_TOKEN no encontrado en .env");
  process.exit(1);
}

console.log("✅ Token cargado");

// Inicializar Replicate
const replicate = new Replicate({
  auth: REPLICATE_API_TOKEN,
});

// Crear carpeta models si no existe
import { mkdir } from "fs/promises";
try {
  await mkdir(path.join(__dirname, "models"), { recursive: true });
} catch (err) {}

// Endpoint de generación
app.post("/api/generate", async (req, res) => {
  const { imageData, prompt } = req.body;

  try {
    console.log("🚀 Generando modelo 3D...");

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

    console.log("✅ Modelo generado:", modelUrl);
    res.json({ url: modelUrl });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Servir archivos estáticos
app.use("/models", express.static(path.join(__dirname, "models")));

// Endpoint de estado (para compatibilidad)
app.get("/api/status/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${id}`,
      {
        headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
      },
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener estado" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});
