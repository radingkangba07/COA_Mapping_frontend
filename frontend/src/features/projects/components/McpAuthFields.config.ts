// Static field/option tables for McpAuthFields (DA-64). Pure data + types —
// no React. Kept separate from the component so the rendering file stays small.
import type { McpFormAuthType } from '../services/mcp.service';

export type AuthFieldKey =
  | 'token'
  | 'apiKey'
  | 'apiKeyName'
  | 'username'
  | 'password'
  | 'clientId'
  | 'clientSecret'
  | 'tokenUrl';

export type AuthFieldErrors = Partial<Record<AuthFieldKey, string>>;

export interface AuthTypeOption {
  readonly value: McpFormAuthType;
  readonly label: string;
  readonly testID: string;
}

export const AUTH_TYPE_OPTIONS: readonly AuthTypeOption[] = [
  { value: 'bearer', label: 'Bearer Token', testID: 'mcp-auth-bearer' },
  { value: 'apiKey', label: 'API Key', testID: 'mcp-auth-apikey' },
  { value: 'basic', label: 'Basic Auth', testID: 'mcp-auth-basic' },
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
    { key: 'apiKey', label: 'API Key', placeholder: 'Paste API key', testID: 'mcp-field-apikey', secret: true, secretLabel: 'API key' },
    { key: 'apiKeyName', label: 'Key Name', placeholder: 'X-API-Key', testID: 'mcp-field-apikeyname', secret: false },
  ],
  basic: [
    { key: 'username', label: 'Username', placeholder: 'Username', testID: 'mcp-field-username', secret: false },
    { key: 'password', label: 'Password', placeholder: 'Password', testID: 'mcp-field-password', secret: true, secretLabel: 'password' },
  ],
  oauth2: [
    { key: 'clientId', label: 'Client ID', placeholder: 'Client ID', testID: 'mcp-field-clientid', secret: false },
    { key: 'clientSecret', label: 'Client Secret', placeholder: 'Client secret', testID: 'mcp-field-clientsecret', secret: true, secretLabel: 'client secret' },
    { key: 'tokenUrl', label: 'Token URL', placeholder: 'https://auth.example.com/token', testID: 'mcp-field-tokenurl', secret: false, keyboardUrl: true },
  ],
};
