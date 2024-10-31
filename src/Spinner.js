// Spinner.js
import React from 'react';

const Spinner = ({ size = "md" }) => {
  let sizeClass;
  switch (size) {
    case "xs":
      sizeClass = "loading-xs";
      break;
    case "sm":
      sizeClass = "loading-sm";
      break;
    case "lg":
      sizeClass = "loading-lg";
      break;
    default:
      sizeClass = "loading-md";
      break;
  }

  return <span className={`loading loading-bars ${sizeClass}`}></span>;
};

export default Spinner;
