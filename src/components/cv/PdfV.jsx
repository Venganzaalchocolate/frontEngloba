import React from 'react';



const PdfV = ({ url }) => {

  return (
    <div>
    <object data={url} type="application/pdf" width="600" height="900">
        <p>Este navegador no admite la visualización de PDFs. Descarga el archivo para verlo.</p>
    </object>
    </div>
  );
};

export default PdfV;
