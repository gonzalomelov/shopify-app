import React from 'react';
import ReactDOMServer from 'react-dom/server';
import Graphic from './Graphic';

export type TextToDataURLOptions = {
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
};

export function textToDataURL(
  text: string,
  options: TextToDataURLOptions = {}
): string {
  const defaultOptions: Required<TextToDataURLOptions> = {
    width: 200,
    height: 200,
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    fontSize: 30,
  };

  const opts = { ...defaultOptions, ...options };

  // Create the React element using React.createElement
  const svgElement = React.createElement(Graphic, {
    text,
    width: opts.width,
    height: opts.height,
    backgroundColor: opts.backgroundColor,
    textColor: opts.textColor,
    fontSize: opts.fontSize,
  });

  // Render the component to static SVG markup
  const svgString = ReactDOMServer.renderToStaticMarkup(svgElement);

  // Convert SVG to Data URI
  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;

  return svgDataUri;
}
