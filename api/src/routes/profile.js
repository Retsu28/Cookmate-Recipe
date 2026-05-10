const { Router } = require('express');
const multer = require('multer');
const profileController = require('../controllers/profileController');
const { requireAuth } = require('../middleware/requireAuth');

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Please upload a JPEG, PNG, or WebP image.'));
  },
});

function handleAvatarUpload(req, res, next) {
  upload.single('avatar')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    const message =
      err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? 'Avatar image must be 2MB or smaller.'
        : err.message || 'Avatar upload failed.';
    res.status(400).json({ error: message });
  });
}

router.get('/:userId', requireAuth, profileController.getProfile);
router.put('/:userId', requireAuth, profileController.updateProfile);
router.post('/:userId/avatar', requireAuth, handleAvatarUpload, profileController.uploadAvatar);
router.delete('/:userId', requireAuth, profileController.deleteAccount);

module.exports = router;
