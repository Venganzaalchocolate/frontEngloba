// PlaceholderPanel.jsx
import React from 'react';

const PlaceholderPanel = ({ title, children }) => (
  <>
    <h3>{title}</h3>
    <p>{children}</p>
  </>
);

export default PlaceholderPanel;
