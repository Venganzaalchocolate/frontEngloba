import { useEffect, useState } from "react";
import React from 'react';

const VisualizadorPDF = ({url}) => {
    const blobUrl = url;
    return (
        <div>
          {blobUrl && (
            <embed
              src={blobUrl}
              type="application/pdf"
            />
          )}
        </div>
      );
  };

  export default VisualizadorPDF;