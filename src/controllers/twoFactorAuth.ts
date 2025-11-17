import { Request, Response } from 'express';
import crypto from 'crypto';
import { mongodb } from '../db/mongodb';
import { User } from '../types/mongodb';
import { formatResponse } from '../utils/response';

/**
 * Generate TOTP secret for 2FA
 * In production, use a library like 'speakeasy' or 'otpauth'
 */
function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

/**
 * Verify TOTP code
 * This is a simplified version - use proper TOTP library in production
 */
function verifyTOTP(secret: string, code: string): boolean {
  // In production, use speakeasy.totp.verify()
  // This is a mock implementation
  return code.length === 6 && /^\d+$/.test(code);
}

/**
 * Enable 2FA for user
 */
export const enable2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Generate new 2FA secret
    const secret = generateTOTPSecret();
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    const usersCollection = mongodb.getCollection<User>('users');
    await usersCollection.updateOne(
      { _id: userId },
      {
        $set: {
          'twoFactorAuth.secret': secret,
          'twoFactorAuth.enabled': false, // Not enabled until verified
          'twoFactorAuth.backupCodes': backupCodes,
          updatedAt: new Date(),
        },
      }
    );

    // Generate QR code URL for authenticator apps
    const user = await usersCollection.findOne({ _id: userId });
    const qrCodeUrl = `otpauth://totp/MutualFundsAI:${user?.email}?secret=${secret}&issuer=MutualFundsAI`;

    res.json(
      formatResponse(
        {
          secret,
          qrCodeUrl,
          backupCodes,
          message: 'Scan QR code with your authenticator app and verify',
        },
        '2FA setup initiated'
      )
    );
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify 2FA code and enable it
 */
export const verify2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { code } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!code) {
      res.status(400).json({ error: 'Verification code is required' });
      return;
    }

    const usersCollection = mongodb.getCollection<User>('users');
    const user = await usersCollection.findOne({ _id: userId });

    if (!user?.twoFactorAuth?.secret) {
      res.status(400).json({ error: '2FA not set up' });
      return;
    }

    // Verify the code
    const isValid = verifyTOTP(user.twoFactorAuth.secret, code);

    if (!isValid) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    // Enable 2FA
    await usersCollection.updateOne(
      { _id: userId },
      {
        $set: {
          'twoFactorAuth.enabled': true,
          updatedAt: new Date(),
        },
      }
    );

    res.json(formatResponse({ enabled: true }, '2FA enabled successfully'));
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Disable 2FA
 */
export const disable2FA = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { password } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Verify password before disabling 2FA
    // TODO: Add password verification

    const usersCollection = mongodb.getCollection<User>('users');
    await usersCollection.updateOne(
      { _id: userId },
      {
        $unset: {
          twoFactorAuth: '',
        },
        $set: {
          updatedAt: new Date(),
        },
      }
    );

    res.json(formatResponse({ enabled: false }, '2FA disabled successfully'));
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify 2FA during login
 */
export const verify2FALogin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, code, backupCode } = req.body;

    if (!email || (!code && !backupCode)) {
      res.status(400).json({ error: 'Email and code/backup code required' });
      return;
    }

    const usersCollection = mongodb.getCollection<User>('users');
    const user = await usersCollection.findOne({ email: email.toLowerCase() });

    if (!user || !user.twoFactorAuth?.enabled) {
      res.status(400).json({ error: 'Invalid credentials' });
      return;
    }

    let isValid = false;

    if (code) {
      // Verify TOTP code
      isValid = verifyTOTP(user.twoFactorAuth.secret!, code);
    } else if (backupCode) {
      // Verify backup code
      const backupCodes = user.twoFactorAuth.backupCodes || [];
      const codeIndex = backupCodes.indexOf(backupCode.toUpperCase());

      if (codeIndex !== -1) {
        isValid = true;
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              'twoFactorAuth.backupCodes': backupCodes,
            },
          }
        );
      }
    }

    if (!isValid) {
      res.status(400).json({ error: 'Invalid 2FA code' });
      return;
    }

    res.json(formatResponse({ verified: true }, '2FA verification successful'));
  } catch (error) {
    console.error('2FA login verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
