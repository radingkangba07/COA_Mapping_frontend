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

    expect(screen.getByTestId('mcp-field-login')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-apikey')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-dbname')).toBeTruthy();
    expect(screen.queryByTestId('mcp-field-token')).toBeNull();
  });

  it('switches to TBA fields', () => {
    renderPanel();
    fireEvent.press(screen.getByTestId('mcp-auth-tba'));

    expect(screen.getByTestId('mcp-field-consumerkey')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-consumersecret')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-tokenid')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-tokensecret')).toBeTruthy();
    expect(screen.queryByTestId('mcp-field-token')).toBeNull();
  });

  it('switches to OAuth2 fields', () => {
    renderPanel();
    fireEvent.press(screen.getByTestId('mcp-auth-oauth2'));

    expect(screen.getByTestId('mcp-field-clientid')).toBeTruthy();
    expect(screen.getByTestId('mcp-field-clientsecret')).toBeTruthy();
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
  it('renders the fields container', () => {
    renderPanel();
    expect(screen.getByTestId('mcp-fields')).toBeTruthy();
  });

  it('updates scope via onChange when source/target options are selected', () => {
    const onChange = jest.fn();
    renderPanel(onChange);

    fireEvent.press(screen.getByTestId('mcp-scope-source'));
    expect(lastChangeArg(onChange).scope).toBe('source');
    expect(screen.getByTestId('mcp-fields')).toBeTruthy();

    fireEvent.press(screen.getByTestId('mcp-scope-target'));
    expect(lastChangeArg(onChange).scope).toBe('target');
    expect(screen.getByTestId('mcp-fields')).toBeTruthy();

    // "Both" option was removed — not rendered
    expect(screen.queryByTestId('mcp-scope-both')).toBeNull();
  });

  it('shows a read-only badge instead of radio buttons when fixedScope is set', () => {
    render(<MCPConnectionPanel fixedScope="target" />);

    expect(screen.getByTestId('mcp-scope-readonly')).toBeTruthy();
    expect(screen.queryByTestId('mcp-scope-source')).toBeNull();
    expect(screen.queryByTestId('mcp-scope-target')).toBeNull();
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

// Custom headers editor was removed — no mcp-headers-* testIDs should be present.
describe('MCPConnectionPanel — headers editor removed', () => {
  it('does not render any headers editor', () => {
    renderPanel();
    expect(screen.queryByTestId('mcp-headers-empty')).toBeNull();
    expect(screen.queryByTestId('mcp-headers-add')).toBeNull();
  });
});

// ─── Advanced settings ────────────────────────────────────────────────────────

describe('MCPConnectionPanel — advanced settings', () => {
  it('emits updated authType via onChange when auth type changes', () => {
    const onChange = jest.fn();
    renderPanel(onChange);

    fireEvent.press(screen.getByTestId('mcp-auth-tba'));
    expect(lastChangeArg(onChange).authType).toBe('tba');

    fireEvent.press(screen.getByTestId('mcp-auth-bearer'));
    expect(lastChangeArg(onChange).authType).toBe('bearer');
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
