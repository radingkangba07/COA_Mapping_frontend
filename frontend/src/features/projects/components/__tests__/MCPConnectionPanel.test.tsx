import React from 'react';
import {
  render,
  screen,
  fireEvent,
  within,
} from '@testing-library/react-native';
import type { McpConnectionForm } from '../../services/mcp.service';

type HostElement = ReturnType<typeof screen.getByTestId>;

// ─── Mocks ──────────────────────────────────────────────────────────────────

// The project's global reanimated mock resolves to {} on this version (its
// bundled ./src/mock is missing), so Collapsible's useSharedValue/withTiming
// are undefined. Provide a minimal animated-API stub so the real Collapsible
// (which the panel renders) can mount in tests.
jest.mock('react-native-reanimated', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const AnimatedView = ReactModule.forwardRef(
    (props: Record<string, unknown>, ref: unknown) =>
      ReactModule.createElement(View, { ...props, ref }),
  );
  return {
    __esModule: true,
    default: { View: AnimatedView },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (toValue: unknown) => toValue,
  };
});

// config/theme is not globally mocked; mirror NewProjectDialog.test conventions.
jest.mock('@/config/theme', () => ({
  colors: {
    foreground: '#09090B',
    mutedForeground: '#71717A',
    primary: '#003399',
    primaryForeground: '#FAFAFA',
    destructive: '#DC2626',
  },
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { MCPConnectionPanel } from '../MCPConnectionPanel';

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderPanel(
  onChange?: (next: McpConnectionForm) => void,
): ReturnType<typeof render> {
  return render(<MCPConnectionPanel onChange={onChange} />);
}

// The Input wrapper carries the testID; the actual host TextInput is the single
// host instance (RN type "TextInput") inside it. Querying by host type returns
// the element `toHaveProp` / `fireEvent` operate on.
function textInputForField(fieldTestID: string): HostElement {
  const wrapper = screen.getByTestId(fieldTestID);
  const [input] = within(wrapper).UNSAFE_getAllByType(
    'TextInput' as unknown as React.ComponentType,
  );
  return input;
}

function lastChangeArg(spy: jest.Mock): McpConnectionForm {
  const calls = spy.mock.calls;
  return calls[calls.length - 1][0] as McpConnectionForm;
}

// ─── Auth-type conditional sub-fields ─────────────────────────────────────────

describe('MCPConnectionPanel — auth-type conditional fields', () => {
  it('shows the Access Token field by default (bearer)', () => {
    renderPanel();
    expect(screen.getByTestId('mcp-field-token')).toBeTruthy();
    expect(screen.queryByTestId('mcp-field-apikey')).toBeNull();
    expect(screen.queryByTestId('mcp-field-username')).toBeNull();
    expect(screen.queryByTestId('mcp-field-clientid')).toBeNull();
  });

  it('switches to API Key fields and hides the token field', () => {
    renderPanel();
    fireEvent.press(screen.getByTestId('mcp-auth-apikey'));

    expect(screen.getByTestId('mcp-field-apikey')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-apikeyname')).toBeTruthy();
    expect(screen.queryByTestId('mcp-field-token')).toBeNull();
  });

  it('switches to Basic auth fields', () => {
    renderPanel();
    fireEvent.press(screen.getByTestId('mcp-auth-basic'));

    expect(screen.getByTestId('mcp-field-username')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-password')).toBeTruthy();
    expect(screen.queryByTestId('mcp-field-token')).toBeNull();
  });

  it('switches to OAuth2 fields', () => {
    renderPanel();
    fireEvent.press(screen.getByTestId('mcp-auth-oauth2'));

    expect(screen.getByTestId('mcp-field-clientid')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-clientsecret')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-tokenurl')).toBeTruthy();
    expect(screen.queryByTestId('mcp-field-token')).toBeNull();
  });

  it('emits the new authType via onChange', () => {
    const onChange = jest.fn();
    renderPanel(onChange);
    fireEvent.press(screen.getByTestId('mcp-auth-oauth2'));
    expect(lastChangeArg(onChange).authType).toBe('oauth2');
  });
});

// ─── Configure-for scope (applicability tag) ──────────────────────────────────

describe('MCPConnectionPanel — configure-for scope', () => {
  it('renders the single fields container with default scope "both"', () => {
    renderPanel();
    expect(screen.getByTestId('mcp-fields')).toBeTruthy();
  });

  it('updates scope via onChange and keeps the single fields container', () => {
    const onChange = jest.fn();
    renderPanel(onChange);

    fireEvent.press(screen.getByTestId('mcp-scope-source'));
    expect(lastChangeArg(onChange).scope).toBe('source');
    expect(screen.getByTestId('mcp-fields')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mcp-scope-target'));
    expect(lastChangeArg(onChange).scope).toBe('target');
    expect(screen.getByTestId('mcp-fields')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mcp-scope-both'));
    expect(lastChangeArg(onChange).scope).toBe('both');
    expect(screen.getByTestId('mcp-fields')).toBeTruthy();
  });
});

// ─── Masked token show/hide ───────────────────────────────────────────────────

describe('MCPConnectionPanel — masked token toggle', () => {
  it('renders the token input secured by default and flips on toggle', () => {
    renderPanel();

    const tokenInput = textInputForField('mcp-field-token');
    expect(tokenInput).toHaveProp('secureTextEntry', true);

    const toggle = screen.getByTestId('mcp-field-token-toggle');
    expect(toggle).toHaveProp('accessibilityLabel', 'Show token');

    fireEvent.press(toggle);

    expect(textInputForField('mcp-field-token')).toHaveProp(
      'secureTextEntry',
      false,
    );
    expect(screen.getByTestId('mcp-field-token-toggle')).toHaveProp(
      'accessibilityLabel',
      'Hide token',
    );
  });
});

// ─── Dynamic headers ──────────────────────────────────────────────────────────

describe('MCPConnectionPanel — dynamic headers', () => {
  it('starts with an empty-state hint and no rows', () => {
    renderPanel();
    expect(screen.getByTestId('mcp-headers-empty')).toBeTruthy();
    expect(screen.queryByTestId('mcp-headers-row-0')).toBeNull();
  });

  it('adds a header row, edits it, then deletes it', () => {
    const onChange = jest.fn();
    renderPanel(onChange);

    fireEvent.press(screen.getByTestId('mcp-headers-add'));
    expect(screen.getByTestId('mcp-headers-row-0')).toBeTruthy();
    expect(screen.queryByTestId('mcp-headers-empty')).toBeNull();

    fireEvent.changeText(
      textInputForField('mcp-headers-key-0'),
      'X-Custom-Header',
    );
    fireEvent.changeText(textInputForField('mcp-headers-value-0'), 'abc');

    const afterEdit = lastChangeArg(onChange);
    expect(afterEdit.headers).toEqual([
      { id: 'h-0', key: 'X-Custom-Header', value: 'abc' },
    ]);

    fireEvent.press(screen.getByTestId('mcp-headers-delete-0'));
    expect(screen.queryByTestId('mcp-headers-row-0')).toBeNull();
    expect(screen.getByTestId('mcp-headers-empty')).toBeTruthy();
    expect(lastChangeArg(onChange).headers).toEqual([]);
  });
});

// ─── Advanced settings ────────────────────────────────────────────────────────

describe('MCPConnectionPanel — advanced settings', () => {
  it('toggles skip-ssl / proxy and updates the timeout via onChange', () => {
    const onChange = jest.fn();
    renderPanel(onChange);

    // Advanced is collapsed by default but its children stay mounted in the
    // Collapsible (animated max-height), so the controls are queryable.
    fireEvent.press(screen.getByTestId('mcp-advanced-trigger'));

    fireEvent.press(screen.getByTestId('mcp-skip-ssl'));
    expect(lastChangeArg(onChange).skipSSL).toBe(true);

    fireEvent.press(screen.getByTestId('mcp-proxy'));
    expect(lastChangeArg(onChange).proxy).toBe(true);

    fireEvent.changeText(textInputForField('mcp-timeout'), '90');
    expect(lastChangeArg(onChange).timeout).toBe(90);
  });
});

// ─── URL validation via UI ────────────────────────────────────────────────────

describe('MCPConnectionPanel — url validation via UI', () => {
  it('shows the url error after blur on an invalid value and clears on a valid one', () => {
    renderPanel();

    const urlInput = textInputForField('mcp-url-input');
    fireEvent.changeText(urlInput, 'notaurl');
    fireEvent(urlInput, 'blur');

    expect(screen.getByText('Enter a valid http(s) URL')).toBeTruthy();

    fireEvent.changeText(
      textInputForField('mcp-url-input'),
      'https://mcp.example.com',
    );
    expect(screen.queryByText('Enter a valid http(s) URL')).toBeNull();
  });
});
