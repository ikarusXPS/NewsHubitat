/**
 * Password Strength Meter
 * Visual indicator of password strength using @zxcvbn-ts
 * - D-39: Password strength indicator on reset form
 */
import { useMemo } from 'react';
import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';
import * as zxcvbnDePackage from '@zxcvbn-ts/language-de';

// Initialize zxcvbn options once
const options = {
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
    ...zxcvbnDePackage.dictionary,
  },
};
zxcvbnOptions.setOptions(options);

interface PasswordStrengthMeterProps {
  password: string;
}

const STRENGTH_COLORS = ['#ff0044', '#ff6600', '#ffee00', '#00ff88', '#00f0ff'];
const STRENGTH_LABELS_EN = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
const STRENGTH_LABELS_DE = ['Sehr schwach', 'Schwach', 'Mittel', 'Stark', 'Sehr stark'];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const result = useMemo(() => {
    return password ? zxcvbn(password) : null;
  }, [password]);

  const score = result?.score ?? 0;

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: i <= score ? STRENGTH_COLORS[score] : '#374151',
            }}
          />
        ))}
      </div>
      <div className="flex justify-between items-center">
        <p className="text-xs" style={{ color: STRENGTH_COLORS[score] }}>
          {STRENGTH_LABELS_EN[score]}
        </p>
        <p className="text-xs text-gray-500">
          {STRENGTH_LABELS_DE[score]}
        </p>
      </div>
      {result?.feedback.warning && (
        <p className="text-xs text-yellow-400">
          {result.feedback.warning}
        </p>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
