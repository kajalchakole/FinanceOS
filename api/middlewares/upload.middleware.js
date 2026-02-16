const multer = require('multer');

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel'
]);
const ALLOWED_XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream'
]);

function isCsvFile(file) {
  const hasCsvMime = ALLOWED_CSV_MIME_TYPES.has(file.mimetype);
  const hasCsvExtension = String(file.originalname || '').toLowerCase().endsWith('.csv');
  return hasCsvMime || hasCsvExtension;
}

function isXlsxFile(file) {
  const hasXlsxMime = ALLOWED_XLSX_MIME_TYPES.has(file.mimetype);
  const hasXlsxExtension = String(file.originalname || '').toLowerCase().endsWith('.xlsx');
  return hasXlsxMime || hasXlsxExtension;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, callback) {
    if (isCsvFile(file)) {
      callback(null, true);
      return;
    }

    const error = new Error('Only CSV files are allowed');
    error.code = 'INVALID_FILE_TYPE';
    error.statusCode = 400;
    callback(error);
  }
});

const uploadZerodhaCsv = upload.single('file');
const uploadXlsx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, callback) {
    if (isXlsxFile(file)) {
      callback(null, true);
      return;
    }

    const error = new Error('Only XLSX files are allowed');
    error.code = 'INVALID_FILE_TYPE';
    error.statusCode = 400;
    callback(error);
  }
});
const uploadZerodhaHoldingsXlsx = uploadXlsx.single('file');
const uploadSpreadsheet = uploadXlsx.single('file');

module.exports = {
  uploadSpreadsheet,
  uploadZerodhaCsv,
  uploadZerodhaHoldingsXlsx,
  MAX_FILE_SIZE_BYTES
};
