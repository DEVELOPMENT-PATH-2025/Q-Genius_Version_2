import React, { useState } from 'react';
import { AlertCircle, Key, Users, Shield, Settings } from 'lucide-react';

interface DeploymentGuideProps {
  onClose: () => void;
}

const DeploymentGuide: React.FC<DeploymentGuideProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'centralized' | 'troubleshoot'>('individual');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6" />
              <h2 className="text-xl font-bold">API Quota Management - Deployment Guide</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error Overview */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-900 mb-2">API Quota Exceeded (Error 429)</h3>
                <p className="text-red-700 text-sm">
                  The Gemini API key has reached its usage limit. This commonly occurs in deployment environments 
                  where multiple faculty members share API keys or when usage exceeds the free tier limits.
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: 'individual', label: 'Individual API Keys', icon: Key },
                { id: 'centralized', label: 'Centralized Management', icon: Users },
                { id: 'troubleshoot', label: 'Troubleshooting', icon: Settings }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {activeTab === 'individual' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Individual Faculty API Keys
                </h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">✅ Recommended for Most Deployments</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Each faculty member uses their own Gemini API key, providing better quota management 
                    and accountability.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">For Faculty Members:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Google AI Studio</a></li>
                      <li>Click "Create API Key" to generate your personal key</li>
                      <li>Copy the key and add it in Settings → API Key section</li>
                      <li>Monitor your usage in Google Cloud Console</li>
                    </ol>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">For IT Administrators:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Communicate API key requirements to all faculty</li>
                      <li>Provide training on key management and usage monitoring</li>
                      <li>Set up guidelines for responsible API usage</li>
                      <li>Create documentation for key rotation and security</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'centralized' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Centralized API Key Management
                </h3>
                
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <h4 className="font-semibold text-amber-900 mb-2">⚠️ Requires Higher Quota</h4>
                  <p className="text-amber-700 text-sm mb-3">
                    If using a single API key for all faculty, you must request a significant quota increase 
                    from Google Cloud to handle concurrent usage.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Steps to Increase Quota:</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                      <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                      <li>Navigate to: IAM & Admin → Quotas</li>
                      <li>Search for "Generative Language API"</li>
                      <li>Request quota increase for your expected usage</li>
                      <li>Provide business justification (educational institution use)</li>
                      <li>Wait for approval (usually 1-3 business days)</li>
                    </ol>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Alternative: Service Account</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      For production deployments, consider using a Google Cloud Service Account:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>More secure than individual API keys</li>
                      <li>Better quota management at project level</li>
                      <li>Can implement usage monitoring and alerts</li>
                      <li>Supports automated rotation of credentials</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'troubleshoot' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Troubleshooting Steps
                </h3>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Immediate Actions:</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                      <li><strong>Wait 10-15 minutes</strong> - Quotas typically reset hourly</li>
                      <li><strong>Check Google Cloud Console</strong> - Verify actual usage vs limits</li>
                      <li><strong>Try a different API key</strong> - If you have multiple keys available</li>
                      <li><strong>Contact IT administrator</strong> - For institutional key management</li>
                    </ul>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Long-term Solutions:</h4>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                      <li>Implement usage monitoring and alerts</li>
                      <li>Set up automated quota tracking</li>
                      <li>Configure fallback API keys</li>
                      <li>Educate faculty on API usage best practices</li>
                      <li>Consider caching frequently generated content</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-900 mb-2">📞 Contact Information:</h4>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>IT Support:</strong> Contact your institution's IT department</p>
                      <p><strong>Google Cloud Support:</strong> Available through Google Cloud Console</p>
                      <p><strong>Documentation:</strong> <a href="https://cloud.google.com/docs/quotas" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Google Cloud Quotas Documentation</a></p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                window.open('https://makersuite.google.com/app/apikey', '_blank', 'noopener');
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Get API Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeploymentGuide;
