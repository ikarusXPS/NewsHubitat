/**
 * DevelopersPage - Developer Portal (Phase 35-04)
 *
 * Features:
 * - Interactive API documentation via Scalar (D-07)
 * - Self-service API key management (D-09)
 * - Max 3 keys per user (D-10)
 * - Usage dashboard with creation date, last used, request count (D-11)
 */
import { useState, useEffect } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../components/Toast';
import { Loader2, Key, Copy, Trash2, Plus, Code, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

interface ApiKey {
  id: string;
  name: string;
  tier: 'free' | 'pro';
  environment: 'live' | 'test';
  createdAt: string;
  lastUsedAt: string | null;
  requestCount: number;
}

export function DevelopersPage() {
  const { isAuthenticated } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyVisible, setNewKeyVisible] = useState(false);
  const [plaintextKey, setPlaintextKey] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
  }>({
    message: '',
    type: 'info',
    isOpen: false,
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, isOpen: true });
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadApiKeys();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/api/keys', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setKeys(data.data);
      } else {
        showToast('Failed to load API keys', 'error');
      }
    } catch {
      showToast('Failed to load API keys', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newKeyName.trim()) {
      showToast('Please enter a key name', 'error');
      return;
    }

    if (keys.length >= 3) {
      showToast('Maximum 3 API keys allowed. Revoke an existing key first.', 'error');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
        },
        body: JSON.stringify({
          name: newKeyName,
          tier: 'free',
          environment: 'live',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPlaintextKey(data.data.key);
        setNewKeyVisible(true);
        setNewKeyName('');
        loadApiKeys();
        showToast('API key created successfully. Copy it now!', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to create API key', 'error');
      }
    } catch {
      showToast('Failed to create API key', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(plaintextKey);
    showToast('API key copied to clipboard', 'success');
  };

  const handleRevokeKey = async (keyId: string, keyName: string) => {
    if (!confirm(`Revoke API key "${keyName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('newshub-auth-token')}`,
        },
      });

      if (response.ok) {
        showToast('API key revoked successfully', 'success');
        loadApiKeys();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to revoke API key', 'error');
      }
    } catch {
      showToast('Failed to revoke API key', 'error');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Authentication required message
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center mx-auto mb-6">
            <Code className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-6">
            Please log in to access the developer portal and manage your API keys.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#00f0ff] text-black font-medium rounded-lg hover:bg-[#00d4e0] transition-colors"
          >
            Sign In
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      <Toast
        message={toast.message}
        type={toast.type}
        isOpen={toast.isOpen}
        onClose={() => setToast({ ...toast, isOpen: false })}
      />

      {/* Header */}
      <div className="bg-[#131920] border-b border-[#00f0ff]/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#00f0ff] to-[#bf00ff] flex items-center justify-center">
              <Code className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#00f0ff] font-mono">
                NewsHub Developer API
              </h1>
              <p className="text-gray-400 mt-1">
                Access multi-perspective news analysis data programmatically
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Keys Management */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[#131920] rounded-lg border border-[#00f0ff]/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 font-mono">
              <Key className="w-6 h-6 text-[#00f0ff]" />
              API Keys
            </h2>
            <span className="text-sm text-gray-400 font-mono">{keys.length} / 3 keys</span>
          </div>

          {/* Create Key Form */}
          <form onSubmit={handleCreateKey} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g., Production, Staging)"
                className="flex-1 bg-[#0a0e14] border border-[#00f0ff]/30 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#00f0ff] transition-colors"
                maxLength={50}
                disabled={keys.length >= 3 || creating}
              />
              <button
                type="submit"
                disabled={keys.length >= 3 || creating}
                className={cn(
                  'px-6 py-2 rounded font-medium flex items-center gap-2 transition-colors',
                  keys.length >= 3 || creating
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-[#00f0ff] text-black hover:bg-[#00d4e0]'
                )}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create Key
                  </>
                )}
              </button>
            </div>
          </form>

          {/* New Key Display - T-35-14: Plaintext key shown once */}
          {newKeyVisible && (
            <div className="bg-[#ffee00]/10 border border-[#ffee00]/30 rounded-lg p-4 mb-6">
              <p className="text-[#ffee00] font-medium mb-2 flex items-center gap-2">
                <span className="text-lg">!</span>
                Copy your API key now - you won't see it again!
              </p>
              <div className="flex items-center gap-2 bg-[#0a0e14] rounded p-3">
                <code className="flex-1 text-[#00f0ff] font-mono text-sm break-all select-all">
                  {plaintextKey}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="px-4 py-2 bg-[#00f0ff] text-black rounded hover:bg-[#00d4e0] flex items-center gap-2 flex-shrink-0 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
              <button
                onClick={() => setNewKeyVisible(false)}
                className="mt-3 text-sm text-gray-400 hover:text-white transition-colors"
              >
                I've copied my key
              </button>
            </div>
          )}

          {/* Keys List - D-11: Dashboard shows list with creation date, last used, request count */}
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#00f0ff]" />
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No API keys yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="bg-[#0a0e14] border border-[#00f0ff]/20 rounded-lg p-4 flex items-center justify-between hover:border-[#00f0ff]/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-medium text-white font-mono">{key.name}</h3>
                      <span className="px-2 py-1 bg-[#00f0ff]/20 text-[#00f0ff] rounded text-xs font-medium font-mono">
                        {key.tier.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs font-mono">
                        {key.environment}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-400">
                      <div>
                        <span className="text-gray-500">Created:</span>{' '}
                        {formatDate(key.createdAt)}
                      </div>
                      <div>
                        <span className="text-gray-500">Last Used:</span>{' '}
                        {formatDate(key.lastUsedAt)}
                      </div>
                      <div>
                        <span className="text-gray-500">Requests:</span>{' '}
                        <span className="text-[#00f0ff] font-mono">
                          {key.requestCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeKey(key.id, key.name)}
                    className="ml-4 p-2 text-[#ff0044] hover:text-[#ff3366] hover:bg-[#ff0044]/10 rounded transition-colors"
                    title="Revoke API key"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Documentation - D-07: Scalar for OpenAPI documentation */}
        <div className="bg-[#131920] rounded-lg border border-[#00f0ff]/20 overflow-hidden">
          <div className="p-4 border-b border-[#00f0ff]/20">
            <h2 className="text-xl font-bold font-mono flex items-center gap-2">
              <Code className="w-5 h-5 text-[#00f0ff]" />
              API Documentation
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Interactive API reference with try-it-out functionality
            </p>
          </div>
          <div className="scalar-container">
            <ApiReferenceReact
              configuration={{
                url: '/api/openapi.json',
                theme: 'dark',
                layout: 'modern',
                authentication: {
                  preferredSecurityScheme: 'ApiKeyAuth',
                  apiKey: {
                    token: plaintextKey || '',
                  },
                },
                customCss: `
                  .scalar-app {
                    --scalar-color-accent: #00f0ff;
                    --scalar-background-1: #0a0e14;
                    --scalar-background-2: #131920;
                    --scalar-font: 'Inter', sans-serif;
                    --scalar-font-code: 'JetBrains Mono', monospace;
                  }
                `,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
