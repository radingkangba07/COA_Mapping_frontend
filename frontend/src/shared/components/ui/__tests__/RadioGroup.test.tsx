import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RadioGroup, type RadioOption } from '../RadioGroup';

type Fruit = 'apple' | 'banana' | 'cherry';

const OPTIONS: readonly RadioOption<Fruit>[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

describe('RadioGroup', () => {
  it('renders every option and derives testIDs from the group testID', () => {
    render(
      <RadioGroup
        testID="fruit"
        value="apple"
        options={OPTIONS}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('fruit-apple')).toBeTruthy();
    expect(screen.getByTestId('fruit-banana')).toBeTruthy();
    expect(screen.getByTestId('fruit-cherry')).toBeTruthy();
    expect(screen.getByText('Apple')).toBeTruthy();
  });

  it('marks only the selected option as selected', () => {
    render(
      <RadioGroup
        testID="fruit"
        value="banana"
        options={OPTIONS}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('fruit-apple')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: false }),
    );
    expect(screen.getByTestId('fruit-banana')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
  });

  it('calls onChange with the pressed value', () => {
    const onChange = jest.fn();
    render(
      <RadioGroup
        testID="fruit"
        value="apple"
        options={OPTIONS}
        onChange={onChange}
      />,
    );

    fireEvent.press(screen.getByTestId('fruit-cherry'));
    expect(onChange).toHaveBeenCalledWith('cherry');
  });

  it('respects a per-option testID over the derived one', () => {
    const options: readonly RadioOption<Fruit>[] = [
      { value: 'apple', label: 'Apple', testID: 'custom-apple' },
    ];
    render(
      <RadioGroup
        testID="fruit"
        value="apple"
        options={options}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('custom-apple')).toBeTruthy();
    expect(screen.queryByTestId('fruit-apple')).toBeNull();
  });

  it('exposes the radiogroup role and accessibilityLabel on the container', () => {
    render(
      <RadioGroup
        testID="fruit"
        value="apple"
        options={OPTIONS}
        onChange={jest.fn()}
        accessibilityLabel="Fruit"
      />,
    );

    const group = screen.getByTestId('fruit');
    expect(group).toHaveProp('accessibilityRole', 'radiogroup');
    expect(group).toHaveProp('accessibilityLabel', 'Fruit');
  });

  it('sets the radio role and label on each option', () => {
    render(
      <RadioGroup
        testID="fruit"
        value="apple"
        options={OPTIONS}
        onChange={jest.fn()}
      />,
    );

    const apple = screen.getByTestId('fruit-apple');
    expect(apple).toHaveProp('accessibilityRole', 'radio');
    expect(apple).toHaveProp('accessibilityLabel', 'Apple');
  });
});
