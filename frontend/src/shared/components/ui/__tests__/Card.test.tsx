import React from 'react';
import { Text, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <Text>Card content</Text>
      </Card>,
    );
    expect(screen.getByText('Card content')).toBeTruthy();
  });

  it('accepts testID prop', () => {
    render(
      <Card testID="my-card">
        <Text>Content</Text>
      </Card>,
    );
    expect(screen.getByTestId('my-card')).toBeTruthy();
  });

  it('accepts className prop', () => {
    render(
      <Card testID="card" className="mt-4">
        <Text>Content</Text>
      </Card>,
    );
    const card = screen.getByTestId('card');
    const classNameProp: string = card.props.className ?? '';
    expect(classNameProp).toContain('mt-4');
  });
});

describe('Card.Header', () => {
  it('renders children', () => {
    render(
      <Card.Header>
        <Text>Header text</Text>
      </Card.Header>,
    );
    expect(screen.getByText('Header text')).toBeTruthy();
  });

  it('accepts className prop', () => {
    render(
      <Card.Header className="px-8" testID="header">
        <Text>H</Text>
      </Card.Header>,
    );
    const header = screen.getByTestId('header');
    const classNameProp: string = header.props.className ?? '';
    expect(classNameProp).toContain('px-8');
  });
});

describe('Card.Title', () => {
  it('renders text', () => {
    render(<Card.Title>My Title</Card.Title>);
    expect(screen.getByText('My Title')).toBeTruthy();
  });

  it('accepts className prop', () => {
    render(
      <Card.Title testID="title" className="text-xl">
        Title
      </Card.Title>,
    );
    const title = screen.getByTestId('title');
    const classNameProp: string = title.props.className ?? '';
    expect(classNameProp).toContain('text-xl');
  });
});

describe('Card.Description', () => {
  it('renders text', () => {
    render(<Card.Description>Some description</Card.Description>);
    expect(screen.getByText('Some description')).toBeTruthy();
  });

  it('accepts className prop', () => {
    render(
      <Card.Description testID="desc" className="mt-2">
        Desc
      </Card.Description>,
    );
    const desc = screen.getByTestId('desc');
    const classNameProp: string = desc.props.className ?? '';
    expect(classNameProp).toContain('mt-2');
  });
});

describe('Card.Content', () => {
  it('renders children', () => {
    render(
      <Card.Content>
        <Text>Inner content</Text>
      </Card.Content>,
    );
    expect(screen.getByText('Inner content')).toBeTruthy();
  });

  it('accepts className prop', () => {
    render(
      <Card.Content testID="content" className="p-8">
        <View />
      </Card.Content>,
    );
    const content = screen.getByTestId('content');
    const classNameProp: string = content.props.className ?? '';
    expect(classNameProp).toContain('p-8');
  });
});

describe('Card.Footer', () => {
  it('renders children', () => {
    render(
      <Card.Footer>
        <Text>Footer text</Text>
      </Card.Footer>,
    );
    expect(screen.getByText('Footer text')).toBeTruthy();
  });

  it('accepts className prop', () => {
    render(
      <Card.Footer testID="footer" className="justify-end">
        <View />
      </Card.Footer>,
    );
    const footer = screen.getByTestId('footer');
    const classNameProp: string = footer.props.className ?? '';
    expect(classNameProp).toContain('justify-end');
  });
});

describe('Card composite usage', () => {
  it('renders all sub-components together', () => {
    render(
      <Card testID="full-card">
        <Card.Header>
          <Card.Title>Project Alpha</Card.Title>
          <Card.Description>A sample project</Card.Description>
        </Card.Header>
        <Card.Content>
          <Text>Main body here</Text>
        </Card.Content>
        <Card.Footer>
          <Text>Footer actions</Text>
        </Card.Footer>
      </Card>,
    );

    expect(screen.getByTestId('full-card')).toBeTruthy();
    expect(screen.getByText('Project Alpha')).toBeTruthy();
    expect(screen.getByText('A sample project')).toBeTruthy();
    expect(screen.getByText('Main body here')).toBeTruthy();
    expect(screen.getByText('Footer actions')).toBeTruthy();
  });
});
