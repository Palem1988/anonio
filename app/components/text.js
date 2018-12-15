// @flow
import React from 'react';
import styled from 'styled-components';

import theme from '../theme';

const Text = styled.p`
  font-family: ${props => props.theme.fontFamily};
  font-size: ${props => props.size};
  color: ${props => props.color || props.theme.colors.text};
  margin: 0;
  padding: 0;
  font-weight: ${props => (props.isBold
    ? props.theme.fontWeight.bold
    : props.theme.fontWeight.default)};
  text-align: ${props => props.align};
`;

type Props = {
  value: string,
  isBold?: boolean,
  color?: string,
  className?: string,
  size?: string | number,
  align?: string,
};

export const TextComponent = ({
  value,
  isBold,
  color,
  className,
  size,
  align,
}: Props) => (
  <Text
    className={className}
    isBold={isBold}
    color={color}
    size={`${String(size)}em`}
    align={align}
  >
    {value}
  </Text>
);

TextComponent.defaultProps = {
  className: '',
  isBold: false,
  color: theme.colors.text,
  size: theme.fontSize.text,
  align: 'left',
};
