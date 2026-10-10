const multer = require("multer");
const path = require("path");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const imageFileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const err = new Error("Tipo de arquivo não permitido. Envie uma imagem (jpg, png, webp ou gif).");
    err.isFileTypeError = true;
    return cb(err);
  }
  cb(null, true);
};

const safeFilename = (originalname) =>
  String(originalname || "image")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(-80);

// Upload em disco (uploads/), usado quando o arquivo final precisa ficar acessível por URL.
const diskUpload = ({ destination = "uploads/", maxSizeMb = 5 } = {}) =>
  multer({
    storage: multer.diskStorage({
      destination,
      filename: (req, file, cb) => cb(null, `${Date.now()}-${safeFilename(file.originalname)}`),
    }),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: imageFileFilter,
  });

// Upload em memória, usado quando o arquivo é processado e descartado (nunca gravado em disco).
const memoryUpload = ({ maxSizeMb = 5 } = {}) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: imageFileFilter,
  });

module.exports = { diskUpload, memoryUpload, safeFilename };
