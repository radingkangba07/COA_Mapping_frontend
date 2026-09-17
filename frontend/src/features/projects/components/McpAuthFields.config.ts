// Static field/option tables for McpAuthFields (DA-64). Pure data + types —
// no React. Kept separate from the component so the rendering file stays small.
import type { McpFormAuthType } from '../services/mcp.service';

export type AuthFieldKey =
  | 'token'
  | 'apiKey'
  | 'apiKeyName'
  | 'login'
  | 'dbName'
  | 'clientId'
  | 'clientSecret'
  | 'consumerKey'
  | 'consumerSecret'
  | 'tokenId'
  | 'tokenSecret';

export type AuthFieldErrors = Partial<Record<AuthFieldKey, string>>;

export interface AuthTypeOption {
  readonly value: McpFormAuthType;
  readonly label: string;
  readonly testID: string;
}

export const AUTH_TYPE_OPTIONS: readonly AuthTypeOption[] = [
  { value: 'bearer', label: 'Bearer Token', testID: 'mcp-auth-bearer' },
  { value: 'apiKey', label: 'API Key', testID: 'mcp-auth-apikey' },
  { value: 'tba', label: 'Token-Based Auth', testID: 'mcp-auth-tba' },
  { value: 'oauth2', label: 'OAuth 2.0', testID: 'mcp-auth-oauth2' },
];

export interface AuthFieldSpec {
  readonly key: AuthFieldKey;
  readonly label: string;
  readonly placeholder: string;
  readonly testID: string;
  readonly secret: boolean;
  readonly secretLabel?: string;
  readonly keyboardUrl?: boolean;
}

// prettier-ignore
export const AUTH_FIELDS: Record<McpFormAuthType, readonly AuthFieldSpec[]> = {
  bearer: [
    { key: 'token', label: 'Access Token', placeholder: 'Paste access token', testID: 'mcp-field-token', secret: true, secretLabel: 'token' },
  ],
  apiKey: [
    { key: 'login', label: 'Login Email', placeholder: 'admin@example.com', testID: 'mcp-field-login', secret: false },
    { key: 'apiKey', label: 'API Key', placeholder: 'Paste API key', testID: 'mcp-field-apikey', secret: true, secretLabel: 'API key' },
    { key: 'dbName', label: 'Database Name (optional)', placeholder: 'e.g. rockworth', testID: 'mcp-field-dbname', secret: false },
  ],
  tba: [
    { key: 'consumerKey',    label: 'Consumer Key',    placeholder: 'Consumer Key',    testID: 'mcp-field-consumerkey',    secret: false },
    { key: 'consumerSecret', label: 'Consumer Secret', placeholder: 'Consumer Secret', testID: 'mcp-field-consumersecret', secret: true,  secretLabel: 'consumer secret' },
    { key: 'tokenId',        label: 'Token ID',        placeholder: 'Token ID',        testID: 'mcp-field-tokenid',        secret: false },
    { key: 'tokenSecret',    label: 'Token Secret',    placeholder: 'Token Secret',    testID: 'mcp-field-tokensecret',    secret: true,  secretLabel: 'token secret' },
  ],
  oauth2: [
    { key: 'clientId',     label: 'Client ID',     placeholder: 'Client ID',     testID: 'mcp-field-clientid',     secret: false },
    { key: 'clientSecret', label: 'Client Secret', placeholder: 'Client Secret', testID: 'mcp-field-clientsecret', secret: true, secretLabel: 'client secret' },
  ],
};
