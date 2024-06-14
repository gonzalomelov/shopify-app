import React from 'react';

interface GraphicProps {
  text: string;
  width: number;
  height: number;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
}

const Graphic: React.FC<GraphicProps> = ({
  text,
  width,
  height,
  backgroundColor,
  textColor,
  fontSize,
}) => {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill={backgroundColor} />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill={textColor}
        fontSize={fontSize}
        fontFamily="Arial"
      >
        {text}
      </text>
    </svg>
  );
};

export default Graphic;
