import { useEffect, useState } from "react";
import React from 'react';

const VisualizadorPDF = ({url}) => {
    const blobUrl = url;
    return (
        <div>
          <h2>holi {blobUrl}</h2>
          {blobUrl && (
            <embed
              src={blobUrl}
              type="application/pdf"
              width="100%"
              height="600px"
            />
          )}
        </div>
      );
  };

  export default VisualizadorPDF;