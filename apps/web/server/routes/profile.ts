import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { authMiddleware, AuthService } from '../services/authService';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

export const profileRoutes = Router();

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

// Configure multer for avatar uploads per D-29, D-30
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'avatars', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, _file, cb) => {
    const authReq = req as AuthRequest;
    const ext = path.extname(_file.originalname).toLowerCase();
    cb(null, `${authReq.user?.userId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per D-29
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG allowed'));
    }
  },
});

// Get current user profile
profileRoutes.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      selectedPresetAvatar: true,
      createdAt: true,
      emailVerified: true,
      showOnLeaderboard: true,
      isHistoryPaused: true,
    },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: user });
});

// Update name (requires password confirmation per D-28)
const updateNameSchema = z.object({
  name: z.string().min(2).max(100),
  currentPassword: z.string().min(1),
});

profileRoutes.put('/name', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = updateNameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.issues[0].message });
    return;
  }

  const { name, currentPassword } = parsed.data;
  const authService = AuthService.getInstance();

  // Verify password per D-28
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { passwordHash: true },
  });

  if (!user) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const isValid = await authService.verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    res.status(401).json({ success: false, error: 'Invalid password' });
    return;
  }

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name },
  });

  res.json({ success: true, message: 'Name updated' });
});

// Set preset avatar
const setPresetAvatarSchema = z.object({
  presetId: z.string(),
});

profileRoutes.put('/avatar/preset', authMiddleware, async (req: AuthRequest, res: Response) => {
  const parsed = setPresetAvatarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid preset ID' });
    return;
  }

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      selectedPresetAvatar: parsed.data.presetId,
      avatarUrl: null, // Clear custom avatar when selecting preset
    },
  });

  res.json({ success: true, message: 'Avatar updated' });
});

// Upload custom avatar (requires email verification per D-49)
profileRoutes.post(
  '/avatar/upload',
  authMiddleware,
  async (req: AuthRequest, res: Response, next) => {
    // Check email verification per D-49
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { emailVerified: true },
    });

    if (!user?.emailVerified) {
      res.status(403).json({
        success: false,
        error: 'Email verification required to upload custom avatar',
      });
      return;
    }

    next();
  },
  upload.single('avatar'),
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const avatarUrl = `/avatars/uploads/${req.file.filename}`;

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        avatarUrl,
        selectedPresetAvatar: null, // Clear preset when uploading custom
      },
    });

    res.json({ success: true, data: { avatarUrl } });
  }
);

// Update leaderboard preference
profileRoutes.put('/leaderboard-visibility', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { showOnLeaderboard } = req.body;

  if (typeof showOnLeaderboard !== 'boolean') {
    res.status(400).json({ success: false, error: 'Invalid value' });
    return;
  }

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { showOnLeaderboard },
  });

  res.json({ success: true, message: 'Preference updated' });
});
