import { useAppStore } from '../store';
import { Shield, Mail, Database, Globe, Clock, Download, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Section {
  icon: React.ReactNode;
  title: { de: string; en: string };
  content: { de: React.ReactNode; en: React.ReactNode };
}

const sections: Section[] = [
  {
    icon: <Database className="h-5 w-5" />,
    title: { de: '1. Verantwortlicher', en: '1. Data Controller' },
    content: {
      de: (
        <>
          <p className="mb-2">
            <strong>[Firmenname]</strong>
            <br />
            [Straße und Hausnummer]
            <br />
            [PLZ Ort]
            <br />
            Deutschland
          </p>
          <p>
            E-Mail: <a href="mailto:privacy@newshub.app" className="text-[#00f0ff] hover:underline">privacy@newshub.app</a>
          </p>
        </>
      ),
      en: (
        <>
          <p className="mb-2">
            <strong>[Company Name]</strong>
            <br />
            [Street Address]
            <br />
            [City, ZIP]
            <br />
            Germany
          </p>
          <p>
            Email: <a href="mailto:privacy@newshub.app" className="text-[#00f0ff] hover:underline">privacy@newshub.app</a>
          </p>
        </>
      ),
    },
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: { de: '2. Erhobene Daten', en: '2. Data We Collect' },
    content: {
      de: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Kontodaten</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>E-Mail-Adresse (für Login und Benachrichtigungen)</li>
              <li>Name (für Personalisierung)</li>
              <li>Passwort (verschlüsselt gespeichert, bcrypt)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Nutzungsdaten</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Lesehistorie (kann pausiert werden)</li>
              <li>Bookmarks und Präferenzen</li>
              <li>AI-Chat-Verlauf (lokal in Ihrem Browser)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Technische Daten</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>IP-Adresse (anonymisiert/gehasht für Analytics)</li>
              <li>Browser-Typ (für Fehleranalyse)</li>
            </ul>
          </div>
        </div>
      ),
      en: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Account Data</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Email address (for login and notifications)</li>
              <li>Name (for personalization)</li>
              <li>Password (encrypted with bcrypt)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Usage Data</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>Reading history (can be paused)</li>
              <li>Bookmarks and preferences</li>
              <li>AI chat history (stored locally in your browser)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Technical Data</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>IP address (anonymized/hashed for analytics)</li>
              <li>Browser type (for error analysis)</li>
            </ul>
          </div>
        </div>
      ),
    },
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: { de: '3. Rechtsgrundlage', en: '3. Legal Basis' },
    content: {
      de: (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-4 text-gray-400">Daten</th>
                <th className="text-left py-2 text-gray-400">Rechtsgrundlage</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">E-Mail, Passwort, Name</td>
                <td className="py-2">Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">Lesehistorie, Präferenzen</td>
                <td className="py-2">Art. 6 Abs. 1 lit. a DSGVO (Einwilligung)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">IP-Adresse, Analytics</td>
                <td className="py-2">Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse)</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
      en: (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-4 text-gray-400">Data</th>
                <th className="text-left py-2 text-gray-400">Legal Basis</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">Email, Password, Name</td>
                <td className="py-2">Art. 6(1)(b) GDPR (Contract performance)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">Reading history, Preferences</td>
                <td className="py-2">Art. 6(1)(a) GDPR (Consent)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">IP address, Analytics</td>
                <td className="py-2">Art. 6(1)(f) GDPR (Legitimate interest)</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: { de: '4. Drittanbieter', en: '4. Third-Party Services' },
    content: {
      de: (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-4 text-gray-400">Anbieter</th>
                <th className="text-left py-2 pr-4 text-gray-400">Zweck</th>
                <th className="text-left py-2 text-gray-400">Standort</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">SendGrid (Twilio)</td>
                <td className="py-2 pr-4">E-Mail-Versand</td>
                <td className="py-2">USA (SCCs)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">OpenRouter / Gemini / Anthropic</td>
                <td className="py-2 pr-4">KI-Analyse</td>
                <td className="py-2">USA (SCCs)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">DeepL</td>
                <td className="py-2 pr-4">Übersetzung</td>
                <td className="py-2">Deutschland</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">Sentry</td>
                <td className="py-2 pr-4">Fehler-Tracking</td>
                <td className="py-2">USA (SCCs)</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-gray-500">
            SCCs = Standardvertragsklauseln gemäß Art. 46 Abs. 2 lit. c DSGVO
          </p>
        </div>
      ),
      en: (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-4 text-gray-400">Provider</th>
                <th className="text-left py-2 pr-4 text-gray-400">Purpose</th>
                <th className="text-left py-2 text-gray-400">Location</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">SendGrid (Twilio)</td>
                <td className="py-2 pr-4">Email delivery</td>
                <td className="py-2">USA (SCCs)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">OpenRouter / Gemini / Anthropic</td>
                <td className="py-2 pr-4">AI analysis</td>
                <td className="py-2">USA (SCCs)</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">DeepL</td>
                <td className="py-2 pr-4">Translation</td>
                <td className="py-2">Germany</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 pr-4">Sentry</td>
                <td className="py-2 pr-4">Error tracking</td>
                <td className="py-2">USA (SCCs)</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-gray-500">
            SCCs = Standard Contractual Clauses per Art. 46(2)(c) GDPR
          </p>
        </div>
      ),
    },
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: { de: '5. Speicherdauer', en: '5. Data Retention' },
    content: {
      de: (
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span><strong>Kontodaten:</strong> Bis zur Löschung Ihres Accounts + 7 Tage Karenzzeit</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span><strong>Lesehistorie:</strong> Solange Ihr Account existiert (pausierbar)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span><strong>Analytics:</strong> 90 Tage (anonymisiert)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span><strong>JWT-Tokens:</strong> 7 Tage (automatisch ungültig)</span>
          </li>
        </ul>
      ),
      en: (
        <ul className="space-y-2 text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span><strong>Account data:</strong> Until account deletion + 7 days grace period</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span><strong>Reading history:</strong> As long as your account exists (can be paused)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span><strong>Analytics:</strong> 90 days (anonymized)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#00f0ff]">•</span>
            <span><strong>JWT tokens:</strong> 7 days (auto-invalidated)</span>
          </li>
        </ul>
      ),
    },
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: { de: '6. Ihre Rechte', en: '6. Your Rights' },
    content: {
      de: (
        <div className="space-y-4">
          <p className="text-gray-300">Sie haben folgende Rechte gemäß DSGVO:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 15 – Auskunft</h4>
              <p className="text-sm text-gray-400">Welche Daten wir über Sie speichern</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 16 – Berichtigung</h4>
              <p className="text-sm text-gray-400">Korrektur unrichtiger Daten</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 17 – Löschung</h4>
              <p className="text-sm text-gray-400">"Recht auf Vergessenwerden"</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 20 – Portabilität</h4>
              <p className="text-sm text-gray-400">Export Ihrer Daten (JSON/CSV)</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 21 – Widerspruch</h4>
              <p className="text-sm text-gray-400">Widerspruch gegen Verarbeitung</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 77 – Beschwerde</h4>
              <p className="text-sm text-gray-400">Bei einer Aufsichtsbehörde</p>
            </div>
          </div>
        </div>
      ),
      en: (
        <div className="space-y-4">
          <p className="text-gray-300">You have the following rights under GDPR:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 15 – Access</h4>
              <p className="text-sm text-gray-400">What data we store about you</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 16 – Rectification</h4>
              <p className="text-sm text-gray-400">Correct inaccurate data</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 17 – Erasure</h4>
              <p className="text-sm text-gray-400">"Right to be forgotten"</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 20 – Portability</h4>
              <p className="text-sm text-gray-400">Export your data (JSON/CSV)</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 21 – Objection</h4>
              <p className="text-sm text-gray-400">Object to processing</p>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <h4 className="font-semibold text-white mb-1">Art. 77 – Complaint</h4>
              <p className="text-sm text-gray-400">To a supervisory authority</p>
            </div>
          </div>
        </div>
      ),
    },
  },
  {
    icon: <Trash2 className="h-5 w-5" />,
    title: { de: '7. Account löschen & Daten exportieren', en: '7. Delete Account & Export Data' },
    content: {
      de: (
        <div className="space-y-3 text-gray-300">
          <p>
            Sie können Ihren Account jederzeit in den{' '}
            <Link to="/settings" className="text-[#00f0ff] hover:underline">
              Einstellungen
            </Link>{' '}
            löschen oder Ihre Daten exportieren.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Download className="h-4 w-4 text-[#00ff88] mt-0.5" />
              <span><strong>Datenexport:</strong> Einstellungen → Daten exportieren (JSON/CSV)</span>
            </li>
            <li className="flex items-start gap-2">
              <Trash2 className="h-4 w-4 text-[#ff0044] mt-0.5" />
              <span><strong>Account löschen:</strong> Einstellungen → Account löschen (7 Tage Karenzzeit)</span>
            </li>
          </ul>
        </div>
      ),
      en: (
        <div className="space-y-3 text-gray-300">
          <p>
            You can delete your account or export your data at any time in{' '}
            <Link to="/settings" className="text-[#00f0ff] hover:underline">
              Settings
            </Link>.
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <Download className="h-4 w-4 text-[#00ff88] mt-0.5" />
              <span><strong>Data export:</strong> Settings → Export data (JSON/CSV)</span>
            </li>
            <li className="flex items-start gap-2">
              <Trash2 className="h-4 w-4 text-[#ff0044] mt-0.5" />
              <span><strong>Delete account:</strong> Settings → Delete account (7-day grace period)</span>
            </li>
          </ul>
        </div>
      ),
    },
  },
  {
    icon: <Mail className="h-5 w-5" />,
    title: { de: '8. Kontakt', en: '8. Contact' },
    content: {
      de: (
        <p className="text-gray-300">
          Bei Fragen zum Datenschutz erreichen Sie uns unter:{' '}
          <a href="mailto:privacy@newshub.app" className="text-[#00f0ff] hover:underline">
            privacy@newshub.app
          </a>
        </p>
      ),
      en: (
        <p className="text-gray-300">
          For privacy questions, contact us at:{' '}
          <a href="mailto:privacy@newshub.app" className="text-[#00f0ff] hover:underline">
            privacy@newshub.app
          </a>
        </p>
      ),
    },
  },
];

export function Privacy() {
  const { language } = useAppStore();

  const title = {
    de: 'Datenschutzerklärung',
    en: 'Privacy Policy',
  };

  const lastUpdated = {
    de: 'Zuletzt aktualisiert: April 2026',
    en: 'Last updated: April 2026',
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/20">
              <Shield className="h-6 w-6 text-[#00f0ff]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono">
              {title[language]}
            </h1>
          </div>
          <p className="text-sm text-gray-500 font-mono">{lastUpdated[language]}</p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {sections.map((section, index) => (
            <section
              key={index}
              className="p-6 rounded-xl bg-[rgba(0,10,20,0.8)] border border-[rgba(0,240,255,0.1)]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="text-[#00f0ff]">{section.icon}</div>
                <h2 className="text-lg font-semibold text-white font-mono">
                  {section.title[language]}
                </h2>
              </div>
              <div className="text-gray-300">{section.content[language]}</div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 rounded-lg bg-[#00f0ff]/5 border border-[#00f0ff]/20 text-center">
          <p className="text-sm text-gray-400">
            {language === 'de' ? (
              <>
                Diese Datenschutzerklärung wurde gemäß der{' '}
                <span className="text-[#00f0ff]">DSGVO (EU 2016/679)</span> erstellt.
              </>
            ) : (
              <>
                This privacy policy was created in accordance with the{' '}
                <span className="text-[#00f0ff]">GDPR (EU 2016/679)</span>.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
