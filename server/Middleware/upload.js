import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Product photo upload for the admin.
 *
 * Files are held in memory and streamed straight to Cloudinary. Nothing is
 * written to disk, because the API runs on a host with an ephemeral filesystem
 * — anything saved locally disappears on the next deploy, taking the shop's
 * photos with it.
 */

const MAX_MB = 8;

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 8 },
  fileFilter(_req, file, cb) {
    if (!/^image\/(jpe?g|png|webp|avif)$/.test(file.mimetype)) {
      const err = new Error('Format accepté : JPG, PNG, WEBP ou AVIF');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

let configured = false;
function configure() {
  if (configured) return;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const err = new Error("L'envoi d'images n'est pas configuré");
    err.status = 503;
    throw err;
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export function uploadBuffer(buffer, folder = 'warda/produits') {
  configure();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        // Garment photos are shown in a 3:4 crop and never larger than about
        // 900px wide. Capping at 1600 keeps a zoomable original without
        // serving a 6MB phone photo to someone on 3G.
        transformation: [{ width: 1600, height: 2133, crop: 'limit' }, { quality: 'auto:good' }, { fetch_format: 'auto' }],
      },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

export async function uploadMany(files, folder) {
  return Promise.all((files || []).map((f) => uploadBuffer(f.buffer, folder)));
}
