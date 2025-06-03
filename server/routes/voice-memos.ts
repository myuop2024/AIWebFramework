import { Router } from 'express';
import { ensureAuthenticated } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { storage } from '../storage';

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', 'voice-memos');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `voice-${unique}${ext}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024,
  }
});

const router = Router();

router.post('/', ensureAuthenticated, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const memo = await storage.createVoiceMemo({
      userId: req.user!.id,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      duration: parseFloat((req.body.duration as string) || '0'),
      transcript: req.body.transcript || null,
    });

    res.status(201).json(memo);
  } catch (error) {
    console.error('Error uploading voice memo:', error);
    res.status(500).json({ message: 'Failed to upload voice memo' });
  }
});

router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const memos = await storage.getVoiceMemosByUserId(req.user!.id);
    res.json(memos);
  } catch (error) {
    console.error('Error fetching voice memos:', error);
    res.status(500).json({ message: 'Failed to fetch memos' });
  }
});

router.get('/:memoId', ensureAuthenticated, async (req, res) => {
  try {
    const memoId = parseInt(req.params.memoId);
    if (isNaN(memoId)) return res.status(400).json({ message: 'Invalid memo ID' });

    const memo = await storage.getVoiceMemo(memoId);
    if (!memo) return res.status(404).json({ message: 'Voice memo not found' });
    if (memo.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to access this memo' });
    }
    if (!fs.existsSync(memo.filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${memo.fileName}"`);
    res.setHeader('Content-Type', memo.fileType);
    const stream = fs.createReadStream(memo.filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Error downloading voice memo:', error);
    res.status(500).json({ message: 'Failed to download memo' });
  }
});

export default router;
